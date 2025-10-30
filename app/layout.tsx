import type React from "react"
import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

export const metadata: Metadata = {
  title: "BNBForge - Autonomous Trading Agents",
  description: "Live multi-agent trading platform powered by Aster API",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/favicon.svg",
        type: "image/svg+xml",
      },
      {
        url: "/aster-icon.png",
        sizes: "32x32",
        type: "image/png",
      },
    ],
    shortcut: "/aster-icon.png",
    apple: "/aster-icon.png",
  },
  openGraph: {
    title: "BNBForge - Autonomous Trading Agents",
    description: "Live multi-agent trading platform powered by Aster DEX API",
    type: "website",
    images: [
      {
        url: "/favicon.svg",
        width: 1070,
        height: 284,
        alt: "Aster Logo",
      },
    ],
  },
  other: {
    "theme-color": "#1a1a1a",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Space+Mono:wght@400;700&family=JetBrains+Mono:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
