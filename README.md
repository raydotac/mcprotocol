# MC Protocol Library for Node.js

A comprehensive Node.js library for communicating with Mitsubishi PLCs using the MC Protocol. This library provides both JavaScript and TypeScript implementations, inspired by the popular Python `pymcprotocol` library.

## Features

✅ **Dual Implementation**: Both JavaScript and TypeScript versions  
✅ **Multiple PLC Support**: iQ-R, Q, iQ-L, L, and QnA series  
✅ **Frame Support**: 3E and 4E frame types  
✅ **Type Safety**: Full TypeScript support with type definitions  
✅ **Modern API**: Promise-based with async/await  
✅ **Batch Operations**: Optimized reading/writing of multiple registers  
✅ **Error Handling**: Comprehensive error reporting  
✅ **Production Ready**: Inspired by proven pymcprotocol library  

## Installation

```bash
npm install @raydotac/mcprotocol
```

## Quick Start

### TypeScript Usage (Recommended)

```typescript
import { MCProtocol } from '@raydotac/mcprotocol';

async function main() {
  const plc = new MCProtocol({
    host: '192.168.1.100',
    port: 5002,
    plcType: 'iQ-R'
  });

  try {
    await plc.connect();
    
    // Read single register
    const value = await plc.readRegister('D', 100);
    console.log('D100:', value);
    
    // Read multiple registers (pymcprotocol style)
    const values = await plc.plcRead(['D0', 'D1', 'D2', 'D3', 'D4']);
    console.log('Values:', values);
    
    // Batch read (optimized)
    const batchResult = await plc.batchReadWordUnits([
      { device: 'D', address: 100 },
      { device: 'D', address: 101 },
      { device: 'M', address: 0 }
    ]);
    
    // Write register
    await plc.writeRegister('D', 200, 12345);
    
  } finally {
    await plc.disconnect();
  }
}
```

### JavaScript Usage

```javascript
const { Type4E, PLC_TYPES } = require('@raydotac/mcprotocol');

async function main() {
  const plc = new Type4E(PLC_TYPES.iQR);
  
  try {
    await plc.connect('192.168.1.100', 5002);
    
    // Read 10 registers starting from D0
    const values = await plc.batchread_wordunits('D0', 10);
    console.log('D0-D9:', values);
    
  } finally {
    plc.close();
  }
}
```

## API Reference

### TypeScript API (MCProtocol class)

#### Constructor Options

```typescript
interface MCProtocolOptions {
  host: string;           // PLC IP address
  port: number;           // PLC port (usually 5002)
  timeout?: number;       // Connection timeout (default: 5000ms)
  plcType?: 'Q' | 'iQ-R' | 'iQ-L' | 'L' | 'QnA';  // PLC series
  frame?: '3E' | '4E';    // Frame type (default: '3E')
}
```

#### Methods

- `connect(): Promise<void>` - Connect to PLC
- `disconnect(): Promise<void>` - Disconnect from PLC
- `readRegister(device: string, address: number): Promise<number>` - Read single register
- `writeRegister(device: string, address: number, value: number): Promise<void>` - Write single register
- `plcRead(registers: string[]): Promise<number[]>` - Read multiple registers (pymcprotocol style)
- `batchReadWordUnits(addresses: DeviceAddress[]): Promise<ReadResult>` - Optimized batch read
- `batchWriteWordUnits(data: WriteData[]): Promise<void>` - Optimized batch write

### JavaScript API (Type4E class)

#### Constructor

```javascript
const plc = new Type4E(plcType);  // plcType: PLC_TYPES.iQR or PLC_TYPES.Q
```

#### Methods

- `connect(ip: string, port: number): Promise<void>` - Connect to PLC
- `close(): void` - Close connection
- `batchread_wordunits(device: string, count: number): Promise<number[]>` - Read word units

## Supported Devices

| Device | Description | Example |
|--------|-------------|---------|
| **D** | Data registers | D0, D100, D1000 |
| **R** | File registers | R0, R100 |
| **ZR** | Extension file registers | ZR0, ZR100 |
| **M** | Internal relays | M0, M100 |
| **X** | Input contacts | X0, X10 (hex) |
| **Y** | Output contacts | Y0, Y10 (hex) |
| **B** | Link relays | B0, B100 (hex) |
| **W** | Link registers | W0, W100 (hex) |

## Supported PLC Series

- **iQ-R Series**: High-performance PLCs (default)
- **Q Series**: Standard PLCs
- **iQ-L Series**: Compact PLCs  
- **L Series**: Basic PLCs
- **QnA Series**: Legacy PLCs

## Error Handling

```typescript
import { MCProtocolError } from '@raydotac/mcprotocol';

try {
  await plc.readRegister('D', 0);
} catch (error) {
  if (error instanceof MCProtocolError) {
    console.log('PLC Error:', error.message);
    console.log('Error Code:', error.errorCode);
  }
}
```

## Examples

### Reading Multiple Device Types

```typescript
const results = await plc.batchReadWordUnits([
  { device: 'D', address: 0 },    // Data register
  { device: 'M', address: 0 },    // Internal relay  
  { device: 'X', address: 0 },    // Input contact
  { device: 'Y', address: 0 }     // Output contact
]);
```

### Batch Writing

```typescript
await plc.batchWriteWordUnits([
  { device: 'D', address: 100, value: 1234 },
  { device: 'D', address: 101, value: 5678 },
  { device: 'D', address: 102, value: 9012 }
]);
```

### Using with Different PLC Types

```typescript
// For Q Series PLC
const qPlc = new MCProtocol({
  host: '192.168.1.100',
  port: 5002,
  plcType: 'Q',
  frame: '3E'
});

// For iQ-L Series PLC  
const iqlPlc = new MCProtocol({
  host: '192.168.1.101', 
  port: 5002,
  plcType: 'iQ-L'
});
```

## Network Configuration

Ensure your PLC has MC Protocol enabled:

1. **iQ-R Series**: Enable "MC Protocol" in the Ethernet module settings
2. **Q Series**: Configure the Ethernet module for MC Protocol communication  
3. **Default Port**: 5002 (can be configured in PLC settings)

## Comparison with pymcprotocol

This library provides similar functionality to the Python `pymcprotocol`:

| Feature | pymcprotocol (Python) | This Library (Node.js) |
|---------|----------------------|------------------------|
| Device Support | ✅ D, M, X, Y, R, etc. | ✅ D, M, X, Y, R, etc. |
| PLC Series | ✅ iQ-R, Q, L | ✅ iQ-R, Q, iQ-L, L, QnA |
| Frame Types | ✅ 3E, 4E | ✅ 3E, 4E |
| Batch Operations | ✅ | ✅ Enhanced |
| Type Safety | ❌ | ✅ Full TypeScript |
| Error Handling | ✅ | ✅ Enhanced |

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests.

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- Inspired by the excellent Python `pymcprotocol` library
- Mitsubishi Electric for MC Protocol specifications
- Community feedback and contributions

---

**Note**: This library requires an actual Mitsubishi PLC with MC Protocol enabled for real communication. For testing without hardware, consider using a PLC simulator.
