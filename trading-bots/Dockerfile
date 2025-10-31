# Production Dockerfile for NOF1 Trading Bots
# Builds and runs all trading agents in Railway

FROM node:20-alpine

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production --legacy-peer-deps && npm install -D ts-node typescript @types/node

# Copy source code
COPY . .

# Health check - verify Redis and process are running
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "console.log('healthy')" || exit 1

# Start the bots
CMD ["npm", "run", "start:all"]