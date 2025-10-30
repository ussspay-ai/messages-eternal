/**
 * Hook for consuming real-time agent data via Server-Sent Events
 */

import { useEffect, useState, useRef, useCallback } from "react"

interface AgentUpdate {
  id: string
  name: string
  account_value: number
  roi: number
  pnl: number
  total_pnl: number
  open_positions: number
  timestamp: string
}

interface UseRealtimeAgentsReturn {
  agents: AgentUpdate[]
  isConnected: boolean
  error: string | null
}

export function useRealtimeAgents(): UseRealtimeAgentsReturn {
  const [agents, setAgents] = useState<AgentUpdate[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  const connect = useCallback(() => {
    try {
      // Check if browser supports EventSource
      if (typeof EventSource === "undefined") {
        setError("Your browser does not support Server-Sent Events")
        return
      }

      const eventSource = new EventSource("/api/realtime/agents")

      eventSource.onopen = () => {
        setIsConnected(true)
        setError(null)
      }

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as AgentUpdate[]
          setAgents(data)
        } catch (e) {
          console.error("Error parsing SSE data:", e)
        }
      }

      eventSource.onerror = () => {
        setIsConnected(false)
        setError("Lost connection to real-time updates")
        eventSource.close()
        // Attempt reconnect after 3 seconds
        setTimeout(() => connect(), 3000)
      }

      eventSourceRef.current = eventSource
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect")
    }
  }, [])

  useEffect(() => {
    connect()

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
  }, [connect])

  return {
    agents,
    isConnected,
    error,
  }
}

/**
 * Fallback hook for polling-based updates (for browsers without SSE support)
 */
interface UsePollAgentsReturn {
  agents: AgentUpdate[]
  isLoading: boolean
  error: string | null
}

export function usePollAgents(interval: number = 5000): UsePollAgentsReturn {
  const [agents, setAgents] = useState<AgentUpdate[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const response = await fetch("/api/aster/agents-data")

        if (!response.ok) {
          throw new Error("Failed to fetch agents data")
        }

        const data = await response.json()
        setAgents(data.agents)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch agents")
      } finally {
        setIsLoading(false)
      }
    }

    // Fetch immediately
    fetchData()

    // Set up interval
    const intervalId = setInterval(fetchData, interval)

    return () => clearInterval(intervalId)
  }, [interval])

  return {
    agents,
    isLoading,
    error,
  }
}