const MA5800 = require('./ma5800');
const logger = require('../../middleware/logger');

class MA5680T extends MA5800 {
  constructor(olt) {
    super(olt);
    this.model = 'MA5680T';
  }

  async listONTs(ponPort = null) {
    try {
      if (this.telnet.connected) {
        const parts = ponPort ? String(ponPort).split('/') : ['0', '0', '0'];
        return await this.telnet.getONTInfo(parts[0] || '0', parts[1] || '0', parts[2] || '0');
      }
      return await super.listONTs(ponPort);
    } catch (e) {
      logger.error(`MA5680T listONTs: ${e.message}`);
      return [];
    }
  }

  async getCPUUsage() {
    try {
      if (this.telnet.connected) {
        const output = await this.telnet.sendCommand('display system information');
        const match = output.match(/CPU.*?(\d+)%/i);
        if (match) return parseInt(match[1]);
      }
      return await super.getCPUUsage();
    } catch (e) {
      return null;
    }
  }
}

module.exports = MA5680T;
