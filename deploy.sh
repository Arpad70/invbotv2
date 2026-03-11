#!/bin/bash

# InvBot v2 - SSH Deployment Script
# Usage: ./deploy.sh <ssh-host> <ssh-user> <path-on-server> [branch]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SSH_HOST=${1:-""}
SSH_USER=${2:-""}
DEPLOY_PATH=${3:-"/var/www/invbotv2"}
BRANCH=${4:-"master"}
GIT_REPO=$(git config --get remote.origin.url)

# Validation
if [ -z "$SSH_HOST" ] || [ -z "$SSH_USER" ]; then
    echo -e "${RED}Usage: ./deploy.sh <ssh-host> <ssh-user> [path] [branch]${NC}"
    echo "Example: ./deploy.sh example.com ubuntu /var/www/invbotv2 master"
    exit 1
fi

echo -e "${YELLOW}🚀 InvBot v2 Deployment Script${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${YELLOW}Server:${NC} $SSH_USER@$SSH_HOST"
echo -e "${YELLOW}Deploy Path:${NC} $DEPLOY_PATH"
echo -e "${YELLOW}Git Repo:${NC} $GIT_REPO"
echo -e "${YELLOW}Branch:${NC} $BRANCH"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Step 1: Commit any pending changes
echo -e "\n${YELLOW}1️⃣  Ensuring local repository is clean...${NC}"
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}Uncommitted changes detected. Committing...${NC}"
    git add -A
    git commit -m "Deployment: $(date '+%Y-%m-%d %H:%M:%S')"
fi

# Step 2: Push to git
echo -e "\n${YELLOW}2️⃣  Pushing to git repository...${NC}"
git push origin $BRANCH

# Step 3: Connect via SSH and deploy
echo -e "\n${YELLOW}3️⃣  Connecting to server and deploying...${NC}"

ssh $SSH_USER@$SSH_HOST << DEPLOY_SCRIPT
set -e

echo -e "${GREEN}✓ Connected to server${NC}"

# Check if directory exists
if [ ! -d "$DEPLOY_PATH" ]; then
    echo -e "${YELLOW}Creating deployment directory...${NC}"
    mkdir -p $DEPLOY_PATH
    cd $DEPLOY_PATH
    git clone $GIT_REPO .
else
    cd $DEPLOY_PATH
fi

echo -e "${YELLOW}Pulling latest code...${NC}"
git fetch origin
git checkout $BRANCH
git pull origin $BRANCH

echo -e "${YELLOW}Installing dependencies...${NC}"
npm install --production

echo -e "${YELLOW}Building application...${NC}"
npm run build

echo -e "${YELLOW}Building frontend...${NC}"
cd frontend
npm install --production
npm run build
cd ..

echo -e "${YELLOW}Checking .env file...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${RED}ERROR: .env file not found!${NC}"
    echo -e "${YELLOW}Please create .env file with production credentials${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Deployment complete!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Review .env configuration: nano $DEPLOY_PATH/.env"
echo "2. Restart service: sudo systemctl restart invbot"
echo "3. Check status: sudo systemctl status invbot"
echo "4. View logs: journalctl -u invbot -f"

DEPLOY_SCRIPT

# Step 4: Local verification
echo -e "\n${YELLOW}4️⃣  Deployment Summary${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✓ Code pushed to git${NC}"
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo -e "${GREEN}✓ Application built${NC}"
echo -e "${YELLOW}⚠ Service restart required on server${NC}"
echo ""
echo -e "${YELLOW}Verify deployment:${NC}"
echo "  curl -X GET https://$(echo $SSH_HOST | cut -d. -f1-3).com/api/v1/health"
echo ""

echo -e "${GREEN}✅ Deployment script completed!${NC}"
