#!/bin/bash
# InvBot v2 - Setup & Deployment Script

set -e

echo "🚀 InvBot v2 Setup Script"
echo "=========================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "\n${BLUE}Checking prerequisites...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js $(node -v)${NC}"

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm $(npm -v)${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker is installed${NC}"

# Install dependencies
echo -e "\n${BLUE}Installing dependencies...${NC}"
if [ ! -d "node_modules" ]; then
    npm install
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${GREEN}✅ Dependencies already installed${NC}"
fi

# Create .env if not exists
echo -e "\n${BLUE}Setting up environment...${NC}"
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo -e "${GREEN}✅ Created .env file (please update with your keys)${NC}"
else
    echo -e "${GREEN}✅ .env file already exists${NC}"
fi

# Create logs directory
mkdir -p logs

# Build TypeScript
echo -e "\n${BLUE}Building TypeScript...${NC}"
npm run build
echo -e "${GREEN}✅ Build successful${NC}"

# Start Docker services
echo -e "\n${BLUE}Starting Docker services...${NC}"
docker-compose up -d mysql redis
echo -e "${GREEN}✅ Docker services started${NC}"

# Wait for MySQL to be ready
echo -e "\n${BLUE}Waiting for MySQL to be ready...${NC}"
for i in {1..30}; do
    if docker exec invbot_mysql mysqladmin ping -h localhost &> /dev/null; then
        echo -e "${GREEN}✅ MySQL is ready${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

# Initialize database
echo -e "\n${BLUE}Initializing database...${NC}"
docker exec invbot_mysql mysql -u root -ppassword < database_schema.sql
echo -e "${GREEN}✅ Database initialized${NC}"

# Show next steps
echo -e "\n${GREEN}=========================="
echo "✅ Setup Complete!"
echo "==========================${NC}\n"

echo "Next steps:"
echo "1. Update .env with your API keys"
echo "2. Start the application:"
echo "   npm run dev      # Development mode"
echo "   npm start        # Production mode"
echo ""
echo "3. Access the application:"
echo "   API: http://localhost:3000"
echo "   Health: http://localhost:3000/health"
echo ""
echo "4. Monitor logs:"
echo "   Application: npm run dev"
echo "   MySQL: docker-compose logs -f mysql"
echo "   Redis: docker-compose logs -f redis"
echo ""
echo "5. Stop services:"
echo "   docker-compose down"
echo ""
