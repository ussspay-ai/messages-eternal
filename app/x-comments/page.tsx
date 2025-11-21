"use client"

import { useEffect, useRef, useState } from "react"
import { Header } from "@/components/header"
import Link from "next/link"
import Image from "next/image"

interface Star {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
}

interface DiscordMessage {
  id: string
  author: {
    id: string
    username: string
    avatar: string
  }
  content: string
  embeds: Array<{
    title?: string
    description?: string
    image?: string
    url?: string
    video?: string
    type?: string
  }>
  timestamp: string
  attachments: Array<{
    url: string
    filename: string
    isImage: boolean
    isVideo: boolean
  }>
  messageLink: string
}

export default function XCommentsPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const starsRef = useRef<Star[]>([])
  const animationIdRef = useRef<number | null>(null)
  const [messages, setMessages] = useState<DiscordMessage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    const initStars = () => {
      starsRef.current = []
      const starCount = Math.floor((canvas.width * canvas.height) / 15000)

      for (let i = 0; i < starCount; i++) {
        starsRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          size: Math.random() * 1.5,
          opacity: Math.random() * 0.7 + 0.3,
        })
      }
    }

    initStars()

    const animateStars = () => {
      ctx.fillStyle = "#f5f5f0"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      starsRef.current.forEach((star) => {
        star.x += star.vx
        star.y += star.vy

        if (star.x < 0) star.x = canvas.width
        if (star.x > canvas.width) star.x = 0
        if (star.y < 0) star.y = canvas.height
        if (star.y > canvas.height) star.y = 0

        ctx.fillStyle = `rgba(0, 113, 227, ${star.opacity})`
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2)
        ctx.fill()
      })

      animationIdRef.current = requestAnimationFrame(animateStars)
    }

    animateStars()

    return () => {
      window.removeEventListener("resize", resizeCanvas)
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const discordApiUrl = process.env.NEXT_PUBLIC_DISCORD_API_URL || "/api/discord/messages"
    const endpoint = `${discordApiUrl}?limit=50`

    fetch(endpoint)
      .then((res) => res.json())
      .then((data) => {
        setMessages(data.messages || [])
        setLoading(false)
      })
      .catch((err) => {
        console.error("Failed to fetch Discord messages:", err)
        setLoading(false)
      })
  }, [])

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const stripLinks = (content: string) => {
    return content.replace(/https?:\/\/[^\s]+/g, "").trim()
  }

  return (
    <div className="min-h-screen bg-[#f5f5f0] relative overflow-hidden">
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 0 }}
      />

      <div className="relative z-20">
        <Header />

        <main className="max-w-[1400px] mx-auto px-6 py-8">
          <div className="mb-6">
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-white border-2 border-black text-xs font-mono hover:bg-gray-100 inline-block"
            >
              ← [LIVE CHART]
            </Link>
          </div>

          <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-8 mb-6">
            <h1 className="font-bold font-mono text-2xl mb-2">X COMMENTS</h1>
            <p className="text-xs font-mono text-gray-600">
              Live community messages from Discord • Oh-Chim channel
            </p>
          </div>

          <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-8">
            {loading ? (
              <div className="text-center py-12 text-xs font-mono text-gray-600">
                Loading messages...
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12 text-xs font-mono text-gray-600">
                No messages found
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <a
                    key={message.id}
                    href={message.messageLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block border-l-2 border-blue-500 pl-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start gap-3 mb-2">
                      <Image
                        src={message.author.avatar}
                        alt={message.author.username}
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">
                            {message.author.username}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatTimestamp(message.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-800 mt-2 break-words whitespace-pre-wrap">
                          {stripLinks(message.content)}
                        </p>

                        {message.embeds.length > 0 && (
                          <div className="mt-3 space-y-3">
                            {message.embeds.map((embed, idx) => (
                              <div
                                key={idx}
                                className="border border-gray-300 rounded-lg overflow-hidden"
                                onClick={(e) => e.preventDefault()}
                              >
                                {embed.video && (
                                  <video
                                    src={embed.video}
                                    controls
                                    className="w-full max-h-96 bg-black"
                                  />
                                )}
                                {embed.image && !embed.video && (
                                  <img
                                    src={embed.image}
                                    alt={embed.title || "Embed"}
                                    className="w-full max-h-96 object-cover"
                                  />
                                )}
                                {(embed.title || embed.description) && (
                                  <div className="p-3 bg-gray-50">
                                    {embed.title && (
                                      <h4 className="font-bold text-sm text-gray-900">
                                        {embed.title}
                                      </h4>
                                    )}
                                    {embed.description && (
                                      <p className="text-xs text-gray-700 mt-1">
                                        {embed.description}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {message.attachments.length > 0 && (
                          <div className="mt-3 space-y-3">
                            {message.attachments.map((attachment, idx) =>
                              attachment.isImage ? (
                                <div
                                  key={idx}
                                  className="mt-2"
                                  onClick={(e) => e.preventDefault()}
                                >
                                  <img
                                    src={attachment.url}
                                    alt={attachment.filename}
                                    className="max-w-sm rounded-lg border border-gray-200"
                                  />
                                </div>
                              ) : attachment.isVideo ? (
                                <div
                                  key={idx}
                                  className="mt-2"
                                  onClick={(e) => e.preventDefault()}
                                >
                                  <video
                                    src={attachment.url}
                                    controls
                                    className="max-w-sm rounded-lg border border-gray-200 bg-black"
                                  />
                                </div>
                              ) : (
                                <a
                                  key={idx}
                                  href={attachment.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.preventDefault()}
                                  className="text-blue-600 text-xs hover:underline block"
                                >
                                  📎 {attachment.filename}
                                </a>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
