# Discord Messages Service

Standalone API service for fetching Discord channel messages.

## Local Development

```bash
npm install
npm run dev
```

Service runs on `http://localhost:3001`

## Environment Variables

Create a `.env` file:

```
PORT=3001
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_CHANNEL_ID=your_channel_id
DISCORD_GUILD_ID=your_guild_id
```

## API Endpoints

### Get Messages
```
GET /api/discord/messages?limit=20
```

Returns messages from the Discord channel with images, videos, and embeds.

### Health Check
```
GET /health
```

## Railway Deployment

1. Create a new Railway project
2. Connect this repository
3. Select this directory as the root
4. Add environment variables:
   - `DISCORD_BOT_TOKEN`
   - `DISCORD_CHANNEL_ID`
   - `DISCORD_GUILD_ID`
5. Deploy!

The service will be available at your Railway domain (e.g., `https://discord-service-prod.railway.app`)

## Docker

Build locally:
```bash
docker build -t discord-service .
docker run -p 3001:3001 --env-file .env discord-service
```
