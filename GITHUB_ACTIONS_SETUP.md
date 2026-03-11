# GitHub Actions Deployment Setup

## Overview

This guide explains how to set up automatic deployment using GitHub Actions. The workflow will automatically deploy your application whenever you push a version tag (e.g., `v1.0.0`) to GitHub.

## Prerequisites

1. GitHub repository with this code
2. Production SSH server with:
   - SSH access enabled
   - SSH password authentication enabled
   - Node.js 18+ installed
   - MySQL/MariaDB database configured
   - Systemd service configured (see DEPLOYMENT.md)
   - Git installed

## Step 1: Prepare Server

### Verify SSH Password Authentication is Enabled

On your production server:

```bash
# Check SSH config allows password authentication
sudo grep "PasswordAuthentication" /etc/ssh/sshd_config

# If result is "PasswordAuthentication no", enable it:
sudo sed -i 's/^PasswordAuthentication no/PasswordAuthentication yes/' /etc/ssh/sshd_config
sudo systemctl restart ssh

# Test login with password
ssh user@your-server.com "whoami"  # This will prompt for password
```

### Create SSH User (Optional but Recommended)

For security, you might want a dedicated deployment user:

```bash
# On production server
sudo useradd -m -s /bin/bash deploy
sudo passwd deploy  # Set a password

# Give sudo rights for systemctl
sudo visudo
# Add line: deploy ALL=(ALL) NOPASSWD: /usr/bin/systemctl
```

## Step 2: Configure GitHub Actions Secrets

### Via GitHub Web Interface

1. Go to your repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**

### Add Repository Secrets

These are stored encrypted and never shown in logs.

**DEPLOY_SSH_HOST** (Secret)
```
your-server.com
# or
192.168.1.100
```

**DEPLOY_SSH_USER** (Secret)
```
ubuntu
# or
deploy  (the user you created above)
```

**SSH_PASSWORD** (Secret)
```
your_ssh_user_password_here
```

### Add Repository Variables

**DEPLOY_PATH** (Variable)
```
/var/www/invbotv2
# or wherever you want to deploy
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
# Test password-based SSH connection
ssh username@your-server.com "echo 'SSH access OK' && pwd && whoami"
# This will prompt for password
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
ssh username@your-server.com

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

**Error:** `Permission denied (password)` or `Connection refused`

**Solution:**
1. Verify SSH password authentication is enabled on server:
   ```bash
   sudo grep -i passwordauth /etc/ssh/sshd_config
   ```
2. Check SSH is running: `sudo systemctl status ssh`
3. Test password locally: `ssh user@your-server.com`
4. Verify credentials in GitHub Secrets

### Workflow Didn't Trigger

**Possible causes:**
1. Tag doesn't match pattern `v*.*.*`
2. Workflow file has syntax errors
3. Repository doesn't have Actions enabled

**Solution:**
1. Check tag format: `git tag -l` should show `v1.0.0`
2. Validate YAML: Use online YAML validator on `.github/workflows/deploy.yml`
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

### sshpass not found

If you see: `sshpass: command not found`

The workflow automatically installs sshpass, but if it fails:

```bash
# On your server
sudo apt-get update
sudo apt-get install sshpass
```

## Security Best Practices

✅ **Do:**
- Use SSH password authentication only for deployment users
- Store SSH password in GitHub Secrets (encrypted)
- Use `sudo` for privileged operations (systemctl restart)
- Keep .env files only on server (never commit)
- Rotate passwords periodically
- Use strong passwords for SSH user

❌ **Don't:**
- Commit .env files to repository
- Share passwords in plain text
- Hardcode credentials in YAML
- Use root account for deployment
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

# View workflow runs
# https://github.com/YOUR_USERNAME/invbotv2/actions
```

### Live Logs During Deployment

On GitHub Actions page, click the running workflow to see real-time logs of:
- Build progress
- SSH connection
- Git operations
- npm install & build
- Service restart
- Health checks

## Automatic Rollback (Optional)

If you need to revert to previous version:

```bash
# Find previous version
git tag -l | sort -V

# Create rollback tag
git tag v1.0.0-rollback v1.0.0

# Push to trigger deployment of old version
git push origin v1.0.0-rollback
```

## Support

- **GitHub Actions Documentation**: https://docs.github.com/en/actions
- **Deployment Guide**: See `DEPLOYMENT.md` in this repository
- **SSH Setup**: See production server setup in DEPLOYMENT.md
