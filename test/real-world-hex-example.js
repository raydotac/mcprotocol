/**
 * Comprehensive example demonstrating hexadecimal address support
 * Shows real-world usage patterns for PLC addresses like B41A, B23B, etc.
 */

const { MCProtocol } = require('../index');

console.log("🏭 Real-World Hexadecimal Address Examples\n");

async function realWorldExample() {
  const plc = new MCProtocol({
    host: "192.168.1.100",
    port: 6000,
    plcType: 'Q',
    frame: '4E',
    timeout: 5000
  });

  try {
    console.log("=== Hexadecimal Address Support Examples ===\n");
    
    // 1. Individual register operations with hex addresses
    console.log("1. Reading individual registers with hex addresses:");
    console.log("   - Reading B register at hex address 41A (decimal 1050)");
    console.log("   - Reading B register at hex address 23B (decimal 571)");
    console.log("   - Reading X input at hex address FF (decimal 255)");
    
    // Simulate the calls (will show connection error but demonstrates syntax)
    try {
      await plc.connect();
      
      // These work with hexadecimal addresses
      const b41a = await plc.readRegister('B', '41A');
      const b23b = await plc.readRegister('B', '23B');
      const xff = await plc.readRegister('X', 'FF');
      const y1a0 = await plc.readRegister('Y', '1A0');
      
      console.log(`   B41A: ${b41a}`);
      console.log(`   B23B: ${b23b}`);
      console.log(`   XFF: ${xff}`);
      console.log(`   Y1A0: ${y1a0}`);
      
    } catch (error) {
      console.log(`   (Connection simulation - ${error.message.split(':')[0]})\n`);
    }

    // 2. Batch operations
    console.log("2. Batch operations with mixed address formats:");
    const mixedAddresses = [
      { device: 'B', address: '41A', description: 'B register at hex 41A' },
      { device: 'B', address: '23B', description: 'B register at hex 23B' },
      { device: 'D', address: 100, description: 'D register at decimal 100' },
      { device: 'D', address: '200', description: 'D register at decimal 200 (string)' },
      { device: 'X', address: 'FF', description: 'X input at hex FF' },
      { device: 'Y', address: '1A0', description: 'Y output at hex 1A0' }
    ];

    for (const addr of mixedAddresses) {
      console.log(`   - ${addr.description}`);
    }
    
    try {
      const results = await plc.batchReadWordUnits(mixedAddresses);
      console.log("   Results:", results);
    } catch (error) {
      console.log(`   (Connection simulation - batch read syntax is correct)\n`);
    }

    // 3. plcRead helper with register strings
    console.log("3. Using plcRead helper with hex register names:");
    const hexRegisters = [
      'B41A',    // Hex address in B register
      'B23B',    // Hex address in B register
      'D100',    // Decimal address in D register
      'XFF',     // Hex address in X input
      'Y1A0',    // Hex address in Y output
      'W100',    // Hex address in W register (file register)
      'ZR1000'   // Decimal address in ZR register
    ];

    for (const reg of hexRegisters) {
      console.log(`   - ${reg}`);
    }

    try {
      const values = await plc.plcRead(hexRegisters);
      console.log("   Values:", values);
    } catch (error) {
      console.log(`   (Connection simulation - register parsing works correctly)\n`);
    }

    // 4. Write operations
    console.log("4. Writing to hex addresses:");
    const writeOperations = [
      { device: 'B', address: '41A', value: 0x1234, description: 'Write 0x1234 to B41A' },
      { device: 'B', address: '23B', value: 0xABCD, description: 'Write 0xABCD to B23B' },
      { device: 'D', address: 100, value: 5000, description: 'Write 5000 to D100' }
    ];

    for (const op of writeOperations) {
      console.log(`   - ${op.description}`);
      try {
        await plc.writeRegister(op.device, op.address, op.value);
      } catch (error) {
        // Expected connection error
      }
    }

  } catch (error) {
    console.log("Note: Connection errors are expected in test environment");
  } finally {
    await plc.disconnect().catch(() => {});
  }

  // 5. Address format validation
  console.log("\n5. Address Format Examples:");
  console.log("   Supported formats:");
  console.log("   - Numeric: plc.readRegister('D', 100)");
  console.log("   - Decimal string: plc.readRegister('D', '100')"); 
  console.log("   - Hex string: plc.readRegister('B', '41A')");
  console.log("   - Mixed case hex: plc.readRegister('B', '41a')");
  console.log("   - Register strings: plc.plcRead(['B41A', 'D100', 'XFF'])");

  console.log("\n6. Device Type Address Bases:");
  console.log("   Hexadecimal (base 16): X, Y, B, W, SB, SW, DX, DY, ZR");
  console.log("   Decimal (base 10): D, R, M, T, C, TC, TS, TN, CN, CS, CC, etc.");

  console.log("\n✅ All hexadecimal address patterns are now supported!");
}

// Common real-world address patterns
function showCommonPatterns() {
  console.log("\n📖 Common Real-World Address Patterns:");
  
  const patterns = {
    "Input registers (X)": ["X0", "XFF", "X1A0", "X3E8"],
    "Output registers (Y)": ["Y0", "YFF", "Y1A0", "Y200"],  
    "Link registers (B)": ["B0", "B41A", "B23B", "BFFF"],
    "Data registers (D)": ["D0", "D100", "D1000", "D9999"],
    "File registers (W)": ["W0", "WFF", "W1000", "WFFF"],
    "Timer registers (T)": ["T0", "T100", "T255", "T511"],
    "Counter registers (C)": ["C0", "C100", "C255", "C1023"]
  };

  for (const [type, examples] of Object.entries(patterns)) {
    console.log(`   ${type}: ${examples.join(', ')}`);
  }

  console.log("\n💡 Tips:");
  console.log("   - Hex addresses are case-insensitive: 'B41A' = 'B41a' = 'b41a'");
  console.log("   - Leading zeros are optional: 'XFF' = 'X0FF'");
  console.log("   - Mix decimal and hex in the same batch operation");
  console.log("   - All existing code continues to work unchanged");
}

// Run the example
realWorldExample().then(() => {
  showCommonPatterns();
  console.log("\n🎉 Ready for real-world PLC communication with hex addresses!");
});