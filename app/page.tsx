"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { useEffect, useRef } from "react"

export default function HomePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const centerX = canvas.width / 2.2
    const centerY = canvas.height / 2
    const sphereRadius = 200
    let time = 0

    let animationFrameId: number
    const particles: Array<{
      x: number
      y: number
      vx: number
      vy: number
      size: number
      life: number
    }> = []

    const generateParticles = () => {
      for (let i = 0; i < 3; i++) {
        const angle = Math.random() * Math.PI * 2
        const distance = sphereRadius + Math.random() * 100
        particles.push({
          x: centerX + Math.cos(angle) * distance,
          y: centerY + Math.sin(angle) * distance,
          vx: Math.cos(angle) * (Math.random() - 0.5) * 2,
          vy: Math.sin(angle) * (Math.random() - 0.5) * 2,
          size: Math.random() * 2 + 1,
          life: 1,
        })
      }
    }

    const animate = () => {
      time += 0.01
      
      // Light background
      ctx.fillStyle = "rgba(255, 255, 255, 0.98)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Generate new particles
      if (Math.random() > 0.7) generateParticles()

      // Update and draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.life -= 0.01
        if (p.life <= 0) {
          particles.splice(i, 1)
          continue
        }

        p.x += p.vx
        p.y += p.vy
        p.vx *= 0.98

        // Particle glow - lighter colors for light background
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3)
        if (Math.random() > 0.5) {
          gradient.addColorStop(0, `rgba(100, 150, 220, ${p.life * 0.4})`)
          gradient.addColorStop(1, `rgba(100, 150, 220, 0)`)
        } else {
          gradient.addColorStop(0, `rgba(240, 100, 80, ${p.life * 0.4})`)
          gradient.addColorStop(1, `rgba(240, 100, 80, 0)`)
        }
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }

      // Draw glowing sphere
      const baseBlue = 100 + Math.sin(time) * 30
      const baseOrange = 150 + Math.cos(time * 0.7) * 50

      // Inner glow - lighter
      const innerGlow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, sphereRadius * 1.5)
      innerGlow.addColorStop(0, `rgba(100, 150, 220, 0.15)`)
      innerGlow.addColorStop(0.5, `rgba(${baseBlue}, ${baseBlue + 50}, 255, 0.08)`)
      innerGlow.addColorStop(1, `rgba(240, 100, 80, 0)`)
      ctx.fillStyle = innerGlow
      ctx.beginPath()
      ctx.arc(centerX, centerY, sphereRadius * 1.5, 0, Math.PI * 2)
      ctx.fill()

      // Sphere particle mesh
      for (let i = 0; i < 60; i++) {
        const angle = (i / 60) * Math.PI * 2 + time * 0.3
        const depth = Math.sin(time * 0.5 + i) * 0.5 + 0.5

        // Blue side particles
        if (angle < Math.PI) {
          const x = centerX + Math.cos(angle) * sphereRadius * (0.8 + depth * 0.2)
          const y = centerY + Math.sin(angle) * sphereRadius * (0.8 + depth * 0.2)
          const size = 1.5 + depth

          const grad = ctx.createRadialGradient(x, y, 0, x, y, size * 2)
          grad.addColorStop(0, `rgba(${baseBlue}, ${baseBlue + 50}, 255, ${(0.8 + depth * 0.2) * 0.5})`)
          grad.addColorStop(1, `rgba(${baseBlue}, ${baseBlue + 50}, 255, 0)`)
          ctx.fillStyle = grad
          ctx.beginPath()
          ctx.arc(x, y, size, 0, Math.PI * 2)
          ctx.fill()
        }

        // Orange side particles
        if (angle >= Math.PI) {
          const x = centerX + Math.cos(angle) * sphereRadius * (0.8 + depth * 0.2)
          const y = centerY + Math.sin(angle) * sphereRadius * (0.8 + depth * 0.2)
          const size = 1.5 + depth

          const grad = ctx.createRadialGradient(x, y, 0, x, y, size * 2)
          grad.addColorStop(0, `rgba(240, ${baseOrange}, 80, ${(0.8 + depth * 0.2) * 0.5})`)
          grad.addColorStop(1, `rgba(240, ${baseOrange}, 80, 0)`)
          ctx.fillStyle = grad
          ctx.beginPath()
          ctx.arc(x, y, size, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // Sphere outline
      ctx.strokeStyle = "rgba(100, 100, 100, 0.2)"
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(centerX, centerY, sphereRadius, 0, Math.PI * 2)
      ctx.stroke()

      // Animated rings
      for (let ring = 1; ring <= 3; ring++) {
        const ringRadius = sphereRadius * (1 + ring * 0.15)
        const rotationOffset = time * (0.1 / ring)
        
        ctx.strokeStyle = `rgba(100, 150, 220, ${(0.2 - ring * 0.05) * Math.abs(Math.sin(time))})`
        ctx.lineWidth = 1
        ctx.beginPath()
        
        for (let i = 0; i < 36; i++) {
          const angle = (i / 36) * Math.PI * 2 + rotationOffset
          const x = centerX + Math.cos(angle) * ringRadius
          const y = centerY + Math.sin(angle) * ringRadius
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.closePath()
        ctx.stroke()
      }

      animationFrameId = requestAnimationFrame(animate)
    }

    animate()

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    window.addEventListener("resize", handleResize)

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: "#ffffff" }}>
      <canvas ref={canvasRef} className="absolute inset-0 z-0" />

      <section className="relative z-10 min-h-screen flex items-center">
        <div className="w-full px-8 md:px-12 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center min-h-screen">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="z-20"
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.8 }}
                className="mb-12"
              >
                <h1 className="text-6xl md:text-7xl font-light text-gray-900 leading-tight tracking-tight" style={{ fontFamily: "'SF Mono', 'Monaco', monospace", letterSpacing: "0.05em" }}>
                  BNBForge
                </h1>
                <h1 className="text-3xl md:text-4xl font-light text-gray-600 mt-4 leading-tight" style={{ fontFamily: "'SF Mono', 'Monaco', monospace", letterSpacing: "0.05em" }}>
                  powered by Aster
                </h1>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.8 }}
                className="flex gap-6 flex-wrap"
              >
                <Button
                  size="lg"
                  asChild
                  className="clean-button-sparkling bg-black hover:bg-gray-800 text-white font-semibold rounded-none px-10 py-5 text-base transition-all"
                  style={{ fontFamily: "'SF Mono', 'Monaco', monospace", letterSpacing: "0.05em" }}
                >
                  <Link href="/dashboard" className="flex items-center gap-3">
                    Launch Neurals <ArrowRight className="w-5 h-5" style={{ transform: "scaleX(1.3)" }} />
                  </Link>
                </Button>
              </motion.div>
            </motion.div>

            {/* Right - Canvas area (sphere) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 1, ease: "easeOut" }}
              className="hidden md:flex items-center justify-center"
            >
              <div className="absolute inset-0 md:relative" style={{ height: "100vh", pointerEvents: "none" }} />
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  )
}
