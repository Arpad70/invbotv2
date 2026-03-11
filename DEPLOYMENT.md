# InvBot v2 - Deployment Guide

## Deployment via SSH

### Prerequisites
- SSH access to production server
- Node.js 18+ installed
- MySQL/MariaDB database ready
- Git installed on production server

### Deployment Steps

#### 1. On Production Server - Initial Setup

```bash
# SSH into your server
ssh user@your-server.com

# Clone the repository
git clone <your-git-repo-url> /var/www/invbotv2
cd /var/www/invbotv2

# Install dependencies
npm install
cd frontend && npm install && cd ..

# Create .env file from .env.example
cp .env.example .env

# Edit .env with production credentials
nano .env
```

#### 2. Configure Environment Variables

**Backend (.env):**
```
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Database
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=invbotv2_db
DB_USER=invbotv2_user
DB_PASSWORD=<strong-password>
DB_CONNECTION_LIMIT=20

# Polymarket
POLYMARKET_API_BASE_URL=https://clob.polymarket.com
WALLET_PRIVATE_KEY=0x<your-private-key>
WALLET_ADDRESS=0x<your-address>
```

**Frontend (.env):**
```
VITE_API_URL=https://api.yourdomain.com
VITE_APP_NAME=InvBot
```

#### 3. Build Application

```bash
# Build backend
npm run build

# Build frontend
cd frontend
npm run build
cd ..
```

#### 4. Setup Database

```bash
# Create database and user (if not exists)
mysql -u root -p
```

```sql
CREATE DATABASE invbotv2_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'invbotv2_user'@'localhost' IDENTIFIED BY '<strong-password>';
GRANT ALL PRIVILEGES ON invbotv2_db.* TO 'invbotv2_user'@'localhost';
FLUSH PRIVILEGES;
```

```bash
# Import schema
mysql -u invbotv2_user -p invbotv2_db < database_schema.sql
```

#### 5. Setup Systemd Service

Create `/etc/systemd/system/invbot.service`:

```ini
[Unit]
Description=InvBot v2 Trading System
After=network.target mysql.service
Wants=mysql.service

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

```bash
# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable invbot
sudo systemctl start invbot

# Check status
sudo systemctl status invbot
```

#### 6. Setup Nginx Reverse Proxy

Create `/etc/nginx/sites-available/invbot`:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name api.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # API endpoints
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeout for trading operations
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Frontend static files
    location / {
        root /var/www/invbotv2/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/invbot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 7. Setup SSL Certificate (Let's Encrypt)

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d api.yourdomain.com
```

#### 8. Monitoring & Logs

```bash
# View application logs
tail -f /var/log/invbot.log
tail -f /var/log/invbot-error.log

# Check system service
journalctl -u invbot -f

# Database connection test
mysql -u invbotv2_user -p -h localhost invbotv2_db -e "SELECT COUNT(*) FROM users;"
```

### Post-Deployment Verification

```bash
# Health check
curl -X GET https://api.yourdomain.com/health

# Check API version
curl -X GET https://api.yourdomain.com/api/v1/version

# Check frontend
curl -X GET https://api.yourdomain.com/

# Check logs
sudo journalctl -u invbot --no-pager | tail -50
```

### Updating Application

```bash
cd /var/www/invbotv2

# Pull latest changes
git pull origin master

# Install any new dependencies
npm install
cd frontend && npm install && cd ..

# Database migrations (if any)
npm run migrations

# Rebuild application
npm run build

# Restart service
sudo systemctl restart invbot

# Verify
sudo systemctl status invbot
```

### Backup Strategy

```bash
# Daily database backup
0 2 * * * mysqldump -u invbotv2_user -p'<password>' invbotv2_db | gzip > /backups/invbot_$(date +\%Y\%m\%d).sql.gz

# Weekly full backup
0 3 * * 0 tar -czf /backups/invbot_$(date +\%Y\%m\%d).tar.gz /var/www/invbotv2
```

### Troubleshooting

#### Service Won't Start
```bash
# Check logs
journalctl -u invbot -n 50 --no-pager

# Verify .env file exists and permissions
ls -la /var/www/invbotv2/.env

# Check Node.js version
node --version
```

#### Database Connection Failed
```bash
# Test MySQL connection
mysql -u invbotv2_user -p -h localhost
```

#### Port Already in Use
```bash
# Find process using port 3000
sudo lsof -i :3000

# Kill process
sudo kill -9 <PID>
```

#### Frontend Build Issues
```bash
cd /var/www/invbotv2/frontend
npm run build -- --verbose
```

## Performance Optimization

1. **Enable Gzip compression** in Nginx config
2. **Setup Redis** for caching (optional)
3. **Configure database connection pooling** (increase DB_CONNECTION_LIMIT)
4. **Setup CDN** for static assets
5. **Monitor system resources** with Prometheus/Grafana

## Security Recommendations

1. ✅ Use HTTPS/SSL (Let's Encrypt)
2. ✅ Implement rate limiting in Nginx
3. ✅ Keep dependencies updated: `npm audit`
4. ✅ Use strong database passwords
5. ✅ Restrict API access with firewall rules
6. ✅ Enable database backups
7. ✅ Monitor logs for suspicious activity
8. ✅ Use environment variables for all secrets

## Support

For issues, check:
- [CLOB_INTEGRATION.md](./CLOB_INTEGRATION.md) - Polymarket integration details
- [README.md](./README.md) - Project overview
- [PROJECT_STATUS.md](./PROJECT_STATUS.md) - Current status
