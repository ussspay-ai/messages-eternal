"use client"

import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Zap, TrendingUp, TrendingDown } from "lucide-react"
import type { BattleResult } from "@/lib/agent-battle"
import { getAllAgents } from "@/lib/constants/agents"

type BattleScenario = "crash" | "pump" | "sideways" | "volatility" | "flash_crash"

const SCENARIOS: Record<BattleScenario, { label: string; emoji: string; description: string }> = {
  crash: {
    label: "Market Crash",
    emoji: "💥",
    description: "15% sudden drop - how do agents respond?",
  },
  pump: { label: "Market Pump", emoji: "🚀", description: "20% explosive rally incoming" },
  sideways: {
    label: "Sideways Market",
    emoji: "➡️",
    description: "Choppy 2% range - capitalize on noise",
  },
  volatility: {
    label: "Extreme Volatility",
    emoji: "⚡",
    description: "±15% wild swings - opportunity or danger?",
  },
  flash_crash: {
    label: "Flash Crash",
    emoji: "⚠️",
    description: "25% instant drop - is it a trap?",
  },
}

export function AgentBattleArena() {
  const agents = getAllAgents()
  const [selectedAgent1, setSelectedAgent1] = useState<string | null>(agents[0]?.id || null)
  const [selectedAgent2, setSelectedAgent2] = useState<string | null>(agents[1]?.id || null)
  const [selectedScenario, setSelectedScenario] = useState<BattleScenario>("crash")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<BattleResult | null>(null)

  const handleStartBattle = async () => {
    if (!selectedAgent1 || !selectedAgent2) {
      alert("Please select both agents")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/aster/battle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent1Id: selectedAgent1,
          agent2Id: selectedAgent2,
          scenario: selectedScenario,
        }),
      })

      if (!response.ok) throw new Error("Battle failed")
      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error("Battle error:", error)
      alert("Battle failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const getStanceColor = (stance: string) => {
    switch (stance) {
      case "bullish":
        return "text-green-500"
      case "bearish":
        return "text-red-500"
      default:
        return "text-yellow-500"
    }
  }

  const getStanceIcon = (stance: string) => {
    switch (stance) {
      case "bullish":
        return <TrendingUp className="w-4 h-4" />
      case "bearish":
        return <TrendingDown className="w-4 h-4" />
      default:
        return <Zap className="w-4 h-4" />
    }
  }

  if (result) {
    const winner = result.winnerId === result.agent1Id ? 1 : 2
    const agent1 = agents.find((a) => a.id === result.agent1Id)
    const agent2 = agents.find((a) => a.id === result.agent2Id)

    return (
      <div className="w-full space-y-6">
        {/* Scenario */}
        <Card className="bg-gradient-to-r from-blue-900/10 to-purple-900/10 border-blue-500/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <span className="text-4xl">
                {SCENARIOS[result.scenario as BattleScenario]?.emoji}
              </span>
              <div>
                <CardTitle>{SCENARIOS[result.scenario as BattleScenario]?.label}</CardTitle>
                <CardDescription>{result.scenarioDescription}</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Battle Results */}
        <div className="grid grid-cols-2 gap-4">
          {/* Agent 1 */}
          <Card
            className={`border-2 ${
              winner === 1 ? "border-green-500/50 bg-green-500/5" : "border-gray-500/20"
            }`}
          >
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{result.agent1Name}</CardTitle>
                  <CardDescription>{agent1?.model}</CardDescription>
                </div>
                {winner === 1 && (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                    🏆 WINNER
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Stance */}
              <div className="space-y-2">
                <div className="text-sm font-semibold text-gray-400">STANCE</div>
                <div className="flex items-center gap-2">
                  <span className={`capitalize font-bold ${getStanceColor(result.agent1StanceDirection)}`}>
                    {getStanceIcon(result.agent1StanceDirection)}
                    {result.agent1StanceDirection}
                  </span>
                  <Badge variant="outline">
                    Confidence: {result.agent1Confidence}%
                  </Badge>
                </div>
              </div>

              {/* Confidence Bar */}
              <div className="space-y-2">
                <div className="text-sm font-semibold text-gray-400">CONVICTION</div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${result.agent1Confidence}%` }}
                  />
                </div>
              </div>

              {/* Decision */}
              <div className="space-y-2">
                <div className="text-sm font-semibold text-gray-400">DECISION</div>
                <p className="text-sm text-gray-300 leading-relaxed">
                  {result.agent1Decision}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Agent 2 */}
          <Card
            className={`border-2 ${
              winner === 2 ? "border-green-500/50 bg-green-500/5" : "border-gray-500/20"
            }`}
          >
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{result.agent2Name}</CardTitle>
                  <CardDescription>{agent2?.model}</CardDescription>
                </div>
                {winner === 2 && (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                    🏆 WINNER
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Stance */}
              <div className="space-y-2">
                <div className="text-sm font-semibold text-gray-400">STANCE</div>
                <div className="flex items-center gap-2">
                  <span className={`capitalize font-bold ${getStanceColor(result.agent2StanceDirection)}`}>
                    {getStanceIcon(result.agent2StanceDirection)}
                    {result.agent2StanceDirection}
                  </span>
                  <Badge variant="outline">
                    Confidence: {result.agent2Confidence}%
                  </Badge>
                </div>
              </div>

              {/* Confidence Bar */}
              <div className="space-y-2">
                <div className="text-sm font-semibold text-gray-400">CONVICTION</div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${result.agent2Confidence}%` }}
                  />
                </div>
              </div>

              {/* Decision */}
              <div className="space-y-2">
                <div className="text-sm font-semibold text-gray-400">DECISION</div>
                <p className="text-sm text-gray-300 leading-relaxed">
                  {result.agent2Decision}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Winner Card */}
        <Card className="border-2 border-green-500/50 bg-gradient-to-r from-green-500/10 to-emerald-500/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-3xl">🏆</span>
              {result.winnerName} Wins!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-lg font-semibold text-green-400">{result.winReason}</div>
            <div className="text-sm text-gray-400">
              Consensus Level: <span className="text-white">{result.consensusLevel}%</span>
              <div className="w-full bg-gray-800 rounded-full h-2 mt-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${result.consensusLevel}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button onClick={() => setResult(null)} variant="outline" className="flex-1">
            ← Back to Arena
          </Button>
          <Button
            onClick={handleStartBattle}
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Run Another Battle
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      {/* Title */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">⚔️ Agent Battle Arena</h1>
        <p className="text-gray-400">Watch AI agents duel in real-time market scenarios</p>
      </div>

      {/* Battle Setup */}
      <div className="grid grid-cols-2 gap-6">
        {/* Agent 1 Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Agent 1</CardTitle>
            <CardDescription>Select first combatant</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {agents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => setSelectedAgent1(agent.id)}
                className={`w-full p-3 rounded-lg text-left transition-all border-2 ${
                  selectedAgent1 === agent.id
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-gray-700 hover:border-gray-600"
                }`}
              >
                <div className="font-semibold">{agent.name}</div>
                <div className="text-sm text-gray-400">{agent.model}</div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Agent 2 Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Agent 2</CardTitle>
            <CardDescription>Select second combatant</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {agents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => setSelectedAgent2(agent.id)}
                disabled={agent.id === selectedAgent1}
                className={`w-full p-3 rounded-lg text-left transition-all border-2 ${
                  selectedAgent2 === agent.id
                    ? "border-purple-500 bg-purple-500/10"
                    : agent.id === selectedAgent1
                      ? "border-gray-800 bg-gray-900/50 opacity-50 cursor-not-allowed"
                      : "border-gray-700 hover:border-gray-600"
                }`}
              >
                <div className="font-semibold">{agent.name}</div>
                <div className="text-sm text-gray-400">{agent.model}</div>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Scenario Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Market Scenario</CardTitle>
          <CardDescription>Choose the market condition for this battle</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {(Object.entries(SCENARIOS) as Array<[BattleScenario, any]>).map(
            ([scenario, { emoji, label }]) => (
              <button
                key={scenario}
                onClick={() => setSelectedScenario(scenario)}
                className={`p-3 rounded-lg text-center transition-all border-2 ${
                  selectedScenario === scenario
                    ? "border-green-500 bg-green-500/10"
                    : "border-gray-700 hover:border-gray-600"
                }`}
              >
                <div className="text-2xl mb-1">{emoji}</div>
                <div className="text-xs font-semibold">{label}</div>
              </button>
            )
          )}
        </CardContent>
      </Card>

      {/* Start Battle Button */}
      <Button
        onClick={handleStartBattle}
        disabled={loading || !selectedAgent1 || !selectedAgent2}
        size="lg"
        className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-lg h-12"
      >
        {loading && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
        {loading ? "Battle in Progress..." : "⚔️ START BATTLE"}
      </Button>

      {/* How It Works */}
      <Card className="border-gray-700 bg-gray-900/50">
        <CardHeader>
          <CardTitle className="text-sm">How It Works</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-400 space-y-2">
          <p>
            🎮 Pick two agents and a market scenario. Both agents receive the same market
            conditions and must decide their trading strategy.
          </p>
          <p>
            🤖 Each agent calls its LLM API (Claude, GPT-4, Gemini, DeepSeek) to generate a
            real decision with reasoning.
          </p>
          <p>
            🏆 Winner is determined by decision quality, confidence level, and how well their
            stance fits the scenario.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}