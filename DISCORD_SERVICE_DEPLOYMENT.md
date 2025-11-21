# Discord Service Deployment Guide

This guide explains how to deploy the standalone Discord messages service to Railway.

## What Changed

The Discord messages API has been split into a standalone service:

- **Service**: `/discord-service` - Standalone Express app running on Railway
- **Frontend**: `/app/x-comments/page.tsx` - Updated to use remote endpoint

## Local Development

### Discord Service (runs separately)

```bash
cd discord-service
npm install
npm run dev
```

Service runs on `http://localhost:3001`

### Main App (as usual)

```bash
npm install
npm run dev
```

App runs on `http://localhost:3000`

The frontend will automatically use the local Discord service at `http://localhost:3001/api/discord/messages`

## Railway Deployment

### Step 1: Create a Railway Project

1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub"
4. Connect your GitHub repository

### Step 2: Configure Discord Service

1. Create a new service in the project
2. Select GitHub repository and set:
   - **Root Directory**: `discord-service`
   - **Build**: Dockerfile
3. Add environment variables:
   - `DISCORD_BOT_TOKEN`: Your Discord bot token
   - `DISCORD_CHANNEL_ID`: The channel ID (1441363639264215060)
   - `DISCORD_GUILD_ID`: Your guild/server ID (optional)
4. Deploy!

### Step 3: Get Service URL

Once deployed, Railway will provide a URL like:
```
https://discord-service-prod-xxxx.railway.app
```

### Step 4: Update Main App Environment

In your main Next.js app on Railway/Vercel, add:

```
NEXT_PUBLIC_DISCORD_API_URL=https://discord-service-prod-xxxx.railway.app/api/discord/messages
```

## Environment Variables Needed

### Discord Service (.env)

```
PORT=3001
DISCORD_BOT_TOKEN=YOUR_DISCORD_BOT_TOKEN_HERE
DISCORD_CHANNEL_ID=1441363639264215060
DISCORD_GUILD_ID=optional_guild_id
```

### Main App (.env.local or Railway)

```
NEXT_PUBLIC_DISCORD_API_URL=https://your-discord-service-url.railway.app/api/discord/messages
```

**Note**: Leave `NEXT_PUBLIC_DISCORD_API_URL` empty to use the local fallback `/api/discord/messages`

## Local Testing with Remote Service

If you want to test the frontend against a remote Discord service:

1. Deploy Discord service to Railway
2. Get the URL
3. Add to `.env.local`:
   ```
   NEXT_PUBLIC_DISCORD_API_URL=https://your-discord-service.railway.app/api/discord/messages
   ```
4. Restart dev server: `npm run dev`

## Docker Testing Locally

```bash
cd discord-service
docker build -t discord-service .
docker run -p 3001:3001 --env-file .env discord-service
```

Then visit: `http://localhost:3001/health`

## Health Check Endpoint

Both local and deployed service provide a health check:

```bash
curl http://localhost:3001/health
# or
curl https://your-discord-service.railway.app/health
```

Response:
```json
{
  "status": "ok",
  "message": "Discord service is running"
}
```

## Fallback Behavior

If `NEXT_PUBLIC_DISCORD_API_URL` is not set, the frontend uses the local Next.js API:
```
/api/discord/messages
```

This allows the main app to work with either:
- Local Discord service
- Remote Discord service on Railway
- Local Next.js API fallback (requires bot token in main app)
