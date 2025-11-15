"use client"

import { ArrowRight, Twitter, Mail } from "lucide-react"
import Link from "next/link"

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-200 px-4 md:px-8 py-4">
        <div className="max-w-6xl mx-auto">
          <Link href="/" className="text-2xl font-light" style={{ fontFamily: "'SF Mono', 'Monaco', monospace" }}>
            BNBForge
          </Link>
        </div>
      </header>

      {/* Main Content - Centered */}
      <section className="flex-1 px-4 md:px-8 py-16 md:py-24">
        <div className="max-w-3xl mx-auto">
          {/* Logo */}
          <div className="text-center mb-16">
            <div className="inline-block border-2 border-black px-4 py-2 mb-8">
              <span className="text-lg font-light" style={{ fontFamily: "'SF Mono', 'Monaco', monospace" }}>
                BNBForge
              </span>
            </div>
          </div>

          {/* About Text */}
          <div className="space-y-8 text-gray-700 text-lg leading-relaxed">
            <p>
              It all started with @mightblowyourmind replyinng "This is Cool"
            </p>

            <p>
              A decade ago, DeepMind revolutionized AI research and BNB founders revolutionized crypto. 
            </p>

            <p>
              CZ you're the REALEST; youve inspired alot of us THANK YOU. 
            </p>

            <p>
              At BNBForge, we believe financial markets are the best training environment for the next era of AI. They are the ultimate world-modeling engine and the only benchmark that gets harder as AI gets smarter.
            </p>
            
            <p>
              Instead of games, we're using markets to train new base models that create their own training data indefinitely. We're using techniques like open-ended learning and large-scale RL to handle the complexity of markets, the final boss.
            </p>
            
            <p>
              "Here's to the crazy ones, the misfits, the rebels, the troublemakers, the round pegs in the square holes
            </p>
            
            <p>
              If you're excited like me, join the herd lets build for the real world.
            </p>

            {/* Quote */}
            <div className="my-12 text-center border-t border-b border-gray-300 py-8">
              <p className="italic text-gray-600">
                "Capital allocation is the discipline through which intelligence converges with truth."
              </p>
            </div>


          </div>

          {/* Links */}
          <div className="mt-16 pt-12 border-t border-gray-200 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12">
            <Link 
              href="https://x.com/Yen11x"
              target="_blank"
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
              style={{ fontFamily: "'SF Mono', 'Monaco', monospace" }}
            >
              <Twitter className="w-5 h-5" />
              Contact Us
            </Link>
            <Link 
              href="mailto:trinitygoodwill11@gmail.com"
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
              style={{ fontFamily: "'SF Mono', 'Monaco', monospace" }}
            >
              <Mail className="w-5 h-5" />
              Email
            </Link>
          </div>

          {/* CTA */}
          <div className="mt-12 text-center">
            <Link 
              href="/dashboard"
              className="inline-flex items-center gap-2 bg-black text-white hover:bg-gray-800 transition-colors font-light px-8 py-3 rounded"
              style={{ fontFamily: "'SF Mono', 'Monaco', monospace" }}
            >
              VIEW DASHBOARD <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 px-4 md:px-8 py-8">
        <div className="max-w-6xl mx-auto text-center text-gray-500 text-sm" style={{ fontFamily: "'SF Mono', 'Monaco', monospace" }}>
          <p>© 2025 BNBForge. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}