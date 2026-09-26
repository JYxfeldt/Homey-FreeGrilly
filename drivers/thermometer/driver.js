'use strict';

const Homey = require('homey');
const http = require('http');

const MAX_BODY_BYTES = 65536;
const IPV4_RE = /^\d{1,3}(\.\d{1,3}){3}$/;

class FreeGrillyDriver extends Homey.Driver {
  async onInit() {
    this.log('FreeGrilly driver initialized');
  }

  async onPair(session) {
    let pendingDevice = null;

    session.setHandler('login', async ({ username: ip }) => {
      ip = ip.trim();
      if (!IPV4_RE.test(ip)) throw new Error('Enter a valid IPv4 address (e.g. 192.168.1.100)');
      const data = await this._fetchGrill(ip);
      if (!data.unique_id) throw new Error('Device did not return a unique ID. Please update the FreeGrilly firmware.');
      pendingDevice = {
        name: data.name || 'FreeGrilly',
        data: { id: data.unique_id },
        settings: { ip, poll_interval: 5 },
      };
      return true;
    });

    session.setHandler('get_device', async () => pendingDevice);
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
}

module.exports = FreeGrillyDriver;
