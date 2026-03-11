# GitHub Actions Deployment Setup

## Overview

This guide explains how to set up automatic deployment using GitHub Actions. The workflow will automatically deploy your application whenever you push a version tag (e.g., `v1.0.0`) to GitHub.

## Prerequisites

1. GitHub repository with this code
2. Production SSH server with:
   - SSH access enabled
   - Node.js 18+ installed
   - MySQL/MariaDB database configured
   - Systemd service configured (see DEPLOYMENT.md)
   - Git installed

## Step 1: Generate SSH Deploy Key

### On Your Local Machine

```bash
# Generate SSH keypair (without passphrase for automated access)
ssh-keygen -t ed25519 -f ~/.ssh/github_deploy_key -N "" -C "github-actions-deploy"

# Show public key (you'll need this next)
cat ~/.ssh/github_deploy_key.pub
```

### On Production Server

```bash
# Add public key to authorized_keys
mkdir -p ~/.ssh
cat >> ~/.ssh/authorized_keys << EOF
ssh-ed25519 AAAA... github-actions-deploy
EOF

# Secure permissions
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh

# Verify SSH access from GitHub (we'll test this after setup)
```

## Step 2: Configure GitHub Actions Secrets & Variables

### Via GitHub Web Interface

1. Go to your repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**

### Add Secrets (Repository Secrets)

These are stored encrypted and never shown in logs.

**DEPLOY_SSH_KEY** (Secret)
```
-----BEGIN OPENSSH PRIVATE KEY-----
MIIEpAIBAAKCAQEA... (paste entire private key content)
-----END OPENSSH PRIVATE KEY-----
```

**DEPLOY_SSH_HOST** (Secret - optional, can use variables)
```
your-server.com
# or
192.168.1.100
```

**DEPLOY_SSH_USER** (Secret - optional, can use variables)
```
ubuntu
# or
deploy
```

### Add Variables (Repository Variables)

These are not encrypted but are still not shown in normal logs.

**DEPLOY_PATH**
```
/var/www/invbotv2
# or wherever you want to deploy
```

**DEPLOY_BRANCH** (Optional)
```
master
# or main
```

## Step 3: Set Up Production Server

### Configure Systemd Service

Create `/etc/systemd/system/invbot.service`:

```ini
[Unit]
Description=InvBot v2 Trading System
After=network.target mysql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/invbotv2
Environment="NODE_ENV=production"
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
StandardOutput=append:/var/log/invbot.log
StandardError=append:/var/log/invbot-error.log
SyslogIdentifier=invbot

[Install]
WantedBy=multi-user.target
```

Enable the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable invbot
```

### Create .env File

On your production server:
```bash
sudo nano /var/www/invbotv2/.env
```

Fill in all required variables (database credentials, API keys, etc.). **This file is NOT version controlled** and should be manually created on the server.

### Set Proper Permissions

```bash
sudo chown -R www-data:www-data /var/www/invbotv2
sudo chmod 750 /var/www/invbotv2
```

## Step 4: Test SSH Access

### From Your Local Machine

```bash
# Test SSH connection with deploy key
ssh -i ~/.ssh/github_deploy_key -o StrictHostKeyChecking=accept-new \
  ubuntu@your-server.com "echo 'SSH access OK' && pwd"
```

### Create GitHub Actions Variables for Testing

In `Settings` → `Secrets and variables` → `Actions`, test with:

```yaml
DEPLOY_SSH_HOST: your-server.com
DEPLOY_SSH_USER: ubuntu
DEPLOY_PATH: /var/www/invbotv2
```

## Step 5: Create First Release Tag

```bash
# Make sure everything is committed
git add -A
git commit -m "Ready for deployment"

# Create version tag
git tag -a v1.0.0 -m "Release v1.0.0 - Initial production release"

# Push tag to GitHub (this triggers the workflow!)
git push origin v1.0.0

# Or push all tags
git push origin --tags
```

### Monitor Deployment

1. Go to your GitHub repository
2. Click **Actions** tab
3. Watch the workflow run in real-time
4. Check the logs for any issues

## Step 6: Verify Deployed Application

After workflow completes successfully:

```bash
# SSH into your server
ssh ubuntu@your-server.com

# Check service status
sudo systemctl status invbot

# View recent logs
sudo journalctl -u invbot -n 50 --no-pager

# Test API endpoint
curl -s http://localhost:3000/health | jq .

# Check frontend is built
ls -la /var/www/invbotv2/frontend/dist/

# Check logs
tail -f /var/log/invbot.log
```

## Continuous Deployment

### Creating New Releases

Every time you want to deploy:

```bash
# Make your changes
git add -A
git commit -m "Your changes"

# Create new version tag (semantic versioning)
git tag -a v1.0.1 -m "Release v1.0.1 - Bug fixes"

# Push the tag (automatically triggers deployment workflow)
git push origin v1.0.1
```

### Version Tagging Convention

Use [Semantic Versioning](https://semver.org/):

- **MAJOR.MINOR.PATCH** (e.g., v1.0.0)
- **v1.0.0** - Major version bump (breaking changes)
- **v1.0.1** - Patch version (bug fixes)
- **v1.1.0** - Minor version (new features)

Examples:
```bash
git tag v1.0.0   # Initial release
git tag v1.0.1   # Bug fix
git tag v1.1.0   # New feature
git tag v2.0.0   # Major release
```

## Troubleshooting

### SSH Connection Failed

**Error:** `Permission denied (publickey)`

**Solution:**
1. Verify SSH key is in `~/.ssh/authorized_keys` on server
2. Check key permissions: `chmod 600 ~/.ssh/authorized_keys`
3. Check if SSH service is running: `sudo service ssh status`

### Workflow Didn't Trigger

**Possible causes:**
1. Tag doesn't match pattern `v*.*.*`
2. Workflow file has syntax errors
3. Repository doesn't have Actions enabled

**Solution:**
1. Check tag format: `git tag -l` should show `v1.0.0`
2. Validate YAML: Use online YAML validator
3. Enable Actions: Settings → Actions → Allow all actions

### Deployment Succeeded But Service Didn't Restart

**Check service logs:**
```bash
sudo journalctl -u invbot -n 100 --no-pager
```

**Common issues:**
1. `.env` file missing or invalid
2. Database connection failed
3. Port already in use
4. Permission issues

**Solutions:**
```bash
# Verify .env exists
sudo ls -la /var/www/invbotv2/.env

# Check database
mysql -u invbotv2_user -p invbotv2_db -e "SELECT COUNT(*) FROM users;"

# Check port
sudo lsof -i :3000

# Fix permissions
sudo chown -R www-data:www-data /var/www/invbotv2
```

### Build Failed in Workflow

Check the **Actions** tab for full logs:
1. Click on failed workflow
2. Click on `build` or `deploy` job
3. Expand failed step to see error

**Common issues:**
1. Node.js version mismatch
2. Missing dependencies
3. TypeScript compilation errors

## Security Best Practices

✅ **Do:**
- Use SSH ed25519 keys (more secure than RSA)
- Store sensitive values in GitHub Secrets
- Use different keys for different environments
- Rotate keys periodically
- Limit SSH access to GitHub runners (if possible)
- Keep .env files only on server (never commit)

❌ **Don't:**
- Commit .env files to repository
- Share private keys
- Use weak passwords
- Hardcode credentials in YAML
- Allow SSH access from everywhere

## Advanced Configuration

### Multiple Environments

If you want separate staging and production:

```yaml
# In .github/workflows/deploy.yml
on:
  push:
    tags:
      - 'v*.*.*'        # Deploy to production
      - 'staging-*'     # Deploy to staging
```

### Environment Variables Per Stage

```yaml
jobs:
  deploy:
    environment:
      name: production  # or staging
    env:
      DEPLOY_PATH: ${{ vars.DEPLOY_PATH }}
```

### Slack Notifications

Add to workflow after deployment:

```yaml
- name: Notify Slack
  if: always()
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK }}
    payload: |
      {
        "text": "InvBot deployment ${{ job.status }}",
        "blocks": [...]
      }
```

## Monitoring Deployments

### View All Deployments

```bash
# List all tags
git tag -l

# Show tag details
git show v1.0.0

# View deployment logs on GitHub
# Settings → Environments → Select environment → View logs
```

### Automatic Rollback (Optional)

If you need to revert:

```bash
# Tag a known-good version
git tag v1.0.0-rollback

# Or checkout previous tag
git checkout v1.0.0
git push origin v1.0.0-force -f
```

## Support

- **GitHub Actions Documentation**: https://docs.github.com/en/actions
- **Deployment Guide**: See `DEPLOYMENT.md` in this repository
- **SSH Setup**: See production server setup in DEPLOYMENT.md
