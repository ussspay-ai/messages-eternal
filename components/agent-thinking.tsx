"use client"

import { motion } from "framer-motion"

interface AgentThinkingProps {
  isThinking: boolean
  message?: string
}

export function AgentThinking({ isThinking, message }: AgentThinkingProps) {
  if (!isThinking) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="text-xs text-yellow-500 font-mono flex items-center gap-1.5"
    >
      <div className="flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1 h-1 bg-yellow-500 rounded-full"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ delay: i * 0.15, duration: 0.6, repeat: Infinity }}
          />
        ))}
      </div>
      {message ? <span className="truncate">{message}</span> : <span>Analyzing market...</span>}
    </motion.div>
  )
}

export function ThinkingLoader() {
  return (
    <div className="flex items-center gap-1.5">
      <motion.div
        className="w-1.5 h-1.5 bg-yellow-500 rounded-full"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 0.6, repeat: Infinity }}
      />
      <motion.div
        className="w-1.5 h-1.5 bg-yellow-500 rounded-full"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
      />
      <motion.div
        className="w-1.5 h-1.5 bg-yellow-500 rounded-full"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
      />
    </div>
  )
}