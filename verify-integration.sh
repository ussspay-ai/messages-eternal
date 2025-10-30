#!/bin/bash

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  NOF1 Trading Platform - Frontend Integration Verification${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"

# Function to print status
print_status() {
  local name=$1
  local status=$2
  local detail=$3
  
  if [ "$status" = "OK" ]; then
    echo -e "${GREEN}✓${NC} $name: ${GREEN}$status${NC} $detail"
  elif [ "$status" = "WARN" ]; then
    echo -e "${YELLOW}⚠${NC} $name: ${YELLOW}$status${NC} $detail"
  else
    echo -e "${RED}✗${NC} $name: ${RED}$status${NC} $detail"
  fi
}

# Check 1: Environment Variables
echo -e "${BLUE}1. Checking Environment Variables...${NC}"
if [ -f ".env.local" ]; then
  print_status "Config file" "OK" "(.env.local found)"
  
  # Check required variables
  REQUIRED_VARS=("ASTER_USER_ADDRESS" "ASTER_USER_API_KEY" "ASTER_USER_SECRET_KEY" "AGENT_1_SIGNER" "AGENT_1_PRIVATE_KEY")
  
  for var in "${REQUIRED_VARS[@]}"; do
    if grep -q "^$var=" .env.local; then
      value=$(grep "^$var=" .env.local | cut -d= -f2)
      if [ -z "$value" ]; then
        print_status "  $var" "ERROR" "set but empty"
      else
        print_status "  $var" "OK" "configured"
      fi
    else
      print_status "  $var" "ERROR" "not found"
    fi
  done
else
  print_status "Config file" "ERROR" "(.env.local not found)"
fi
echo ""

# Check 2: Node and npm
echo -e "${BLUE}2. Checking Node.js Environment...${NC}"
if command -v node &> /dev/null; then
  NODE_VERSION=$(node -v)
  print_status "Node.js" "OK" "$NODE_VERSION"
else
  print_status "Node.js" "ERROR" "not installed"
fi

if command -v npm &> /dev/null; then
  NPM_VERSION=$(npm -v)
  print_status "npm" "OK" "$NPM_VERSION"
else
  print_status "npm" "ERROR" "not installed"
fi
echo ""

# Check 3: Frontend files
echo -e "${BLUE}3. Checking Frontend Files...${NC}"
FILES=(
  "lib/aster-client.ts"
  "app/api/aster/agents-data/route.ts"
  "app/api/aster/account/route.ts"
  "app/api/aster/positions/route.ts"
  "app/api/aster/trades/route.ts"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    print_status "  $file" "OK" ""
  else
    print_status "  $file" "ERROR" "not found"
  fi
done
echo ""

# Check 4: AsterClient Implementation
echo -e "${BLUE}4. Checking AsterClient Implementation...${NC}"
if grep -q "fapi.asterdex.com" lib/aster-client.ts; then
  print_status "Correct API endpoint" "OK" "using fapi.asterdex.com"
else
  print_status "Correct API endpoint" "ERROR" "not using fapi.asterdex.com"
fi

if grep -q "X-MBX-APIKEY" lib/aster-client.ts; then
  print_status "Correct API header" "OK" "using X-MBX-APIKEY"
else
  print_status "Correct API header" "ERROR" "not using X-MBX-APIKEY"
fi

if grep -q "generateSignature" lib/aster-client.ts; then
  print_status "Signature method" "OK" "implemented"
else
  print_status "Signature method" "ERROR" "not found"
fi
echo ""

# Check 5: Frontend server
echo -e "${BLUE}5. Checking Frontend Server...${NC}"
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
  print_status "Frontend server" "OK" "running on port 3000"
else
  print_status "Frontend server" "WARN" "not running (start with: npm run dev)"
fi
echo ""

# Check 6: API connectivity
echo -e "${BLUE}6. Testing API Connectivity...${NC}"
echo "   Waiting for server..."

# Wait for server with timeout
timeout=0
while ! lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null && [ $timeout -lt 30 ]; do
  sleep 1
  timeout=$((timeout + 1))
done

if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
  # Test agents-data endpoint
  if response=$(curl -s -m 5 "http://localhost:3000/api/aster/agents-data" 2>/dev/null); then
    if echo "$response" | grep -q '"agents"'; then
      agent_count=$(echo "$response" | grep -o '"id"' | wc -l)
      print_status "  /api/aster/agents-data" "OK" "returned $agent_count agents"
    else
      print_status "  /api/aster/agents-data" "ERROR" "invalid response format"
      echo "     Response: $(echo "$response" | head -c 100)..."
    fi
  else
    print_status "  /api/aster/agents-data" "ERROR" "connection failed"
  fi
  
  # Test single agent endpoint (if server is ready)
  if response=$(curl -s -m 5 "http://localhost:3000/api/aster/account?agentId=claude_arbitrage" 2>/dev/null); then
    if echo "$response" | grep -q '"equity"'; then
      equity=$(echo "$response" | grep -o '"equity":[0-9]*\.[0-9]*' | head -1 | cut -d: -f2)
      print_status "  /api/aster/account" "OK" "equity: $equity"
    else
      print_status "  /api/aster/account" "WARN" "check if Aster API is accessible"
    fi
  else
    print_status "  /api/aster/account" "WARN" "endpoint available but Aster API unreachable"
  fi
else
  print_status "Frontend server" "ERROR" "failed to start"
fi
echo ""

# Check 7: Trading bot connectivity
echo -e "${BLUE}7. Checking Trading Bot Setup...${NC}"
if [ -f "trading-bots/test-connection.ts" ]; then
  print_status "  test-connection.ts" "OK" "found"
else
  print_status "  test-connection.ts" "ERROR" "not found"
fi

if [ -f "trading-bots/lib/aster-client.ts" ]; then
  print_status "  trading-bots/aster-client.ts" "OK" "found"
else
  print_status "  trading-bots/aster-client.ts" "ERROR" "not found"
fi
echo ""

# Summary
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Verification Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"

echo "Next Steps:"
echo ""
echo "1. Start the frontend server:"
echo -e "   ${YELLOW}npm run dev${NC}"
echo ""
echo "2. Test the dashboard:"
echo -e "   ${YELLOW}http://localhost:3000/dashboard${NC}"
echo ""
echo "3. If you see agent data (non-zero values), the integration is working! ✓"
echo ""
echo "4. For detailed testing, see: FRONTEND_INTEGRATION_TESTING.md"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"