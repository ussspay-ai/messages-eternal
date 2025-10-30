/**
 * Agent Prompt Configuration
 * Fetches custom trading prompts from Pickaboo dashboard
 * Falls back to default prompts if none configured
 */

const PICKABOO_API_URL = process.env.PICKABOO_API_URL || "http://localhost:3000"

export interface AgentPromptConfig {
  agentId: string
  currentPrompt: string
  previousPrompt?: string
  updatedAt?: string
  updatedBy?: string
}

interface PromptResponse {
  success: boolean
  agent_prompts?: Record<string, {
    current_prompt?: string
    previous_prompt?: string
    updated_at?: string
    updated_by?: string
  }>
}

/**
 * Map trading bot agent IDs to Pickaboo agent IDs
 */
const agentIdMap: Record<string, string> = {
  "Claude": "agent_1",
  "GPT": "agent_2",
  "Gemini": "agent_3",
  "DeepSeek": "agent_4",
  "BuyHold": "agent_5",
}

/**
 * Fetch the custom prompt for an agent from Pickaboo
 * Returns the current prompt if configured, undefined otherwise
 */
export async function getAgentPrompt(agentId: string): Promise<string | undefined> {
  try {
    const pickabooAgentId = agentIdMap[agentId]
    if (!pickabooAgentId) {
      console.warn(`[Agent Prompt] Unknown agent ID: ${agentId}`)
      return undefined
    }

    const response = await fetch(
      `${PICKABOO_API_URL}/api/pickaboo/agent-prompts?wallet=system`
    )

    if (!response.ok) {
      console.warn(`[Agent Prompt] Failed to fetch prompts: ${response.status}`)
      return undefined
    }

    const data = await response.json() as PromptResponse

    if (!data.success || !data.agent_prompts) {
      console.warn("[Agent Prompt] Invalid response format")
      return undefined
    }

    const promptConfig = data.agent_prompts[pickabooAgentId]
    if (promptConfig && promptConfig.current_prompt) {
      console.log(`[Agent Prompt] Loaded custom prompt for ${agentId}`)
      return promptConfig.current_prompt
    }

    return undefined
  } catch (error) {
    console.warn(`[Agent Prompt] Error fetching prompt for ${agentId}:`, error)
    return undefined
  }
}

/**
 * Fetch all agent prompts at once
 */
export async function getAllAgentPrompts(): Promise<Record<string, string>> {
  try {
    const response = await fetch(
      `${PICKABOO_API_URL}/api/pickaboo/agent-prompts?wallet=system`
    )

    if (!response.ok) {
      console.warn(`[Agent Prompt] Failed to fetch all prompts: ${response.status}`)
      return {}
    }

    const data = await response.json() as PromptResponse

    if (!data.success || !data.agent_prompts) {
      console.warn("[Agent Prompt] Invalid response format")
      return {}
    }

    const prompts: Record<string, string> = {}
    Object.entries(agentIdMap).forEach(([botAgent, pickabooAgent]) => {
      const config = data.agent_prompts![pickabooAgent]
      if (config?.current_prompt) {
        prompts[botAgent] = config.current_prompt
      }
    })

    console.log(`[Agent Prompt] Loaded prompts for ${Object.keys(prompts).length} agents`)
    return prompts
  } catch (error) {
    console.warn("[Agent Prompt] Error fetching all prompts:", error)
    return {}
  }
}