'use strict';

const Homey = require('homey');

class FreeGrillyApp extends Homey.App {
  async onInit() {
    this.log('FreeGrilly app initialized');
  }
}

module.exports = FreeGrillyApp;
