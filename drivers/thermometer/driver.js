'use strict';

const Homey = require('homey');
const http = require('http');

class FreeGrillyDriver extends Homey.Driver {
  async onInit() {
    this.log('FreeGrilly driver initialized');
  }

  async onPair(session) {
    this._pairingDevice = null;

    session.setHandler('login', async ({ username: ip }) => {
      const data = await this._fetchGrill(ip.trim());
      this._pairingDevice = {
        name: data.name || 'FreeGrilly',
        data: { id: data.unique_id || ip },
        settings: { ip: ip.trim(), poll_interval: 5 },
      };
      return true;
    });

    session.setHandler('get_device', async () => {
      return this._pairingDevice;
    });
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
}

module.exports = FreeGrillyDriver;
