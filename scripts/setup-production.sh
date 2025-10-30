#!/bin/bash

# ============================================================================
# NOF1 Trading Platform - Production Setup Script
# ============================================================================
# This script helps you set up the platform for production deployment
# ============================================================================

set -e

PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}NOF1 Platform - Production Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to prompt user
prompt_input() {
    local prompt=$1
    local var_name=$2
    local default=${3:-}
    
    if [ -n "$default" ]; then
        read -p "$(echo -e ${YELLOW}$prompt [$default]:${NC} )" value
        value=${value:-$default}
    else
        read -p "$(echo -e ${YELLOW}$prompt:${NC} )" value
    fi
    
    eval "$var_name='$value'"
}

# Step 1: Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not installed!${NC}"
    echo "Install from: https://nodejs.org/en/download"
    exit 1
fi
echo -e "${GREEN}✓ Node.js: $(node -v)${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not installed!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm: $(npm -v)${NC}"

# Check Redis
if ! command -v redis-cli &> /dev/null; then
    echo -e "${YELLOW}⚠️  Redis not found locally${NC}"
    echo "Install Redis or use cloud Redis (Redis Cloud, AWS ElastiCache)"
    redis_local="n"
else
    echo -e "${GREEN}✓ Redis installed$(redis-cli --version)${NC}"
    redis_local="y"
fi

echo ""

# Step 2: Create .env.local
echo -e "${YELLOW}🔧 Setting up environment variables...${NC}"

if [ -f "$PROJECT_ROOT/.env.local" ]; then
    echo -e "${YELLOW}⚠️  .env.local already exists${NC}"
    read -p "Overwrite? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping environment setup"
    else
        SETUP_ENV="yes"
    fi
else
    SETUP_ENV="yes"
fi

if [ "$SETUP_ENV" = "yes" ]; then
    echo ""
    echo -e "${BLUE}Getting Aster DEX credentials...${NC}"
    echo "Go to: https://www.asterdex.com/en/api-wallet"
    echo ""
    
    # Main wallet
    prompt_input "Enter your main Aster wallet address (ASTER_USER_ADDRESS)" ASTER_USER_ADDRESS
    
    echo ""
    echo -e "${BLUE}Agent 1: Claude Arbitrage${NC}"
    prompt_input "Enter AGENT_1_SIGNER (API Key)" AGENT_1_SIGNER
    prompt_input "Enter AGENT_1_PRIVATE_KEY (Secret Key)" AGENT_1_PRIVATE_KEY
    
    echo ""
    echo -e "${BLUE}Agent 2: GPT-4 Momentum${NC}"
    prompt_input "Enter AGENT_2_SIGNER" AGENT_2_SIGNER
    prompt_input "Enter AGENT_2_PRIVATE_KEY" AGENT_2_PRIVATE_KEY
    
    echo ""
    echo -e "${BLUE}Agent 3: Gemini Grid Trading${NC}"
    prompt_input "Enter AGENT_3_SIGNER" AGENT_3_SIGNER
    prompt_input "Enter AGENT_3_PRIVATE_KEY" AGENT_3_PRIVATE_KEY
    
    echo ""
    echo -e "${BLUE}Agent 4: DeepSeek ML Predictor${NC}"
    prompt_input "Enter AGENT_4_SIGNER" AGENT_4_SIGNER
    prompt_input "Enter AGENT_4_PRIVATE_KEY" AGENT_4_PRIVATE_KEY
    
    # Redis
    echo ""
    echo -e "${BLUE}Redis Configuration${NC}"
    if [ "$redis_local" = "y" ]; then
        prompt_input "Redis URL" REDIS_URL "redis://localhost:6379"
    else
        echo "No local Redis found. Using cloud Redis:"
        echo "  - Redis Cloud (easiest): https://redis.com/try-free/"
        echo "  - AWS ElastiCache"
        echo "  - Heroku Redis"
        prompt_input "Enter your Redis URL" REDIS_URL "redis://default:password@host:port"
    fi
    
    # Create .env.local
    cat > "$PROJECT_ROOT/.env.local" << EOF
# NOF1 Trading Platform - Production Environment
# Generated: $(date)

# Aster DEX Configuration
ASTER_USER_ADDRESS=$ASTER_USER_ADDRESS

# Agent Credentials
AGENT_1_SIGNER=$AGENT_1_SIGNER
AGENT_1_PRIVATE_KEY=$AGENT_1_PRIVATE_KEY

AGENT_2_SIGNER=$AGENT_2_SIGNER
AGENT_2_PRIVATE_KEY=$AGENT_2_PRIVATE_KEY

AGENT_3_SIGNER=$AGENT_3_SIGNER
AGENT_3_PRIVATE_KEY=$AGENT_3_PRIVATE_KEY

AGENT_4_SIGNER=$AGENT_4_SIGNER
AGENT_4_PRIVATE_KEY=$AGENT_4_PRIVATE_KEY

# Redis
REDIS_URL=$REDIS_URL

# Node Environment
NODE_ENV=production
EOF
    
    echo -e "${GREEN}✅ Created .env.local${NC}"
fi

echo ""

# Step 3: Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
cd "$PROJECT_ROOT"
npm install

echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Step 4: Build
echo -e "${YELLOW}🔨 Building application...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build successful${NC}"
echo ""

# Step 5: Test setup
echo -e "${YELLOW}🧪 Testing setup...${NC}"

# Test Redis connection
if [ -n "$REDIS_URL" ]; then
    # Try to parse and test Redis
    if [[ "$REDIS_URL" == "redis://localhost"* ]]; then
        if redis-cli ping > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Redis connection works${NC}"
        else
            echo -e "${YELLOW}⚠️  Redis not responding (may need to start)${NC}"
        fi
    else
        echo -e "${BLUE}ℹ️  Using remote Redis (skipping local test)${NC}"
    fi
fi

echo ""

# Step 6: Deployment options
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo -e "${YELLOW}Choose deployment method:${NC}"
echo ""
echo "1. Local Development"
echo "   npm run dev"
echo ""
echo "2. Local Production"
echo "   npm start"
echo "   (or: npm install -g pm2 && pm2 start \"npm start\")"
echo ""
echo "3. Docker"
echo "   docker-compose up -d"
echo ""
echo "4. Vercel (Cloud)"
echo "   npm install -g vercel"
echo "   vercel --prod"
echo ""
echo "5. Railway (Cloud)"
echo "   Sign up at https://railway.app"
echo "   Connect GitHub repo"
echo "   Set environment variables"
echo ""

read -p "$(echo -e ${YELLOW}Choose option (1-5) or press Enter to skip:${NC} )" -n 1 -r
echo

case $REPLY in
    1)
        echo -e "${YELLOW}Starting development...${NC}"
        npm run dev
        ;;
    2)
        echo -e "${YELLOW}Starting production...${NC}"
        npm start
        ;;
    3)
        echo -e "${YELLOW}Starting Docker...${NC}"
        docker-compose up -d
        ;;
    *)
        echo -e "${YELLOW}Next steps:${NC}"
        echo "1. Review: PRODUCTION_SETUP.md"
        echo "2. Check: .env.local (make sure it's in .gitignore)"
        echo "3. Fund agents on Aster DEX"
        echo "4. Deploy using one of the methods above"
        ;;
esac

echo ""
echo -e "${BLUE}Resources:${NC}"
echo "- Production Guide: PRODUCTION_SETUP.md"
echo "- Operations Guide: OPERATIONS.md"
echo "- Aster Integration: ASTER_INTEGRATION_SETUP.md"
echo ""