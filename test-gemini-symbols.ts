/**
 * Test: Gemini Agent Symbol Tracking
 * 
 * Verifies the complete flow:
 * 1. Pickaboo dashboard returns Gemini's configured symbols
 * 2. Chat engine generates messages with symbols
 * 3. API stores symbols to Supabase
 * 4. API retrieves symbols from Supabase
 * 5. Dashboard transforms symbols correctly
 */

import fetch from 'node-fetch'

const API_URL = process.env.API_URL || 'http://localhost:3000'
const GEMINI_AGENT_ID = 'gemini_grid'

console.log(`\n🧪 Starting Gemini Symbol Tracking Test`)
console.log(`📍 API URL: ${API_URL}`)
console.log(`🤖 Agent ID: ${GEMINI_AGENT_ID}\n`)

interface TestResult {
  name: string
  passed: boolean
  data?: any
  error?: string
}

const results: TestResult[] = []

// ============================================================================
// TEST 1: Fetch Gemini's configured symbols from Pickaboo dashboard
// ============================================================================
async function test1_FetchPickabooSymbols() {
  console.log(`\n[TEST 1] Fetching Gemini's symbols from Pickaboo dashboard...`)
  
  try {
    const response = await fetch(
      `${API_URL}/api/pickaboo/agent-trading-symbols?agent_id=${GEMINI_AGENT_ID}`
    )
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    
    if (data.success && Array.isArray(data.symbols)) {
      console.log(`  ✅ Got symbols: ${data.symbols.join(', ')}`)
      console.log(`  📊 Source: ${data.source}`)
      
      results.push({
        name: 'Pickaboo Symbol Fetch',
        passed: true,
        data: {
          symbols: data.symbols,
          source: data.source
        }
      })
      
      return data.symbols
    } else {
      throw new Error(`Invalid response: ${JSON.stringify(data)}`)
    }
  } catch (error) {
    console.log(`  ❌ Failed: ${error}`)
    results.push({
      name: 'Pickaboo Symbol Fetch',
      passed: false,
      error: String(error)
    })
    return null
  }
}

// ============================================================================
// TEST 2: Generate chat messages for Gemini
// ============================================================================
async function test2_GenerateChatMessages() {
  console.log(`\n[TEST 2] Generating chat messages for Gemini...`)
  
  try {
    const response = await fetch(`${API_URL}/api/chat/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    
    if (data.success) {
      console.log(`  ✅ Generated ${data.messages?.length || 0} messages`)
      
      // Find Gemini messages
      const geminiMessages = (data.messages || []).filter(
        (msg: any) => msg.agentId === GEMINI_AGENT_ID
      )
      
      console.log(`  🤖 Gemini messages: ${geminiMessages.length}`)
      
      if (geminiMessages.length > 0) {
        const firstMsg = geminiMessages[0]
        console.log(`  📍 First message symbol: ${firstMsg?.symbol || 'NONE'}`)
        console.log(`  💬 Sample content: ${firstMsg.content?.substring(0, 50)}...`)
      }
      
      results.push({
        name: 'Chat Generation',
        passed: geminiMessages.length > 0 && geminiMessages[0]?.symbol !== undefined,
        data: {
          totalMessages: data.messages?.length,
          geminiMessages: geminiMessages.length,
          hasSymbol: geminiMessages.length > 0 ? !!geminiMessages[0]?.symbol : false,
          sampleSymbol: geminiMessages[0]?.symbol
        }
      })
      
      return geminiMessages
    } else {
      throw new Error(`Generation failed: ${data.error}`)
    }
  } catch (error) {
    console.log(`  ❌ Failed: ${error}`)
    results.push({
      name: 'Chat Generation',
      passed: false,
      error: String(error)
    })
    return null
  }
}

// ============================================================================
// TEST 3: Fetch messages from API (should include symbols)
// ============================================================================
async function test3_FetchMessagesFromAPI() {
  console.log(`\n[TEST 3] Fetching messages from API...`)
  
  try {
    const response = await fetch(`${API_URL}/api/chat/messages?agentId=${GEMINI_AGENT_ID}&limit=5`)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    
    if (data.success) {
      console.log(`  ✅ Retrieved ${data.messages?.length || 0} messages from API`)
      
      if (data.messages && data.messages.length > 0) {
        const firstMsg = data.messages[0]
        console.log(`  📍 First message symbol: ${firstMsg.symbol || 'NONE'}`)
        console.log(`  📊 Message type: ${firstMsg.message_type}`)
        console.log(`  🕐 Timestamp: ${firstMsg.timestamp}`)
        
        // Check if symbol field exists
        const hasSymbolField = 'symbol' in firstMsg
        const symbolValue = firstMsg.symbol
        
        results.push({
          name: 'API Message Fetch',
          passed: hasSymbolField && symbolValue !== null && symbolValue !== undefined,
          data: {
            messageCount: data.messages.length,
            hasSymbolField,
            sampleSymbol: symbolValue,
            messageFields: Object.keys(firstMsg)
          }
        })
      } else {
        console.log(`  ⚠️  No messages found for Gemini`)
        results.push({
          name: 'API Message Fetch',
          passed: false,
          error: 'No messages returned'
        })
      }
    } else {
      throw new Error(`API error: ${data.error}`)
    }
  } catch (error) {
    console.log(`  ❌ Failed: ${error}`)
    results.push({
      name: 'API Message Fetch',
      passed: false,
      error: String(error)
    })
  }
}

// ============================================================================
// TEST 4: Simulate dashboard transformation
// ============================================================================
async function test4_DashboardTransformation() {
  console.log(`\n[TEST 4] Simulating dashboard message transformation...`)
  
  try {
    const response = await fetch(`${API_URL}/api/chat/messages?limit=30`)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    
    if (data.success && data.messages) {
      // Simulate dashboard transformation
      const transformedMessages = data.messages.map((msg: any) => ({
        id: msg.id,
        agentId: msg.agent_id || msg.agentId,
        agentName: msg.agent_name || msg.agentName,
        timestamp: msg.timestamp,
        content: msg.content,
        type: msg.message_type || msg.type,
        confidence: msg.confidence,
        symbol: msg.symbol, // This is the key line
      }))
      
      const geminiMessages = transformedMessages.filter(
        (msg: any) => msg.agentId === GEMINI_AGENT_ID
      )
      
      console.log(`  ✅ Transformed ${transformedMessages.length} messages`)
      console.log(`  🤖 Gemini messages: ${geminiMessages.length}`)
      
      if (geminiMessages.length > 0) {
        const firstMsg = geminiMessages[0]
        console.log(`  ✅ Symbol present in transformed message: ${!!firstMsg.symbol}`)
        console.log(`  📍 Symbol value: ${firstMsg.symbol || 'NONE'}`)
        
        results.push({
          name: 'Dashboard Transformation',
          passed: !!firstMsg.symbol,
          data: {
            messageCount: transformedMessages.length,
            geminiCount: geminiMessages.length,
            hasSymbol: !!firstMsg.symbol,
            sampleSymbol: firstMsg.symbol
          }
        })
      } else {
        console.log(`  ⚠️  No Gemini messages to transform`)
        results.push({
          name: 'Dashboard Transformation',
          passed: false,
          error: 'No Gemini messages found'
        })
      }
    } else {
      throw new Error('No messages returned')
    }
  } catch (error) {
    console.log(`  ❌ Failed: ${error}`)
    results.push({
      name: 'Dashboard Transformation',
      passed: false,
      error: String(error)
    })
  }
}

// ============================================================================
// TEST 5: Check Supabase schema
// ============================================================================
async function test5_CheckSupabaseSchema() {
  console.log(`\n[TEST 5] Checking Supabase schema for agent_chat_messages table...`)
  
  try {
    const response = await fetch(`${API_URL}/api/chat/debug`)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    
    if (data.schema) {
      console.log(`  ✅ Schema retrieved`)
      
      const hasSymbolColumn = data.schema.includes('symbol')
      console.log(`  📊 Has 'symbol' column: ${hasSymbolColumn ? '✅ YES' : '❌ NO'}`)
      
      if (hasSymbolColumn) {
        console.log(`  📋 Full schema: ${data.schema}`)
      } else {
        console.log(`  ⚠️  Available columns: ${data.schema}`)
      }
      
      results.push({
        name: 'Supabase Schema Check',
        passed: hasSymbolColumn,
        data: {
          schema: data.schema,
          hasSymbolColumn
        }
      })
    } else {
      throw new Error('No schema information')
    }
  } catch (error) {
    console.log(`  ⚠️  Could not verify schema: ${error}`)
    results.push({
      name: 'Supabase Schema Check',
      passed: false,
      error: String(error)
    })
  }
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================
async function runAllTests() {
  try {
    await test1_FetchPickabooSymbols()
    await test2_GenerateChatMessages()
    await test3_FetchMessagesFromAPI()
    await test4_DashboardTransformation()
    await test5_CheckSupabaseSchema()
  } catch (error) {
    console.error('\n❌ Test suite error:', error)
  }
  
  // Print results summary
  printSummary()
}

function printSummary() {
  console.log(`\n\n${'='.repeat(70)}`)
  console.log(`📊 TEST RESULTS SUMMARY`)
  console.log(`${'='.repeat(70)}\n`)
  
  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  
  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌'
    console.log(`${icon} ${result.name}`)
    
    if (result.data) {
      console.log(`   ${JSON.stringify(result.data, null, 3).split('\n').join('\n   ')}`)
    }
    
    if (result.error) {
      console.log(`   Error: ${result.error}`)
    }
  })
  
  console.log(`\n${'='.repeat(70)}`)
  console.log(`📈 Summary: ${passed} passed, ${failed} failed (${results.length} total)`)
  console.log(`${'='.repeat(70)}\n`)
  
  if (failed === 0) {
    console.log(`🎉 All tests passed! Symbol tracking is working correctly.`)
  } else {
    console.log(`⚠️  Some tests failed. See details above.`)
  }
}

// Start tests
runAllTests().catch(console.error)