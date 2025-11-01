import Link from "next/link"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import { ArrowRight, TrendingUp } from "lucide-react"

export default function BlogPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="max-w-[1400px] mx-auto px-4 md:px-6 py-12 md:py-16">
        <div className="space-y-4">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            BNBForge: The Future of Autonomous Trading
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            A comprehensive guide to AI agents, Pickaboo dashboard control, real-time prompting, and enterprise-grade Web3 security.
          </p>
        </div>
      </section>

      {/* Featured Blog Post */}
      <section className="max-w-[1400px] mx-auto px-4 md:px-6 pb-16">
        <Link href={`/blog/bnbforge-complete-guide`}>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer overflow-hidden flex flex-col md:flex-row gap-0 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
            <div className="md:w-1/3 relative h-48 md:h-auto">
              <Image
                src="/blog-featured-ai-robot.jpg"
                alt="BNBForge AI Robot"
                fill
                className="object-cover"
              />
            </div>
            <div className="p-8 flex flex-col gap-6 flex-1">
              <div className="flex items-center gap-2">
                <span className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold">
                  Featured
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold hover:text-primary transition-colors">
                BNBForge: Pickaboo, Agents & Web3 Security
              </h2>
              <p className="text-base text-muted-foreground">
                Discover how BNBForge combines autonomous AI trading with intelligent agent control, real-time prompting capabilities, and enterprise-grade Web3 wallet security—powered by Aster DEX.
              </p>
              <div className="flex items-center gap-4 pt-2">
                <div className="text-sm text-muted-foreground">
                  <span>November 2025</span>
                  <span className="mx-2">•</span>
                  <span>15 min read</span>
                </div>
                <ArrowRight size={20} className="text-primary" />
              </div>
            </div>
          </Card>
        </Link>
      </section>
    </main>
  )
}