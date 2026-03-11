#!/bin/bash

# GitHub Actions Deployment Setup Helper
# This script helps you configure GitHub Actions for automatic deployment

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║   GitHub Actions Deployment Setup for InvBot v2           ║"
echo "║              (Using sshpass + Password Auth)              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Menu
echo ""
echo "What would you like to do?"
echo ""
echo "1) Show GitHub Actions secrets setup instructions"
echo "2) Test SSH connection with password"
echo "3) Create version tag and push to GitHub"
echo "4) View all configuration steps"
echo "5) Exit"
echo ""
read -p "Select option (1-5): " option

case $option in
    1)
        echo -e "\n${YELLOW}🔐 GitHub Actions Setup - Password Authentication${NC}"
        echo ""
        echo -e "${BLUE}Step 1: Get your SSH credentials${NC}"
        echo "You need:"
        echo "  • SSH Host (e.g., your-server.com or 192.168.1.100)"
        echo "  • SSH User (e.g., ubuntu, deploy, root)"
        echo "  • SSH Password (user's password on the server)"
        echo ""
        echo -e "${BLUE}Step 2: Go to GitHub Repository Settings${NC}"
        echo "  https://github.com/YOUR_USERNAME/invbotv2/settings"
        echo ""
        echo -e "${BLUE}Step 3: Create Repository Secrets${NC}"
        echo "  Settings → Secrets and variables → Actions"
        echo ""
        echo "  Create these SECRETS (encrypted):"
        echo "  ────────────────────────────────────────────────"
        echo "  Name: DEPLOY_SSH_HOST"
        echo "  Value: your-server.com (or IP address)"
        echo "  ────────────────────────────────────────────────"
        echo "  Name: DEPLOY_SSH_USER"
        echo "  Value: ubuntu (or your SSH username)"
        echo "  ────────────────────────────────────────────────"
        echo "  Name: SSH_PASSWORD"
        echo "  Value: your_ssh_password (the password for DEPLOY_SSH_USER)"
        echo "  ────────────────────────────────────────────────"
        echo ""
        echo -e "${BLUE}Step 4: Create Repository Variable${NC}"
        echo "  Settings → Secrets and variables → Actions"
        echo ""
        echo "  Create this VARIABLE:"
        echo "  ────────────────────────────────────────────────"
        echo "  Name: DEPLOY_PATH"
        echo "  Value: /var/www/invbotv2"
        echo "  ────────────────────────────────────────────────"
        echo ""
        echo -e "${GREEN}✅ Setup complete!${NC}"
        echo "Now you're ready to deploy. See option 4 for testing."
        ;;
    
    2)
        echo -e "\n${YELLOW}📋 GitHub Actions Setup Instructions${NC}"
        echo ""
        echo -e "${BLUE}Step 1: Go to GitHub Repository Settings${NC}"
        echo "  https://github.com/YOUR_USERNAME/invbotv2/settings"
        echo ""
        echo -e "${BLUE}Step 2: Navigate to Secrets and Variables${NC}"
        echo "  Settings → Secrets and variables → Actions"
        echo ""
        echo -e "${BLUE}Step 3: Create these Repository Secrets:${NC}"
        echo "  • DEPLOY_SSH_HOST (e.g., your-server.com)"
        echo "  • DEPLOY_SSH_USER (e.g., ubuntu, deploy)"
        echo "  • SSH_PASSWORD (your SSH password)"
        echo ""
        echo -e "${BLUE}Step 4: Create these Repository Variables:${NC}"
        echo "  • DEPLOY_PATH (e.g., /var/www/invbotv2)"
        echo ""
        echo -e "${BLUE}Step 5: Test by creating a version tag${NC}"
        echo "  git tag v1.0.0"
        echo "  git push origin v1.0.0"
        echo ""
        echo -e "${BLUE}Step 6: Monitor deployment${NC}"
        echo "  Go to: https://github.com/YOUR_USERNAME/invbotv2/actions"
        echo "  Click on the workflow that's running"
        echo ""
        echo "Everything is already set up in:"
        echo "  • .github/workflows/deploy.yml (GitHub Actions workflow)"
        echo "  • GITHUB_ACTIONS_SETUP.md (detailed documentation)"
        ;;
    
    2)
        echo -e "\n${YELLOW}🔌 Testing SSH Connection with Password${NC}"
        echo ""
        read -p "SSH Host (e.g., your-server.com): " ssh_host
        read -p "SSH User (e.g., ubuntu): " ssh_user
        read -sp "SSH Password: " ssh_password
        echo ""

        if [ -z "$ssh_host" ] || [ -z "$ssh_user" ] || [ -z "$ssh_password" ]; then
            echo -e "${RED}❌ All fields required!${NC}"
            exit 1
        fi

        # Check if sshpass is installed
        if ! command -v sshpass &> /dev/null; then
            echo -e "${YELLOW}Installing sshpass...${NC}"
            sudo apt-get update && sudo apt-get install -y sshpass > /dev/null 2>&1 || {
                echo -e "${RED}❌ Could not install sshpass${NC}"
                echo "Install manually: sudo apt-get install sshpass"
                exit 1
            }
        fi

        echo ""
        echo "Testing SSH connection..."
        if sshpass -p "$ssh_password" ssh -o StrictHostKeyChecking=no \
            -o ConnectTimeout=5 \
            "$ssh_user@$ssh_host" "echo 'SSH connection OK' && pwd && whoami"; then
            echo ""
            echo -e "${GREEN}✅ SSH connection successful!${NC}"
            echo ""
            echo "You can now use these credentials in GitHub Actions:"
            echo "  DEPLOY_SSH_HOST: $ssh_host"
            echo "  DEPLOY_SSH_USER: $ssh_user"
            echo "  SSH_PASSWORD: (stored in GitHub Secrets)"
        else
            echo ""
            echo -e "${RED}❌ SSH connection failed!${NC}"
            echo ""
            echo "Troubleshooting:"
            echo "1. Check SSH password is correct"
            echo "2. Verify server is reachable: ping $ssh_host"
            echo "3. Verify SSH is running: ssh -v $ssh_user@$ssh_host 'echo ok'"
            echo "4. Enable password auth on server:"
            echo "   sudo grep -i passwordauth /etc/ssh/sshd_config"
        fi
    
    3)
        echo -e "\n${YELLOW}🏷️  Create Version Tag${NC}"
        echo ""
        read -p "Enter version tag (e.g., v1.0.0): " version
        
        if [ -z "$version" ]; then
            echo -e "${RED}❌ Version tag cannot be empty${NC}"
            exit 1
        fi

        # Validate version format
        if ! [[ $version =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            echo -e "${RED}❌ Invalid version format! Use v1.0.0${NC}"
            exit 1
        fi

        read -p "Enter release message (optional): " message
        message=${message:-"Release $version"}

        # Check if tag exists
        if git rev-parse "$version" >/dev/null 2>&1; then
            echo -e "${RED}❌ Tag $version already exists!${NC}"
            exit 1
        fi

        # Create tag
        echo ""
        echo "Creating tag: $version"
        echo "Message: $message"
        echo ""
        
        git tag -a "$version" -m "$message"
        
        echo -e "${GREEN}✅ Tag created locally${NC}"
        echo ""
        echo "Pushing to GitHub..."
        git push origin "$version"
        
        echo -e "${GREEN}✅ Tag pushed to GitHub!${NC}"
        echo ""
        echo "🚀 GitHub Actions workflow will automatically start deployment!"
        echo ""
        echo "Monitor deployment:"
        echo "  https://github.com/YOUR_USERNAME/invbotv2/actions"
        ;;
    
    4)
        echo -e "\n${YELLOW}📋 Complete Configuration Overview${NC}"
        echo ""
        echo -e "${BLUE}=== File Structure ===${NC}"
        echo "  .github/workflows/deploy.yml     - Automated deployment workflow"
        echo "  GITHUB_ACTIONS_SETUP.md          - Detailed setup guide"
        echo "  DEPLOYMENT.md                    - Manual deployment guide"
        echo "  .env.example                     - Environment template"
        echo ""
        echo -e "${BLUE}=== GitHub Secrets & Variables ===${NC}"
        echo "  DEPLOY_SSH_HOST      (Secret) - Server hostname/IP"
        echo "  DEPLOY_SSH_USER      (Secret) - SSH username"
        echo "  SSH_PASSWORD         (Secret) - SSH password for deployment user"
        echo "  DEPLOY_PATH        (Variable) - Deployment directory (/var/www/invbotv2)"
        echo ""
        echo -e "${BLUE}=== How It Works ===${NC}"
        echo "  1. You create a git tag: git tag v1.0.0"
        echo "  2. You push the tag: git push origin v1.0.0"
        echo "  3. GitHub Actions automatically:"
        echo "     - Checks out your code"
        echo "     - Installs dependencies"
        echo "     - Builds backend & frontend"
        echo "     - Connects via SSH (sshpass + password)"
        echo "     - Runs all deployment steps in single SSH session"
        echo "     - Restarts InvBot service"
        echo "     - Verifies application health"
        echo ""
        echo -e "${BLUE}=== Next Steps ===${NC}"
        echo "  1. Run option 1: Configure GitHub Secrets & Variables"
        echo "  2. Run option 2: Test SSH connection"
        echo "  3. Run option 3: Create your first v1.0.0 tag to deploy"
        echo ""
        echo -e "${GREEN}✅ Everything is ready! Follow GITHUB_ACTIONS_SETUP.md${NC}"
        ;;
    
    5)
        echo "Exiting..."
        exit 0
        ;;
    
    *)
        echo -e "${RED}❌ Invalid option${NC}"
        exit 1
        ;;
esac

echo ""
        echo "     - Pulls latest code"
        echo "     - Restarts InvBot service"
        echo ""
        echo -e "${BLUE}=== Next Command ===${NC}"
        echo "  Option 1: Option This command to generate SSH key"
        echo "  Option 4: Create your first v1.0.0 tag"
        echo ""
        echo -e "${GREEN}✅ Everything is ready! Follow GITHUB_ACTIONS_SETUP.md${NC}"
        ;;
    
    6)
        echo "Exiting..."
        exit 0
        ;;
    
    *)
        echo -e "${RED}❌ Invalid option${NC}"
        exit 1
        ;;
esac

echo ""
