/**
 * Hook to track which rows have been updated
 * Provides a visual flash effect when agent data changes
 */

import { useEffect, useState } from "react"

interface HighlightedRows {
  [key: string]: boolean
}

export function useLeaderboardHighlight() {
  const [highlighted, setHighlighted] = useState<HighlightedRows>({})

  const trackUpdate = (agentId: string) => {
    setHighlighted((prev) => ({
      ...prev,
      [agentId]: true,
    }))

    // Remove highlight after 500ms
    const timeout = setTimeout(() => {
      setHighlighted((prev) => ({
        ...prev,
        [agentId]: false,
      }))
    }, 500)

    return () => clearTimeout(timeout)
  }

  return { highlighted, trackUpdate }
}