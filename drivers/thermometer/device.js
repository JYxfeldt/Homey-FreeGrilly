'use strict';

const Homey = require('homey');
const http = require('http');

const BATTERY_ALARM_THRESHOLD = 20;
const MAX_BODY_BYTES = 65536;

class FreeGrillyDevice extends Homey.Device {
  async onInit() {
    this.log('FreeGrilly device initialized:', this.getName());
    this._stopPolling = false;
    this._pollLoop();
  }

  async _pollLoop() {
    if (this._stopPolling) return;
    await this._poll();
    if (this._stopPolling) return;
    const intervalMs = (this.getSetting('poll_interval') || 5) * 1000;
    this._pollTimer = this.homey.setTimeout(() => this._pollLoop(), intervalMs);
  }

  _clearPolling() {
    this._stopPolling = true;
    this.homey.clearTimeout(this._pollTimer);
  }

  async _poll() {
    const ip = this.getSetting('ip');
    try {
      const data = await this._fetchGrill(ip);
      await this._sync(data);
      await this.setAvailable();
    } catch (err) {
      this.error('Poll failed:', err.message);
      await this.setUnavailable(err.message);
    }
  }

  async _sync(data) {
    if (typeof data.battery_percentage === 'number') {
      await this.setCapabilityValue('measure_battery', data.battery_percentage);
      await this.setCapabilityValue('alarm_battery', data.battery_percentage < BATTERY_ALARM_THRESHOLD);
    }

    const fahrenheit = data.temperature_unit === 'fahrenheit';
    const probes = Array.isArray(data.probes) ? data.probes : [];

    for (const probe of probes) {
      if (typeof probe.probe_id !== 'number') continue;
      const cap = `measure_temperature.probe${probe.probe_id}`;
      if (!this.hasCapability(cap)) continue;

      if (!probe.connected || probe.temperature == null) {
        await this.setCapabilityValue(cap, null);
        continue;
      }

      let temp = probe.temperature;
      if (fahrenheit) temp = (temp - 32) * (5 / 9);
      await this.setCapabilityValue(cap, Math.round(temp * 10) / 10);
    }
  }

  _fetchGrill(ip) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const settle = (fn, val) => { if (!settled) { settled = true; fn(val); } };

      const req = http.get(
        { hostname: ip, path: '/api/grill', timeout: 5000 },
        (res) => {
          if (res.statusCode !== 200) {
            res.resume();
            return settle(reject, new Error(`Device returned HTTP ${res.statusCode}`));
          }
          let body = '';
          res.on('data', (chunk) => {
            body += chunk;
            if (body.length > MAX_BODY_BYTES) {
              res.destroy();
              settle(reject, new Error('Response too large'));
            }
          });
          res.on('end', () => {
            try { settle(resolve, JSON.parse(body)); }
            catch (e) { settle(reject, new Error('Invalid response from device')); }
          });
        },
      );
      req.on('timeout', () => {
        req.destroy();
        settle(reject, new Error('Connection timed out'));
      });
      req.on('error', (err) => settle(reject, err));
    });
  }

  async onSettings({ newSettings }) {
    this._clearPolling();
    this._stopPolling = false;
    this._pollLoop();
  }

  async onDeleted() {
    this._clearPolling();
  }
}

module.exports = FreeGrillyDevice;
