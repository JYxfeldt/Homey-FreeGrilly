'use strict';

const Homey = require('homey');
const http = require('http');

const BATTERY_ALARM_THRESHOLD = 20;

class FreeGrillyDevice extends Homey.Device {
  async onInit() {
    this.log('FreeGrilly device initialized:', this.getName());
    this._startPolling();
  }

  _startPolling() {
    const intervalMs = (this.getSetting('poll_interval') || 5) * 1000;
    this._poll();
    this._pollTimer = this.homey.setInterval(() => this._poll(), intervalMs);
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
    // Battery
    if (typeof data.battery_percentage === 'number') {
      await this.setCapabilityValue('measure_battery', data.battery_percentage);
      await this.setCapabilityValue('alarm_battery', data.battery_percentage < BATTERY_ALARM_THRESHOLD);
    }

    const fahrenheit = data.temperature_unit === 'fahrenheit';

    for (const probe of data.probes) {
      const cap = `measure_temperature.probe${probe.probe_id}`;
      if (!this.hasCapability(cap)) continue;

      if (!probe.connected || probe.temperature === null || probe.temperature === undefined) {
        await this.setCapabilityValue(cap, null);
        continue;
      }

      let temp = probe.temperature;
      if (fahrenheit) {
        temp = (temp - 32) * (5 / 9);
      }
      // Round to 1 decimal place
      await this.setCapabilityValue(cap, Math.round(temp * 10) / 10);
    }
  }

  _fetchGrill(ip) {
    return new Promise((resolve, reject) => {
      const req = http.get(
        { hostname: ip, path: '/api/grill', timeout: 5000 },
        (res) => {
          let body = '';
          res.on('data', (chunk) => { body += chunk; });
          res.on('end', () => {
            try {
              resolve(JSON.parse(body));
            } catch (e) {
              reject(new Error('Invalid response from device'));
            }
          });
        },
      );
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Connection timed out'));
      });
      req.on('error', (err) => reject(err));
    });
  }

  async onSettings({ newSettings }) {
    this.homey.clearInterval(this._pollTimer);
    this._startPolling();
  }

  async onDeleted() {
    this.homey.clearInterval(this._pollTimer);
  }
}

module.exports = FreeGrillyDevice;
