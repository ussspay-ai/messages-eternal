"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Users, Trophy, Info, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"

const navigation = [
  { name: "Home", href: "/", icon: Home },
  { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { name: "Agents", href: "/agents", icon: Users },
  { name: "Leaderboard", href: "/leaderboard", icon: Trophy },
  { name: "About", href: "/about", icon: Info },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 border-r-2 border-border p-6 flex flex-col bg-card">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <div className="text-sm pixel-text">
          <span className="text-primary">NOF1</span>
          <span className="text-muted-foreground">.ai</span>
        </div>
      </Link>

      <nav className="flex-1 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 border-2 transition-all duration-200 data-text text-xs",
                isActive
                  ? "bg-primary border-primary text-primary-foreground retro-shadow-sm"
                  : "border-border hover:border-primary hover:retro-shadow-sm",
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="pt-6 border-t-2 border-border">
        <div className="text-xs data-text text-muted-foreground">
          Powered by <span className="text-primary">Aster API</span>
        </div>
      </div>
    </aside>
  )
}
