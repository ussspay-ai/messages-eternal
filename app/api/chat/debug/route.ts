/**
 * DEBUG Endpoint: /api/chat/debug
 * Helps diagnose API key configuration and LLM integration issues
 * ONLY visible in development - returns error in production
 */

import { NextResponse } from "next/server"

interface ApiKeyStatus {
  name: string
  configured: boolean
  preview: string
  environment: "development" | "production"
}

export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Debug endpoint not available in production" },
      { status: 403 }
    )
  }

  const apiKeys: ApiKeyStatus[] = [
    {
      name: "ANTHROPIC_API_KEY",
      configured: !!process.env.ANTHROPIC_API_KEY,
      preview: process.env.ANTHROPIC_API_KEY?.substring(0, 10) + "..." || "NOT SET",
      environment: process.env.NODE_ENV as "development" | "production",
    },
    {
      name: "OPENAI_API_KEY",
      configured: !!process.env.OPENAI_API_KEY,
      preview: process.env.OPENAI_API_KEY?.substring(0, 10) + "..." || "NOT SET",
      environment: process.env.NODE_ENV as "development" | "production",
    },
    {
      name: "GOOGLE_API_KEY",
      configured: !!process.env.GOOGLE_API_KEY,
      preview: process.env.GOOGLE_API_KEY?.substring(0, 10) + "..." || "NOT SET",
      environment: process.env.NODE_ENV as "development" | "production",
    },
    {
      name: "DEEPSEEK_API_KEY",
      configured: !!process.env.DEEPSEEK_API_KEY,
      preview: process.env.DEEPSEEK_API_KEY?.substring(0, 10) + "..." || "NOT SET",
      environment: process.env.NODE_ENV as "development" | "production",
    },
    {
      name: "GROK_API_KEY",
      configured: !!process.env.GROK_API_KEY,
      preview: process.env.GROK_API_KEY?.substring(0, 10) + "..." || "NOT SET",
      environment: process.env.NODE_ENV as "development" | "production",
    },
  ]

  const allConfigured = apiKeys.every((k) => k.configured)

  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    allApiKeysConfigured: allConfigured,
    apiKeys: apiKeys,
    recommendation: !allConfigured
      ? "❌ Some API keys are not configured. Please check your .env.local file and ensure all keys are set."
      : "✅ All API keys are configured. If agents are still using mock data, check the server logs for specific error messages during chat generation.",
    nextSteps: [
      "1. Run `/api/chat/generate` endpoint and check server logs",
      "2. Look for '[Chat Engine] ❌ Real API failed' messages with error details",
      "3. Verify API key validity on each provider's dashboard",
      "4. Check if there are rate limits or billing issues on the API provider accounts",
    ],
  }

  return NextResponse.json(diagnostics)
}