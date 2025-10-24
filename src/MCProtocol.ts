/**
 * MC Protocol TypeScript Implementation
 * Compatible with Mitsubishi Q Series PLCs using 4E Frame Protocol
 */

import * as net from 'net';

export interface MCProtocolOptions {
  host: string;
  port: number;
  localAddress?: string;
  timeout?: number;
  plcType?: 'Q' | 'iQ-R' | 'iQ-L' | 'L' | 'QnA';
  frame?: '3E' | '4E';
  ascii?: boolean;
}

export interface DeviceAddress {
  device: string;
  address: number;
  count?: number;
}

export interface ReadResult {
  [key: string]: number;
}

export class MCProtocolError extends Error {
  constructor(
    message: string,
    public errorCode?: number,
    public plcErrorCode?: number
  ) {
    super(message);
    this.name = 'MCProtocolError';
  }
}

export class MCProtocol {
  private socket: net.Socket | null = null;
  // Use a flexible type here to allow optional localAddress without forcing callers to provide it
  private options: any;
  private isConnected = false;
  private responseBuffer = Buffer.alloc(0);
  private pendingRequests = new Map<
    number,
    {
      resolve: (value: any) => void;
      reject: (error: Error) => void;
      timeout: NodeJS.Timeout;
    }
  >();
  private requestCounter = 0;
  private readonly wordSize = 2; // bytes per word in binary mode

  // Device type mappings for MC Protocol
  private static readonly DEVICE_CODES = {
    D: 0xa8,
    R: 0xaf,
    ZR: 0xb0,
    M: 0x90,
    X: 0x9c,
    Y: 0x9d,
    B: 0xa0,
    F: 0x93,
    V: 0x94,
    S: 0x98,
    SS: 0xc9,
    SC: 0xc6,
    SB: 0xa1,
    DX: 0xa2,
    DY: 0xa3,
    T: 0xc2,
    ST: 0xc7,
    C: 0xc5,
    TC: 0xc0,
    TS: 0xc1,
    TN: 0xc2,
    CN: 0xc5,
    CS: 0xc4,
    CC: 0xc3,
    W: 0xb4,
    SW: 0xb5,
    RD: 0x2c,
    SD: 0xa9,
    Z: 0xcc,
  } as const;

  constructor(options: MCProtocolOptions) {
    this.options = {
      timeout: 5000,
      plcType: 'Q',
      frame: '4E', // Default to 4E frame to match JavaScript version
      ascii: false,
      ...options,
    };
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnected) {
        resolve();
        return;
      }

      this.socket = new net.Socket();

      const connectTimeout = setTimeout(() => {
        this.socket?.destroy();
        reject(new MCProtocolError('Connection timeout'));
      }, this.options.timeout);

      // Create connect options
      const connectOpts: net.TcpNetConnectOpts = {
        port: this.options.port,
        host: this.options.host,
      };

      // If a localAddress is specified, bind the socket to that interface
      if ((this.options as any).localAddress) {
        connectOpts.localAddress = (this.options as any).localAddress;
        // For TCP client, we can specify a local port (0 = let OS choose)
        connectOpts.localPort = 0;
      }

      this.socket.connect(connectOpts, () => {
        clearTimeout(connectTimeout);
        this.isConnected = true;
        resolve();
      });

      this.socket.on('error', (error) => {
        clearTimeout(connectTimeout);
        this.isConnected = false;
        reject(new MCProtocolError(`Connection error: ${error.message}`));
      });

      this.socket.on('close', () => {
        this.isConnected = false;
        this.cleanup();
      });

      this.socket.on('data', (data) => {
        this.handleResponse(data);
      });
    });
  }

  async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.socket || !this.isConnected) {
        resolve();
        return;
      }

      this.socket.once('close', () => {
        resolve();
      });

      this.socket.destroy();
      this.cleanup();
    });
  }

  getIsConnected(): boolean {
    return this.isConnected && this.socket !== null;
  }

  async readRegister(device: string, address: number): Promise<number> {
    const result = await this.batchReadWordUnits([{ device, address }]);
    const key = `${device}${address}`;
    if (result[key] === undefined) {
      throw new MCProtocolError(`No data received for ${key}`);
    }
    return result[key];
  }

  async writeRegister(
    device: string,
    address: number,
    value: number
  ): Promise<void> {
    await this.batchWriteWordUnits([{ device, address, value }]);
  }

  async batchReadWordUnits(
    addresses: Array<{ device: string; address: number; count?: number }>
  ): Promise<ReadResult> {
    if (!this.isConnected || !this.socket) {
      throw new MCProtocolError('Not connected to PLC');
    }

    const results: ReadResult = {};

    for (const addr of addresses) {
      const frame = this.create4EReadFrame(
        addr.device,
        addr.address,
        addr.count || 1
      );
      const response = await this.sendRequest(frame);
      const values = this.parseReadResponse(response);

      for (let i = 0; i < values.length; i++) {
        const key = `${addr.device}${addr.address + i}`;
        results[key] = values[i];
      }
    }

    return results;
  }

  async batchWriteWordUnits(
    data: Array<{ device: string; address: number; value: number }>
  ): Promise<void> {
    if (!this.isConnected || !this.socket) {
      throw new MCProtocolError('Not connected to PLC');
    }

    for (const item of data) {
      const frame = this.create4EWriteFrame(item.device, item.address, [
        item.value,
      ]);
      await this.sendRequest(frame);
    }
  }

  private create4EReadFrame(
    device: string,
    address: number,
    count: number
  ): Buffer {
    let requestData = Buffer.alloc(0);

    // Command and subcommand
    const command = 0x0401;
    const subcommand = this.options.plcType === 'iQ-R' ? 0x0002 : 0x0000;
    requestData = Buffer.concat([
      requestData,
      this.encodeValue(command, 'short'),
    ]);
    requestData = Buffer.concat([
      requestData,
      this.encodeValue(subcommand, 'short'),
    ]);

    // Device data
    requestData = Buffer.concat([
      requestData,
      this.makeDeviceData(device, address),
    ]);
    requestData = Buffer.concat([
      requestData,
      this.encodeValue(count, 'short'),
    ]);

    // Create 4E frame header
    let mcData = Buffer.alloc(0);

    // Subheader (big endian for 4E type - 0x5400)
    const subheaderBuffer = Buffer.alloc(2);
    subheaderBuffer.writeUInt16BE(0x5400, 0);
    mcData = Buffer.concat([mcData, subheaderBuffer]);

    // Add other header fields
    mcData = Buffer.concat([mcData, this.encodeValue(0x0000, 'short')]); // subheaderserial
    mcData = Buffer.concat([mcData, this.encodeValue(0, 'short')]);
    mcData = Buffer.concat([mcData, this.encodeValue(0, 'byte')]); // network
    mcData = Buffer.concat([mcData, this.encodeValue(0xff, 'byte')]); // pc
    mcData = Buffer.concat([mcData, this.encodeValue(0x03ff, 'short')]); // dest_moduleio
    mcData = Buffer.concat([mcData, this.encodeValue(0x00, 'byte')]); // dest_modulesta

    // Add data length + timer size
    mcData = Buffer.concat([
      mcData,
      this.encodeValue(this.wordSize + requestData.length, 'short'),
    ]);
    mcData = Buffer.concat([mcData, this.encodeValue(4, 'short')]); // timer
    mcData = Buffer.concat([mcData, requestData]);

    // Debug: Log the request being sent
    // Debug: console.log(`Sending request: ${mcData.toString('hex')}`)
    // Debug: console.log(`Request data length: ${requestData.length}, wordSize: ${this.wordSize}`)

    return mcData;
  }

  private create4EWriteFrame(
    device: string,
    address: number,
    values: number[]
  ): Buffer {
    let requestData = Buffer.alloc(0);

    // Command and subcommand
    const command = 0x1401; // Write command
    const subcommand = this.options.plcType === 'iQ-R' ? 0x0002 : 0x0000;
    requestData = Buffer.concat([
      requestData,
      this.encodeValue(command, 'short'),
    ]);
    requestData = Buffer.concat([
      requestData,
      this.encodeValue(subcommand, 'short'),
    ]);

    // Device data
    requestData = Buffer.concat([
      requestData,
      this.makeDeviceData(device, address),
    ]);
    requestData = Buffer.concat([
      requestData,
      this.encodeValue(values.length, 'short'),
    ]);

    // Add values
    for (const value of values) {
      requestData = Buffer.concat([
        requestData,
        this.encodeValue(value, 'short', true),
      ]);
    }

    // Create 4E frame header
    let mcData = Buffer.alloc(0);

    // Subheader (big endian for 4E type - 0x5400)
    const subheaderBuffer = Buffer.alloc(2);
    subheaderBuffer.writeUInt16BE(0x5400, 0);
    mcData = Buffer.concat([mcData, subheaderBuffer]);

    // Add other header fields
    mcData = Buffer.concat([mcData, this.encodeValue(0x0000, 'short')]);
    mcData = Buffer.concat([mcData, this.encodeValue(0, 'short')]);
    mcData = Buffer.concat([mcData, this.encodeValue(0, 'byte')]);
    mcData = Buffer.concat([mcData, this.encodeValue(0xff, 'byte')]);
    mcData = Buffer.concat([mcData, this.encodeValue(0x03ff, 'short')]);
    mcData = Buffer.concat([mcData, this.encodeValue(0x00, 'byte')]);

    // Add data length + timer size
    mcData = Buffer.concat([
      mcData,
      this.encodeValue(this.wordSize + requestData.length, 'short'),
    ]);
    mcData = Buffer.concat([mcData, this.encodeValue(4, 'short')]);
    mcData = Buffer.concat([mcData, requestData]);

    return mcData;
  }

  private encodeValue(
    value: number,
    mode: string = 'short',
    isSigned: boolean = false
  ): Buffer {
    let buffer: Buffer;

    switch (mode) {
      case 'byte':
        buffer = Buffer.alloc(1);
        if (isSigned) {
          buffer.writeInt8(value, 0);
        } else {
          buffer.writeUInt8(value, 0);
        }
        break;
      case 'short':
        buffer = Buffer.alloc(2);
        if (isSigned) {
          buffer.writeInt16LE(value, 0);
        } else {
          buffer.writeUInt16LE(value, 0);
        }
        break;
      case 'long':
        buffer = Buffer.alloc(4);
        if (isSigned) {
          buffer.writeInt32LE(value, 0);
        } else {
          buffer.writeUInt32LE(value, 0);
        }
        break;
      default:
        throw new MCProtocolError(`Unknown encode mode: ${mode}`);
    }

    return buffer;
  }

  private makeDeviceData(device: string, address: number): Buffer {
    let deviceData = Buffer.alloc(0);

    // Extract device type (letters) and number
    const deviceTypeMatch = device.match(/\D+/);
    if (!deviceTypeMatch) {
      throw new MCProtocolError(`Invalid device: ${device}`);
    }
    const deviceType = deviceTypeMatch[0];

    const deviceCode =
      MCProtocol.DEVICE_CODES[
        deviceType as keyof typeof MCProtocol.DEVICE_CODES
      ];
    if (deviceCode === undefined) {
      throw new MCProtocolError(`Unknown device type: ${deviceType}`);
    }

    const deviceBase = this.getDeviceBase(deviceType);
    const deviceNum = parseInt(address.toString(), deviceBase);

    if (this.options.plcType === 'iQ-R') {
      // iQ-R series: 4 bytes for device number + 2 bytes for device code
      const numBuffer = Buffer.alloc(4);
      numBuffer.writeUInt32LE(deviceNum, 0);
      deviceData = Buffer.concat([deviceData, numBuffer]);

      const codeBuffer = Buffer.alloc(2);
      codeBuffer.writeUInt16LE(deviceCode, 0);
      deviceData = Buffer.concat([deviceData, codeBuffer]);
    } else {
      // Q series: 3 bytes for device number + 1 byte for device code
      const numBuffer = Buffer.alloc(3);
      numBuffer.writeUIntLE(deviceNum, 0, 3);
      deviceData = Buffer.concat([deviceData, numBuffer]);

      const codeBuffer = Buffer.alloc(1);
      codeBuffer.writeUInt8(deviceCode, 0);
      deviceData = Buffer.concat([deviceData, codeBuffer]);
    }

    return deviceData;
  }

  private getDeviceBase(deviceType: string): number {
    const hexDevices = ['X', 'Y', 'B', 'W', 'SB', 'SW', 'DX', 'DY', 'ZR'];
    return hexDevices.includes(deviceType) ? 16 : 10;
  }

  private async sendRequest(frame: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isConnected) {
        reject(new MCProtocolError('Not connected'));
        return;
      }

      const requestId = ++this.requestCounter;

      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new MCProtocolError('Request timeout'));
      }, this.options.timeout);

      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        timeout,
      });

      this.socket.write(frame, (error) => {
        if (error) {
          this.pendingRequests.delete(requestId);
          clearTimeout(timeout);
          reject(new MCProtocolError(`Write error: ${error.message}`));
        }
      });
    });
  }

  private handleResponse(data: Buffer): void {
    this.responseBuffer = Buffer.concat([this.responseBuffer, data]);

    // For 4E frame, process complete responses
    while (this.responseBuffer.length >= 13) {
      // Minimum 4E response length with data length field
      // For 4E frame: subheader(2) + serial(2) + reserved(2) + network(1) + pc(1) + moduleio(2) + modulesta(1) + length(2) = 13 bytes to read length
      // Data length is at offset 11-12 (after moduleio and modulesta)
      const dataLength = this.responseBuffer.readUInt16LE(11);
      const totalLength = 13 + dataLength; // header + data

      if (this.responseBuffer.length >= totalLength) {
        const response = this.responseBuffer.subarray(0, totalLength);
        this.responseBuffer = this.responseBuffer.subarray(totalLength);

        this.processResponse(response);
      } else {
        break;
      }
    }
  }

  private processResponse(response: Buffer): void {
    if (this.pendingRequests.size === 0) {
      return;
    }

    const requestEntry = this.pendingRequests.entries().next().value;
    if (!requestEntry) {
      return;
    }

    const [requestId, request] = requestEntry;
    this.pendingRequests.delete(requestId);
    clearTimeout(request.timeout);

    try {
      this.validateResponse(response);
      request.resolve(response);
    } catch (error: any) {
      request.reject(error);
    }
  }

  private validateResponse(response: Buffer): void {
    // Debug: console.log(`Response: ${response.toString('hex')}`)

    // Check subheader
    const subheader = response.readUInt16BE(0);
    if (subheader !== 0xd400) {
      throw new MCProtocolError(
        `Invalid subheader: 0x${subheader.toString(16)}`
      );
    }

    // Get data length and check error code
    const dataLength = response.readUInt16LE(9);

    // For error checking, use JavaScript version logic: error at offset 13
    if (response.length >= 15) {
      const errorCode = response.readUInt16LE(13);
      if (errorCode !== 0x0000) {
        throw new MCProtocolError(
          `PLC error: 0x${errorCode.toString(16)}`,
          undefined,
          errorCode
        );
      }
    }
  }

  private parseReadResponse(response: Buffer): number[] {
    this.validateResponse(response);

    const values: number[] = [];

    // Use JavaScript version offset: data starts at 15
    const dataStart = 15;

    for (let i = dataStart; i < response.length; i += 2) {
      if (i + 1 < response.length) {
        const value = response.readInt16LE(i);
        values.push(value);
      }
    }

    // Debug: console.log(`Parsed ${values.length} values from offset ${dataStart}`)
    return values;
  }

  private cleanup(): void {
    this.isConnected = false;
    this.responseBuffer = Buffer.alloc(0);

    for (const [requestId, request] of this.pendingRequests) {
      clearTimeout(request.timeout);
      request.reject(new MCProtocolError('Connection closed'));
    }
    this.pendingRequests.clear();
  }

  // Helper method for reading PLC registers (pymcprotocol style)
  async plcRead(registers: string[]): Promise<number[]> {
    const addresses = registers.map((reg) => {
      const match = reg.match(/^([A-Z]+)(\d+)$/);
      if (!match) {
        throw new MCProtocolError(`Invalid register format: ${reg}`);
      }
      return {
        device: match[1],
        address: parseInt(match[2]),
      };
    });

    const results = await this.batchReadWordUnits(addresses);

    return registers.map((reg) => {
      const value = results[reg];
      if (value === undefined) {
        throw new MCProtocolError(`No data received for register ${reg}`);
      }
      return value;
    });
  }
}
