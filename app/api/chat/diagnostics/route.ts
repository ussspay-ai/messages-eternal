/**
 * Chat Generation Diagnostics Endpoint
 * Helps troubleshoot why chats are falling back to mock mode
 * 
 * GET /api/chat/diagnostics
 */

import { NextResponse } from "next/server"
import { getAgentCredentials } from "@/lib/constants/agents"

export async function GET() {
  const diagnostics: Record<string, any> = {
    timestamp: new Date().toISOString(),
    apiKeys: {} as Record<string, boolean>,
    positionsFetch: {} as Record<string, any>,
    agentCredentials: {} as Record<string, boolean>,
    errors: [] as string[],
  }

  // Step 1: Check environment variables
  console.log("[Diagnostics] Checking environment variables...")
  
  const envCheck = {
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    GOOGLE_API_KEY: !!process.env.GOOGLE_API_KEY,
    DEEPSEEK_API_KEY: !!process.env.DEEPSEEK_API_KEY,
    GROK_API_KEY: !!process.env.GROK_API_KEY,
    ASTER_USER_API_KEY: !!process.env.ASTER_USER_API_KEY,
    REDIS_URL: !!process.env.REDIS_URL,
  }
  
  diagnostics.apiKeys = envCheck
  
  // Step 2: Check agent credentials
  console.log("[Diagnostics] Checking agent credentials...")
  
  const agentIds = ["claude_arbitrage", "chatgpt_openai", "gemini_grid", "deepseek_ml", "buy_and_hold"]
  
  for (const agentId of agentIds) {
    try {
      const creds = getAgentCredentials(agentId)
      diagnostics.agentCredentials[agentId] = !!creds && !!creds.userApiKey && !!creds.userApiSecret
    } catch (e) {
      diagnostics.agentCredentials[agentId] = false
      diagnostics.errors.push(`Failed to get credentials for ${agentId}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  
  // Step 3: Try fetching positions for each agent
  console.log("[Diagnostics] Testing position fetches...")
  
  for (const agentId of agentIds) {
    try {
      const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : `http://localhost:3000`
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      
      const response = await fetch(`${baseUrl}/api/aster/positions?agentId=${agentId}`, {
        method: "GET",
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      
      const data = await response.json()
      
      diagnostics.positionsFetch[agentId] = {
        status: response.status,
        ok: response.ok,
        count: Array.isArray(data) ? data.length : data.positions?.length || 0,
        hasError: !response.ok,
      }
      
      if (!response.ok) {
        diagnostics.errors.push(`Positions fetch failed for ${agentId}: ${response.status} - ${JSON.stringify(data).substring(0, 100)}`)
      }
    } catch (e) {
      diagnostics.positionsFetch[agentId] = {
        status: null,
        ok: false,
        count: 0,
        error: e instanceof Error ? e.message : String(e),
      }
      diagnostics.errors.push(`Position fetch error for ${agentId}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  
  // Step 4: Test market prices endpoint
  console.log("[Diagnostics] Testing market prices endpoint...")
  
  try {
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : `http://localhost:3000`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    
    const response = await fetch(`${baseUrl}/api/market/prices`, {
      method: "GET",
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    
    const data = await response.json()
    
    diagnostics.marketPrices = {
      status: response.status,
      ok: response.ok,
      symbols: Object.keys(data).filter(k => typeof data[k] === 'number'),
    }
    
    if (!response.ok) {
      diagnostics.errors.push(`Market prices fetch failed: ${response.status}`)
    }
  } catch (e) {
    diagnostics.marketPrices = {
      status: null,
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    }
    diagnostics.errors.push(`Market prices fetch error: ${e instanceof Error ? e.message : String(e)}`)
  }
  
  // Summary
  diagnostics.summary = {
    allLLMsConfigured: Object.values(envCheck).slice(0, 5).every(v => v),
    allAgentsConfigured: Object.values(diagnostics.agentCredentials).every(v => v),
    hasPositions: Object.values(diagnostics.positionsFetch).some((p: any) => (p.count || 0) > 0),
    marketDataOk: diagnostics.marketPrices?.ok ?? false,
    totalErrors: diagnostics.errors.length,
  }
  
  console.log("[Diagnostics] ✅ Diagnostics complete:", JSON.stringify(diagnostics.summary, null, 2))
  
  return NextResponse.json(diagnostics, { status: 200 })
}