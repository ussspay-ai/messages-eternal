import { NextRequest, NextResponse } from "next/server"

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

export async function GET(request: NextRequest) {
  try {
    const botToken = process.env.DISCORD_BOT_TOKEN
    const channelId = process.env.DISCORD_CHANNEL_ID
    const guildId = process.env.DISCORD_GUILD_ID
    const limit = request.nextUrl.searchParams.get("limit") || "20"

    if (!botToken || !channelId) {
      return NextResponse.json(
        { error: "Missing Discord credentials" },
        { status: 400 }
      )
    }

    const response = await fetch(
      `https://discord.com/api/v10/channels/${channelId}/messages?limit=${limit}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
      }
    )

    if (!response.ok) {
      console.error(`Discord API error: ${response.status} ${response.statusText}`)
      return NextResponse.json(
        { error: "Failed to fetch Discord messages" },
        { status: response.status }
      )
    }

    const messages: DiscordMessage[] = await response.json()

    const imageExtensions = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"]
    const videoExtensions = [".mp4", ".webm", ".mov", ".avi", ".mkv"]

    const formattedMessages = messages
      .reverse()
      .map((msg: any) => {
        const attachments = (msg.attachments || []).map((att: any) => {
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

        const embeds = (msg.embeds || []).map((embed: any) => ({
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

    return NextResponse.json({ messages: formattedMessages })
  } catch (error) {
    console.error("Discord API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
