/**
 * Redis Cache Client
 * Handles caching of Aster API responses to reduce rate limiting and improve performance
 * Falls back to no-op if Redis is unavailable (e.g., on Vercel)
 */

import { createClient } from "redis"

type RedisClient = ReturnType<typeof createClient> | null

let client: RedisClient = null
let connectionAttempted = false
let connectionFailed = false

/**
 * Get or create Redis client
 * Returns null if Redis is unavailable (graceful degradation)
 */
export async function getRedisClient(): Promise<RedisClient> {
  // If Redis is disabled or connection already failed, return null
  if (connectionFailed) return null
  if (client) return client

  // Skip if no REDIS_URL configured
  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) {
    connectionFailed = true
    console.log("ℹ️ Redis disabled - caching not available")
    return null
  }

  try {
    client = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 3000, // 3 second timeout
        reconnectStrategy: () => false, // Don't auto-reconnect
      },
    })

    client.on("error", (err) => {
      console.error("Redis Client Error", err)
      connectionFailed = true
      client = null
    })

    if (!client.isOpen) {
      await client.connect()
    }

    console.log("✅ Redis connected successfully")
    return client
  } catch (error) {
    connectionFailed = true
    client = null
    console.warn("⚠️ Redis connection failed, running without cache:", error instanceof Error ? error.message : error)
    return null
  }
}

/**
 * Cache keys
 */
export const CACHE_KEYS = {
  // Agent data
  agent: (agentId: string) => `agent:${agentId}`,
  agents: () => "agents:all",

  // Account data
  accountInfo: (agentId: string) => `account:info:${agentId}`,
  positions: (agentId: string) => `positions:${agentId}`,
  trades: (agentId: string, limit?: number) => `trades:${agentId}:${limit || 500}`,
  orders: (agentId: string) => `orders:${agentId}`,

  // Market data
  marketPrice: (symbol: string) => `market:price:${symbol}`,
  marketPrices: () => "market:prices:all",
  market: (key: string) => `market:${key}`,

  // Aggregated data
  leaderboard: () => "leaderboard",
  dashboard: () => "dashboard",
  accountHistory: () => "account:history",
  realtime_agents: () => "realtime:agents",
  agentMetrics: (agentId: string) => `metrics:${agentId}`,
  riskMetrics: (agentId: string, period: string = "30D") => `risk_metrics:${agentId}:${period}`,

  // Agent learning & optimization
  agentParameters: (agentId: string) => `agent_params:${agentId}`,
  agentOptimization: () => "optimization:results",
  learningHistory: (agentId: string) => `learning:history:${agentId}`,

  // WebSocket
  listenKey: (agentId: string) => `ws:listenkey:${agentId}`,
}

export interface CacheOptions {
  ttl?: number // Time to live in seconds
}

/**
 * Set cache value
 */
export async function setCache(
  key: string,
  value: any,
  options: CacheOptions = {}
): Promise<void> {
  const redis = await getRedisClient()
  
  // If Redis not available, silently skip caching
  if (!redis) return

  const ttl = options.ttl || 300 // Default 5 minutes

  try {
    await redis.setEx(key, ttl, JSON.stringify(value))
  } catch (error) {
    console.debug(`Error setting cache for ${key}:`, error)
  }
}

/**
 * Get cache value
 */
export async function getCache<T>(key: string): Promise<T | null> {
  const redis = await getRedisClient()

  // If Redis not available, return null (no cached value)
  if (!redis) return null

  try {
    const value = await redis.get(key)
    if (!value) return null
    return JSON.parse(value) as T
  } catch (error) {
    console.debug(`Error getting cache for ${key}:`, error)
    return null
  }
}

/**
 * Delete cache key
 */
export async function deleteCache(key: string): Promise<void> {
  const redis = await getRedisClient()

  // If Redis not available, silently skip
  if (!redis) return

  try {
    await redis.del(key)
  } catch (error) {
    console.debug(`Error deleting cache for ${key}:`, error)
  }
}

/**
 * Delete cache by pattern
 */
export async function deleteCacheByPattern(pattern: string): Promise<void> {
  const redis = await getRedisClient()

  // If Redis not available, silently skip
  if (!redis) return

  try {
    const keys = await redis.keys(pattern)
    if (keys.length > 0) {
      await redis.del(keys)
    }
  } catch (error) {
    console.debug(`Error deleting cache pattern ${pattern}:`, error)
  }
}

/**
 * Invalidate all cache
 */
export async function invalidateAllCache(): Promise<void> {
  const redis = await getRedisClient()

  // If Redis not available, silently skip
  if (!redis) return

  try {
    await redis.flushDb()
  } catch (error) {
    console.debug("Error invalidating all cache:", error)
  }
}

/**
 * Cache wrapper function - returns cached value if exists, otherwise fetches and caches
 */
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  // Try to get from cache
  const cached = await getCache<T>(key)
  if (cached) {
    return cached
  }

  // Fetch fresh data
  const data = await fetcher()

  // Cache it
  await setCache(key, data, options)

  return data
}