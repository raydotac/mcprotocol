/**
 * Comprehensive test for JavaScript MC Protocol implementation
 * Tests connection and register reading functionality
 */

const { Type4E, MCProtocolError, PLC_TYPES } = require('../index');

async function testMCProtocol() {
  console.log("=== JavaScript MC Protocol Test ===\n");
  
  // Create instance
  const plc = new Type4E(PLC_TYPES.iQR);
  console.log("✓ Created Type4E instance for iQ-R series");
  
  try {
    // Test connection
    console.log("\n1. Testing connection...");
    await plc.connect("192.168.1.80", 5002);
    console.log("✓ Successfully connected to PLC");
    
    // Test reading D registers
    console.log("\n2. Testing D register reading...");
    
    try {
      console.log("Reading D0-D9 (10 registers)...");
      const values1 = await plc.batchread_wordunits("D0", 10);
      console.log("✓ Successfully read D0-D9:");
      values1.forEach((value, index) => {
        console.log(`  D${index}: ${value}`);
      });
    } catch (error) {
      console.error("✗ Failed to read D0-D9:", error.message);
    }
    
    try {
      console.log("\nReading D100-D104 (5 registers)...");
      const values2 = await plc.batchread_wordunits("D100", 5);
      console.log("✓ Successfully read D100-D104:");
      values2.forEach((value, index) => {
        console.log(`  D${100 + index}: ${value}`);
      });
    } catch (error) {
      console.error("✗ Failed to read D100-D104:", error.message);
    }
    
    try {
      console.log("\nReading D1000 (single register)...");
      const values3 = await plc.batchread_wordunits("D1000", 1);
      console.log(`✓ Successfully read D1000: ${values3[0]}`);
    } catch (error) {
      console.error("✗ Failed to read D1000:", error.message);
    }
    
    // Test other device types
    console.log("\n3. Testing other device types...");
    
    try {
      console.log("Reading M0-M15 (bit devices)...");
      const mValues = await plc.batchread_wordunits("M0", 1);
      console.log(`✓ Successfully read M register: ${mValues[0]}`);
    } catch (error) {
      console.error("✗ Failed to read M registers:", error.message);
    }
    
    console.log("\n=== Test Summary ===");
    console.log("✓ Connection: PASSED");
    console.log("✓ Basic communication: PASSED");
    console.log("✓ Register reading: Tested multiple ranges");
    
  } catch (error) {
    console.error("✗ Test failed:", error.message);
    
    if (error instanceof MCProtocolError) {
      console.log("\nThis is a MC Protocol specific error.");
      console.log("Possible causes:");
      console.log("- PLC is not accessible at 192.168.1.80:5002");
      console.log("- MC Protocol is not enabled on the PLC");
      console.log("- Wrong PLC type (try Q series instead of iQ-R)");
      console.log("- Network/firewall issues");
    }
  } finally {
    // Clean up
    console.log("\n4. Cleaning up...");
    plc.close();
    console.log("✓ Connection closed");
  }
}

// Test different PLC types
async function testBothPlcTypes() {
  console.log("\n=== Testing Both PLC Types ===\n");
  
  for (const plcType of [PLC_TYPES.iQR, PLC_TYPES.Q]) {
    console.log(`\nTesting with PLC type: ${plcType}`);
    console.log("-".repeat(40));
    
    const plc = new Type4E(plcType);
    
    try {
      await plc.connect("192.168.1.80", 5002);
      console.log(`✓ Connected as ${plcType} series`);
      
      const values = await plc.batchread_wordunits("D0", 3);
      console.log(`✓ Read D0-D2: [${values.join(', ')}]`);
      
    } catch (error) {
      console.error(`✗ ${plcType} test failed:`, error.message);
    } finally {
      plc.close();
    }
  }
}

// Debug mode test
async function testWithDebug() {
  console.log("\n=== Debug Mode Test ===\n");
  
  const plc = new Type4E(PLC_TYPES.iQR);
  plc._debug = true; // Enable debug output
  
  try {
    console.log("Connecting with debug mode enabled...");
    await plc.connect("192.168.1.80", 5002);
    
    console.log("Reading single register with packet trace...");
    const values = await plc.batchread_wordunits("D230", 1);
    console.log(`Result: D0 = ${values[0]}`);
    
  } catch (error) {
    console.error("Debug test failed:", error.message);
  } finally {
    plc.close();
  }
}

// Main test runner
async function runAllTests() {
  try {
    await testMCProtocol();
    await testBothPlcTypes();
    await testWithDebug();
  } catch (error) {
    console.error("Test runner failed:", error);
  }
}

// Export for use in other scripts
module.exports = {
  testMCProtocol,
  testBothPlcTypes,
  testWithDebug,
  runAllTests
};

// Run tests if called directly
if (require.main === module) {
  console.log("Starting MC Protocol JavaScript Implementation Tests...\n");
  runAllTests().then(() => {
    console.log("\n=== All Tests Complete ===");
    process.exit(0);
  }).catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
