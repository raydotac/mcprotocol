/**
 * Quick test to verify the package exports work correctly
 */

console.log("Testing package exports...\n");

try {
  // Test importing as if it was an installed package
  const mcprotocol = require('../index.js');
  
  console.log("✅ Package imported successfully");
  console.log("Available exports:", Object.keys(mcprotocol));
  
  // Test TypeScript implementation
  const { MCProtocol, MCProtocolError } = mcprotocol;
  console.log("✅ TypeScript MCProtocol class available");
  
  // Test JavaScript compatibility implementation
  const { Type4E, PLC_TYPES } = mcprotocol;
  console.log("✅ JavaScript Type4E class available");
  console.log("Available PLC types:", Object.keys(PLC_TYPES));
  
  // Test creating instances
  const tsPlc = new MCProtocol({
    host: "192.168.1.80",
    port: 5002,
    plcType: 'iQ-R'
  });
  console.log("✅ TypeScript MCProtocol instance created");
  
  const jsPlc = new Type4E(PLC_TYPES.iQR);
  console.log("✅ JavaScript Type4E instance created");
  
  console.log("\n🎉 Package exports are working correctly!");
  console.log("Ready for NPM publication!");
  
} catch (error) {
  console.error("❌ Error:", error.message);
  console.error(error.stack);
}
