interface TradeStatsProps {
  label: string
  value: string
  positive?: boolean
}

export function TradeStats({ label, value, positive }: TradeStatsProps) {
  return (
    <div className="panel retro-shadow p-6">
      <div className="text-[11px] text-muted-foreground mb-2 data-text">{label}</div>
      <div
        className={`text-sm font-semibold data-text ${
          positive === undefined ? "" : positive ? "text-pastel-mint" : "text-destructive"
        }`}
      >
        {value}
      </div>
    </div>
  )
}
