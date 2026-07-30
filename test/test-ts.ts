/**
 * Simple TypeScript test for MC Protocol
 */

import { MCProtocol } from '../src/MCProtocol'

async function simpleTest() {
  console.log("=== Simple TypeScript Test ===\n")
  
  const plc = new MCProtocol({
    host: '192.168.1.80',
    port: 5002,
    plcType: 'iQ-R',
    frame: '4E'
  })
  
  try {
    console.log("1. Connecting...")
    await plc.connect()
    console.log("✓ Connected")
    
    console.log("2. Reading multiple registers...")
    const d0 = await plc.readRegister('D', 0)
    console.log(`✓ D0 = ${d0}`)
    
    const d1 = await plc.readRegister('D', 1)
    console.log(`✓ D1 = ${d1}`)
    
    const d230 = await plc.readRegister('D', 230)
    console.log(`✓ D230 = ${d230}`)
    const d238_1 = await plc.readRegister('D', '238')
    console.log(`✓ D238 = ${d238_1}`)
    const d238 = await plc.plcRead(['D238', 'D230'])
    console.log(`✓ D238, D230 = ${d238}`)
    const b21A = await plc.readRegister('B', '21A')
    console.log(`✓ B21A = ${b21A}`)
    
  } catch (error: any) {
    console.error("✗ Error:", error.message)
  } finally {
    console.log("3. Disconnecting...")
    await plc.disconnect()
    console.log("✓ Disconnected")
  }
}

simpleTest()