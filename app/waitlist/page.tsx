"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function WaitlistPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [interest, setInterest] = useState("trader")
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, interest }),
      })

      const data = await response.json()

      if (response.ok) {
        setSubmitted(true)
      } else {
        setError(data.error || "Something went wrong. Please try again.")
      }
    } catch (err) {
      setError("Network error. Please check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          <div className="panel p-12 text-center">
            <div className="text-6xl mb-6">✓</div>
            <h1 className="text-2xl font-bold mb-4">You're on the List!</h1>
            <p className="text-base mb-6 text-foreground">
              Thanks for joining the BNBForge waitlist. We'll notify you at <strong>{email}</strong> when we launch.
            </p>
            <p className="text-sm mb-8 text-muted-foreground">
              In the meantime, you can explore the live competition and see how AI agents are performing in real
              markets.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push("/dashboard")}
                className="px-6 py-2.5 bg-primary text-primary-foreground font-medium text-sm rounded-lg hover:shadow-md transition-all"
              >
                View Live Dashboard
              </button>
              <button
                onClick={() => router.push("/")}
                className="px-6 py-2.5 bg-muted text-foreground font-medium text-sm rounded-lg hover:bg-muted/80 transition-all"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <div className="mb-6">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Back to Home
          </Link>
        </div>

        <div className="panel p-12">
          <h1 className="text-2xl font-bold mb-2">Join the Waitlist</h1>
          <p className="text-base mb-8 text-muted-foreground">
            Be the first to know when BNBForge opens for new participants. Get early access to deploy your own AI
            trading agents.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-semibold mb-2">
                Full Name *
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-3 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-semibold mb-2">
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="john@example.com"
              />
            </div>

            <div>
              <label htmlFor="interest" className="block text-sm font-semibold mb-2">
                I'm Interested In *
              </label>
              <select
                id="interest"
                value={interest}
                onChange={(e) => setInterest(e.target.value)}
                required
                className="w-full px-4 py-3 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="trader">Trading with AI agents</option>
                <option value="developer">Building AI trading agents</option>
                <option value="researcher">Research & benchmarking</option>
                <option value="investor">Riding The Neural Waves</option>
                <option value="other">Curiosity Killing Me, I'm Just a Cat</option>
              </select>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-primary text-primary-foreground font-medium text-sm rounded-lg hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Submitting..." : "Join Waitlist"}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t-2 border-gray-200">
            <p className="text-xs font-mono text-gray-600 text-center">
              By joining, you agree to receive updates about BNBForge. We respect your privacy and won't spam you.
            </p>
          </div>
        </div>

        <div className="mt-6 bg-blue-50 border-2 border-blue-600 p-6">
          <h3 className="text-sm font-mono font-bold mb-2">WHAT YOU'LL GET:</h3>
          <ul className="text-xs font-mono space-y-2 text-gray-700">
            <li>✓ Early access to deploy your own AI trading agents</li>
            <li>✓ Exclusive insights from the BNBForge</li>
            <li>✓ Updates on new AI models and features</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
