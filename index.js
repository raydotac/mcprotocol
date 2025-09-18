/**
 * MC Protocol NPM Package Main Entry Point
 * Provides both JavaScript and TypeScript implementations
 */

// Export TypeScript implementation (compiled to JavaScript)
const { MCProtocol, MCProtocolError } = require('./dist/src/MCProtocol');

// JavaScript implementation (Type4E class) - we need to recreate this
// For now, we'll create a simple Type4E wrapper around the compiled TypeScript version
// until we restore the original mcprotocol.js

// PLC Types constants
const PLC_TYPES = {
  Q: "Q",
  L: "L", 
  QnA: "QnA",
  iQL: "iQ-L",
  iQR: "iQ-R"
};

// Create a Type4E class that wraps the TypeScript MCProtocol implementation
// This provides backward compatibility with the original JavaScript API
class Type4E {
  constructor(plctype = "Q") {
    this.plctype = plctype;
    this._isConnected = false;
    this._debug = false;
    this._mcProtocol = null;
  }

  async connect(host, port, timeout = 5000) {
    this._mcProtocol = new MCProtocol({
      host: host,
      port: port,
      timeout: timeout,
      plcType: this.plctype,
      frame: '4E' // Use 4E frame for compatibility
    });
    
    await this._mcProtocol.connect();
    this._isConnected = true;
    
    if (this._debug) {
      console.log(`Connected to PLC at ${host}:${port}`);
    }
  }

  close() {
    if (this._mcProtocol) {
      this._mcProtocol.disconnect();
      this._isConnected = false;
    }
  }

  async batchread_wordunits(headdevice, readsize) {
    if (!this._mcProtocol) {
      throw new MCProtocolError("Not connected to PLC");
    }

    // Parse device (e.g., "D0" -> device="D", address=0)
    const match = headdevice.match(/^([A-Z]+)(\d+)$/);
    if (!match) {
      throw new MCProtocolError(`Invalid device format: ${headdevice}`);
    }
    
    const deviceType = match[1];
    const startAddress = parseInt(match[2]);
    
    // Create array of addresses to read
    const addresses = [];
    for (let i = 0; i < readsize; i++) {
      addresses.push({
        device: deviceType,
        address: startAddress + i
      });
    }
    
    const results = await this._mcProtocol.batchReadWordUnits(addresses);
    
    // Convert results to array format expected by original API
    const values = [];
    for (let i = 0; i < readsize; i++) {
      const key = `${deviceType}${startAddress + i}`;
      values.push(results[key] || 0);
    }
    
    return values;
  }

  // Additional methods for compatibility
  get isConnected() {
    return this._isConnected;
  }
}

// Error class for compatibility
class MCProtocolErrorCompat extends Error {
  constructor(message) {
    super(message);
    this.name = 'MCProtocolError';
  }
}

// Export both implementations
module.exports = {
  // TypeScript implementation (modern API)
  MCProtocol,
  MCProtocolError,
  
  // JavaScript implementation (compatibility API)
  Type4E,
  MCProtocolError: MCProtocolErrorCompat,
  PLC_TYPES
};
