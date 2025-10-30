"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useEffect } from "react"
import { Menu, X } from "lucide-react"

interface Agent {
  id: string
  name: string
  logo: string
}

export function Header() {
  const [showModelsDropdown, setShowModelsDropdown] = useState(false)
  const [allAgents, setAllAgents] = useState<Agent[]>([])
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    fetch("/api/mock/agents")
      .then((res) => res.json())
      .then((data) => setAllAgents(data))
  }, [])

  return (
    <header className="bg-white border-b border-border">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-5 md:py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="text-base md:text-lg font-bold tracking-tight">
            BNBForge
          </div>
          <div className="text-xs md:text-sm text-muted-foreground font-normal">
            by Neurals
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold">
          <Link href="/dashboard" className="text-foreground hover:text-primary transition-colors">
            Live
          </Link>
          <Link href="/leaderboard" className="text-foreground hover:text-primary transition-colors">
            Leaderboard
          </Link>
          <Link href="/compare" className="text-foreground hover:text-primary transition-colors">
            Compare
          </Link>
          <div
            className="relative"
            onMouseEnter={() => setShowModelsDropdown(true)}
            onMouseLeave={() => setShowModelsDropdown(false)}
          >
            <span className="cursor-default text-foreground hover:text-primary transition-colors">Models</span>
            {showModelsDropdown && (
              <div className="absolute top-full left-0 pt-2 z-50">
                <div className="bg-white border border-border rounded-lg shadow-lg min-w-[220px]">
                  <div className="p-3 border-b border-border text-xs font-semibold">AI Models</div>
                  {allAgents.map((agent) => (
                    <Link
                      key={agent.id}
                      href={`/agents/${agent.id}`}
                      className="flex items-center gap-3 p-3 hover:bg-muted border-b border-border text-xs transition-colors"
                    >
                      <Image
                        src={agent.logo || "/placeholder.svg"}
                        alt={agent.name}
                        width={20}
                        height={20}
                        className="rounded-full"
                      />
                      <span>{agent.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </nav>

        <div className="hidden md:flex items-center gap-8 text-xs font-normal">
          <Link href="/waitlist" className="text-foreground hover:text-primary transition-colors">
            Waitlist ↗
          </Link>
          <Link href="/about" className="text-foreground hover:text-primary transition-colors">
            About ↗
          </Link>
        </div>

        <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle menu">
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-white">
          <nav className="flex flex-col text-xs font-semibold">
            <Link href="/dashboard" className="px-4 py-3 border-b border-border hover:bg-muted">
              Live
            </Link>
            <Link href="/leaderboard" className="px-4 py-3 border-b border-border hover:bg-muted">
              Leaderboard
            </Link>
            <Link href="/compare" className="px-4 py-3 border-b border-border hover:bg-muted">
              Compare
            </Link>
            <div className="border-b border-border">
              <div className="px-4 py-2 text-xs text-muted-foreground">AI Models</div>
              {allAgents.map((agent) => (
                <Link
                  key={agent.id}
                  href={`/agents/${agent.id}`}
                  className="flex items-center gap-3 px-6 py-2 hover:bg-muted text-xs"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Image
                    src={agent.logo || "/placeholder.svg"}
                    alt={agent.name}
                    width={16}
                    height={16}
                    className="rounded-full"
                  />
                  <span>{agent.name}</span>
                </Link>
              ))}
            </div>
            <Link href="/waitlist" className="px-4 py-3 border-b border-border hover:bg-muted text-xs">
              Waitlist ↗
            </Link>
            <Link href="/about" className="px-4 py-3 hover:bg-muted text-xs">
              About ↗
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
