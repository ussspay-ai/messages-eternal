#!/bin/bash

# ============================================================================
# NOF1 Trading Platform - Deployment Script
# ============================================================================
# Usage: ./scripts/deploy.sh [development|production]
# ============================================================================

set -e

ENVIRONMENT=${1:-development}
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}NOF1 Trading Platform - Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check environment file
if [ ! -f "$PROJECT_ROOT/.env.local" ]; then
    echo -e "${RED}❌ Error: .env.local not found!${NC}"
    echo ""
    echo "Steps to fix:"
    echo "1. Copy: cp .env.production .env.local"
    echo "2. Edit: nano .env.local"
    echo "3. Fill in your Aster credentials"
    echo "4. Retry deployment"
    exit 1
fi

# Validate environment variables
echo -e "${YELLOW}📋 Validating environment variables...${NC}"

missing_vars=0

if [ -z "$ASTER_USER_ADDRESS" ]; then
    echo -e "${RED}  ✗ ASTER_USER_ADDRESS${NC}"
    missing_vars=$((missing_vars + 1))
else
    echo -e "${GREEN}  ✓ ASTER_USER_ADDRESS${NC}"
fi

if [ -z "$AGENT_1_SIGNER" ]; then
    echo -e "${RED}  ✗ AGENT_1_SIGNER${NC}"
    missing_vars=$((missing_vars + 1))
else
    echo -e "${GREEN}  ✓ AGENT_1_SIGNER${NC}"
fi

if [ -z "$REDIS_URL" ]; then
    echo -e "${RED}  ✗ REDIS_URL${NC}"
    missing_vars=$((missing_vars + 1))
else
    echo -e "${GREEN}  ✓ REDIS_URL${NC}"
fi

if [ $missing_vars -gt 0 ]; then
    echo ""
    echo -e "${RED}❌ Missing $missing_vars environment variable(s)${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All required variables set${NC}"
echo ""

# Build
echo -e "${YELLOW}🔨 Building application...${NC}"
cd "$PROJECT_ROOT"
npm install --omit=optional
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build successful${NC}"
echo ""

# Deploy based on environment
case "$ENVIRONMENT" in
    development)
        echo -e "${YELLOW}🚀 Starting in development mode...${NC}"
        npm run dev
        ;;
    production)
        echo -e "${YELLOW}🚀 Starting in production mode...${NC}"
        
        # Option 1: Using PM2 (if installed)
        if command -v pm2 &> /dev/null; then
            echo -e "${BLUE}Using PM2 process manager${NC}"
            pm2 delete nof1-trading 2>/dev/null || true
            pm2 start "npm start" --name "nof1-trading" --instances 2
            pm2 save
            echo ""
            echo -e "${GREEN}✅ Application started with PM2${NC}"
            echo -e "${BLUE}View logs: pm2 logs nof1-trading${NC}"
            pm2 logs nof1-trading
        else
            echo -e "${BLUE}Starting with npm start${NC}"
            npm start
        fi
        ;;
    docker)
        echo -e "${YELLOW}🐳 Building and running Docker container...${NC}"
        
        if ! command -v docker &> /dev/null; then
            echo -e "${RED}❌ Docker not installed!${NC}"
            exit 1
        fi
        
        echo -e "${BLUE}Building Docker image...${NC}"
        docker build -t nof1-trading:latest "$PROJECT_ROOT"
        
        echo -e "${BLUE}Starting Docker container...${NC}"
        docker-compose -f "$PROJECT_ROOT/docker-compose.yml" up -d
        
        echo ""
        echo -e "${GREEN}✅ Docker container started${NC}"
        echo -e "${BLUE}View logs: docker-compose logs -f${NC}"
        echo -e "${BLUE}Status: docker ps${NC}"
        ;;
    *)
        echo -e "${RED}❌ Unknown environment: $ENVIRONMENT${NC}"
        echo ""
        echo "Usage: ./scripts/deploy.sh [development|production|docker]"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Health check
echo -e "${YELLOW}🏥 Running health checks...${NC}"
sleep 3

# Try to connect to app
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Application is running${NC}"
    
    # Check if we can reach an API endpoint
    if curl -s "http://localhost:3000/api/aster/agents-data" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ API endpoints are working${NC}"
    else
        echo -e "${YELLOW}⚠️  API endpoint check failed (may be due to Aster connection)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Could not reach application at http://localhost:3000${NC}"
fi

echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Open: http://localhost:3000"
echo "2. Check dashboard for agent data"
echo "3. Monitor: pm2 logs nof1-trading (if using PM2)"
echo "4. Troubleshoot: See OPERATIONS.md"