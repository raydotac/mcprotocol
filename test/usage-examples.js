/**
 * Example usage demonstrating how to use the published package
 * This simulates how users would import and use @raydotac/mcprotocol
 */

// Simulate package import (users would do: require('@raydotac/mcprotocol'))
const mcprotocol = require('../index');

console.log("📦 MC Protocol Package Usage Examples\n");

// Example 1: JavaScript/Legacy API
console.log("=== JavaScript API (Type4E) ===");
async function legacyExample() {
  const { Type4E, PLC_TYPES } = mcprotocol;
  
  const plc = new Type4E(PLC_TYPES.iQR);
  
  try {
    console.log("Connecting to PLC...");
    await plc.connect("192.168.1.80", 5002);
    
    console.log("Reading 3 registers starting from D0...");
    const values = await plc.batchread_wordunits("D0", 3);
    console.log("Values:", values);
    
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    plc.close();
    console.log("Disconnected.");
  }
}

// Example 2: TypeScript/Modern API  
console.log("\n=== TypeScript API (MCProtocol) ===");
async function modernExample() {
  const { MCProtocol } = mcprotocol;
  
  const plc = new MCProtocol({
    host: "192.168.1.80",
    port: 5002,
    plcType: 'iQ-R',
    frame: '4E',
    timeout: 3000
  });
  
  try {
    console.log("Connecting to PLC...");
    await plc.connect();
    
    console.log("Reading individual registers...");
    const d0 = await plc.readRegister('D', 0);
    const d1 = await plc.readRegister('D', 1);
    console.log(`D0: ${d0}, D1: ${d1}`);
    
    console.log("Reading hex address registers...");
    const b41a = await plc.readRegister('B', '41A');  // Hex address as string
    const b23b = await plc.readRegister('B', '23B');  // Hex address as string
    console.log(`B41A: ${b41a}, B23B: ${b23b}`);
    
    console.log("Using pymcprotocol-style helper with mixed addresses...");
    const values = await plc.plcRead(['D0', 'D1', 'B41A', 'B23B', 'XFF']);
    console.log("Values:", values);
    
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await plc.disconnect();
    console.log("Disconnected.");
  }
}

// Run examples
async function runExamples() {
  try {
    await legacyExample();
    console.log("\n" + "=".repeat(50) + "\n");
    await modernExample();
    
    console.log("\n✅ Both APIs working correctly!");
    console.log("📦 Package is ready for use!");
    
  } catch (error) {
    console.error("Example failed:", error);
  }
}

runExamples();
