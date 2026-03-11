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
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Menu
echo ""
echo "What would you like to do?"
echo ""
echo "1) Generate SSH deploy key"
echo "2) Show GitHub Actions setup instructions"
echo "3) Test SSH connection"
echo "4) Create version tag and push to GitHub"
echo "5) View all configuration steps"
echo "6) Exit"
echo ""
read -p "Select option (1-6): " option

case $option in
    1)
        echo -e "\n${YELLOW}🔑 Generating SSH Deploy Key${NC}"
        echo ""
        read -p "Enter key name (default: github_deploy_key): " key_name
        key_name=${key_name:-github_deploy_key}
        key_path="$HOME/.ssh/$key_name"

        if [ -f "$key_path" ]; then
            echo -e "${RED}⚠ Key already exists at $key_path${NC}"
            read -p "Overwrite? (y/n): " confirm
            if [ "$confirm" != "y" ]; then
                echo "Cancelled."
                exit 0
            fi
        fi

        # Generate SSH key
        ssh-keygen -t ed25519 -f "$key_path" -N "" -C "github-actions-deploy-$(date +%s)"
        
        echo ""
        echo -e "${GREEN}✅ SSH key generated!${NC}"
        echo ""
        echo -e "${YELLOW}Private Key (for GitHub Secrets):${NC}"
        echo "───────────────────────────────────────────────────────────"
        cat "$key_path"
        echo "───────────────────────────────────────────────────────────"
        echo ""
        echo -e "${YELLOW}Public Key (for server):${NC}"
        echo "───────────────────────────────────────────────────────────"
        cat "$key_path.pub"
        echo "───────────────────────────────────────────────────────────"
        echo ""
        echo -e "${BLUE}Next steps:${NC}"
        echo "1. Copy the Private Key above"
        echo "2. Go to GitHub: Settings → Secrets and variables → Actions"
        echo "3. Create new secret: DEPLOY_SSH_KEY"
        echo "4. Paste the entire private key content"
        echo ""
        echo "5. Copy the Public Key above"
        echo "6. SSH to production server: ssh user@your-server.com"
        echo "7. Run: echo 'PUBLIC_KEY_CONTENT' >> ~/.ssh/authorized_keys"
        echo "8. Run: chmod 600 ~/.ssh/authorized_keys"
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
        echo "  • DEPLOY_SSH_KEY (your private SSH key - generated in option 1)"
        echo "  • DEPLOY_SSH_HOST (e.g., your-server.com)"
        echo "  • DEPLOY_SSH_USER (e.g., ubuntu, deploy)"
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
    
    3)
        echo -e "\n${YELLOW}🔌 Testing SSH Connection${NC}"
        echo ""
        read -p "SSH Host (e.g., your-server.com): " ssh_host
        read -p "SSH User (e.g., ubuntu): " ssh_user
        read -p "SSH Key path (default: ~/.ssh/github_deploy_key): " key_path
        key_path=${key_path:-~/.ssh/github_deploy_key}

        if [ ! -f "$key_path" ]; then
            echo -e "${RED}❌ Key not found at $key_path${NC}"
            exit 1
        fi

        echo ""
        echo "Testing connection..."
        if ssh -i "$key_path" -o StrictHostKeyChecking=accept-new \
            -o ConnectTimeout=5 \
            "$ssh_user@$ssh_host" "echo 'SSH connection OK' && pwd && whoami"; then
            echo -e "\n${GREEN}✅ SSH connection successful!${NC}"
        else
            echo -e "\n${RED}❌ SSH connection failed!${NC}"
            echo ""
            echo "Troubleshooting:"
            echo "1. Check SSH key is added to ~/.ssh/authorized_keys on server"
            echo "2. Verify SSH service is running: sudo service ssh status"
            echo "3. Check key permissions: chmod 600 ~/.ssh/authorized_keys"
            echo "4. Test with verbose: ssh -vvv -i $key_path $ssh_user@$ssh_host"
        fi
        ;;
    
    4)
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
    
    5)
        echo -e "\n${YELLOW}📋 Complete Configuration Overview${NC}"
        echo ""
        echo -e "${BLUE}=== File Structure ===${NC}"
        echo "  .github/workflows/deploy.yml     - Automated deployment workflow"
        echo "  GITHUB_ACTIONS_SETUP.md          - Detailed setup guide"
        echo "  DEPLOYMENT.md                    - Manual deployment guide"
        echo "  .env.example                     - Environment template"
        echo ""
        echo -e "${BLUE}=== GitHub Secrets & Variables ===${NC}"
        echo "  DEPLOY_SSH_KEY       (Secret) - Private SSH key for deployment"
        echo "  DEPLOY_SSH_HOST      (Secret) - Server hostname/IP"
        echo "  DEPLOY_SSH_USER      (Secret) - SSH username"
        echo "  DEPLOY_PATH        (Variable) - Deployment directory"
        echo ""
        echo -e "${BLUE}=== How It Works ===${NC}"
        echo "  1. You create a git tag: git tag v1.0.0"
        echo "  2. You push the tag: git push origin v1.0.0"
        echo "  3. GitHub Actions automatically:"
        echo "     - Checks out your code"
        echo "     - Installs dependencies"
        echo "     - Builds backend & frontend"
        echo "     - SSHs to your server"
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
