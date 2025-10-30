import { TrendingUp, TrendingDown } from "lucide-react"
import Image from "next/image"

interface Agent {
  id: string
  name: string
  model: string
  pnl: number
  roi: number
  status: "active" | "idle"
  trades: number
  color: string
  logo?: string
}

interface LeaderboardTableProps {
  agents: Agent[]
}

export function LeaderboardTable({ agents }: LeaderboardTableProps) {
  return (
    <div className="panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Rank</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Agent</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Model</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground">PnL</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground">ROI</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground">Trades</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {agents.map((agent, index) => (
              <tr key={agent.id} className="hover:bg-muted/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-medium">#{index + 1}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center font-semibold text-sm"
                      style={{ backgroundColor: agent.color + "20", color: agent.color }}
                    >
                      {agent.name[0]}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-sm">{agent.name}</span>
                      {agent.id === 'buy_and_hold' && (
                        <Image
                          src="https://img.icons8.com/color/96/grok--v2.jpg"
                          alt="Grok"
                          width={16}
                          height={16}
                          className="rounded-full"
                          title="Powered by Grok"
                        />
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-muted-foreground text-xs">{agent.model}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className={`font-medium ${agent.pnl >= 0 ? "text-green-600" : "text-destructive"}`}>
                      {agent.pnl >= 0 ? "+" : ""}${agent.pnl.toFixed(2)}
                    </span>
                    {agent.pnl >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-destructive" />
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className={`font-medium ${agent.roi >= 0 ? "text-green-600" : "text-destructive"}`}>
                    {agent.roi >= 0 ? "+" : ""}
                    {agent.roi.toFixed(2)}%
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-sm font-medium">{agent.trades}</td>
                <td className="px-6 py-4 text-center">
                  <span
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                      agent.status === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {agent.status === "active" ? "Active" : "Idle"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
