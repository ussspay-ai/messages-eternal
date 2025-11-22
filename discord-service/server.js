const express = require("express")
const cors = require("cors")
require("dotenv").config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

const imageExtensions = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"]
const videoExtensions = [".mp4", ".webm", ".mov", ".avi", ".mkv"]

app.get("/api/discord/messages", async (req, res) => {
  try {
    const botToken = process.env.DISCORD_BOT_TOKEN
    const channelId = process.env.DISCORD_CHANNEL_ID
    const guildId = process.env.DISCORD_GUILD_ID
    const limit = req.query.limit || "20"
    const after = req.query.after || ""

    if (!botToken || !channelId) {
      return res.status(400).json({
        error: "Missing Discord credentials",
      })
    }

    let url = `https://discord.com/api/v10/channels/${channelId}/messages?limit=${limit}`
    if (after) {
      url += `&after=${after}`
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      console.error(`Discord API error: ${response.status} ${response.statusText}`)
      return res.status(response.status).json({
        error: "Failed to fetch Discord messages",
      })
    }

    const messages = await response.json()

    const formattedMessages = messages.map((msg) => {
        const attachments = (msg.attachments || []).map((att) => {
          const filename = att.filename.toLowerCase()
          const isImage = imageExtensions.some((ext) => filename.endsWith(ext))
          const isVideo = videoExtensions.some((ext) => filename.endsWith(ext))
          return {
            url: att.url,
            filename: att.filename,
            isImage: isImage,
            isVideo: isVideo,
          }
        })

        const embeds = (msg.embeds || []).map((embed) => ({
          title: embed.title || undefined,
          description: embed.description || undefined,
          image: embed.image?.url || undefined,
          video: embed.video?.url || undefined,
          url: embed.url || undefined,
          type: embed.type || undefined,
        }))

        return {
          id: msg.id,
          author: {
            id: msg.author.id,
            username: msg.author.username,
            avatar: msg.author.avatar
              ? `https://cdn.discordapp.com/avatars/${msg.author.id}/${msg.author.avatar}.png`
              : "/placeholder-user.jpg",
          },
          content: msg.content,
          embeds: embeds,
          timestamp: new Date(msg.timestamp).toISOString(),
          attachments: attachments,
          messageLink: guildId
            ? `https://discord.com/channels/${guildId}/${channelId}/${msg.id}`
            : `https://discord.com/channels/${channelId}/${msg.id}`,
        }
      })

    const oldestMessageId = formattedMessages.length > 0 
      ? formattedMessages[formattedMessages.length - 1].id 
      : null

    res.json({ 
      messages: formattedMessages,
      pagination: {
        oldestMessageId: oldestMessageId,
        hasMore: formattedMessages.length === parseInt(limit)
      }
    })
  } catch (error) {
    console.error("Discord API error:", error)
    res.status(500).json({
      error: "Internal server error",
    })
  }
})

app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Discord service is running" })
})

app.listen(PORT, () => {
  console.log(`Discord messages service running on port ${PORT}`)
  console.log(`Health check: http://localhost:${PORT}/health`)
})
