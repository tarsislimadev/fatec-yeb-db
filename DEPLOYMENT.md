# Phone List System - Deployment Guide

## Production Deployment

### Option 1: Docker Compose (Recommended for MVP)

#### Prerequisites
- Docker 20.10+
- Docker Compose 2.0+

#### Setup

1. **Clone repository**
```bash
git clone <repo-url>
cd fatec-yeb-db
```

2. **Configure environment**
```bash
# Create production .env for backend
cat > backend/.env << EOF
NODE_ENV=production
DATABASE_URL=postgresql://user:password@postgres:5432/phone_list
REDIS_URL=redis://redis:6379
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRATION=1h
FRONTEND_URL=https://yourdomain.com
PORT=3000

# Optional: OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=

# Optional: Email
SENDGRID_API_KEY=
EOF
```

3. **Build and deploy**
```bash
# Build images
docker-compose build

# Start all services
docker-compose up -d

# Initialize database
docker-compose exec backend npm run migrate

# Seed test data (optional)
docker-compose exec backend npm run seed

# Check logs
docker-compose logs -f
```

4. **Verify deployment**
```bash
# Health check
curl http://localhost:3000/health

# List phones (requires token from login)
curl http://localhost/api/v1/phones -H "Authorization: Bearer YOUR_TOKEN"
```

### Option 2: Manual Deployment (Advanced)

#### Backend on Linux

1. **Install dependencies**
```bash
sudo apt-get update
sudo apt-get install -y nodejs npm postgresql redis-server
```

2. **Setup application**
```bash
cd /opt/phone-list
git clone <repo-url> .
cd backend
npm install --production
```

3. **Configure database**
```bash
sudo -u postgres createdb phone_list
sudo -u postgres psql phone_list < src/db/schema.sql
```

4. **Create systemd service**
```bash
sudo tee /etc/systemd/system/phone-list-api.service > /dev/null << EOF
[Unit]
Description=Phone List API
After=network.target postgresql.service redis-server.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/phone-list/backend
Environment="NODE_ENV=production"
EnvironmentFile=/opt/phone-list/backend/.env
ExecStart=/usr/bin/node src/server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable phone-list-api
sudo systemctl start phone-list-api
```

5. **Verify service**
```bash
sudo systemctl status phone-list-api
curl http://localhost:3000/health
```

#### Frontend on Nginx

1. **Build**
```bash
cd /opt/phone-list/frontend
npm install
npm run build
```

2. **Configure Nginx**
```bash
sudo tee /etc/nginx/sites-available/phone-list > /dev/null << 'EOF'
server {
    listen 80;
    server_name yourdomain.com;

    root /opt/phone-list/frontend/dist;
    index index.html;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
}
EOF

sudo ln -s /etc/nginx/sites-available/phone-list /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Option 3: Cloud Deployment

This repository no longer includes that cloud deployment path.

#### AWS Elastic Beanstalk + RDS + ElastiCache

See [docs/aws-deployment.md](./docs/aws-deployment.md) for detailed AWS setup.

---

## Configuration Management

### Environment Variables

**Backend** (`backend/.env`)
```env
# Required
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/phone_list
REDIS_URL=redis://host:6379
JWT_SECRET=min-32-character-random-string
FRONTEND_URL=https://yourdomain.com

# Optional
JWT_EXPIRATION=1h
PORT=3000
SENDGRID_API_KEY=

# OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
```

### Secrets Management

**Using Docker Secrets** (Docker Swarm)
```bash
# Create secrets
echo "your-jwt-secret" | docker secret create jwt_secret -
echo "postgresql://..." | docker secret create db_url -

# Reference in compose
services:
  backend:
    secrets:
      - jwt_secret
      - db_url
```

**Using Environment Files** (Recommended)
```bash
# Create .env.production
cp backend/.env.example backend/.env.production

# Edit with production values
vim backend/.env.production

# Load in Docker Compose
docker-compose --env-file backend/.env.production up -d
```

---

## Database Backup & Recovery

### PostgreSQL Backup

```bash
# Dump database
docker-compose exec postgres pg_dump -U phone_user phone_list > backup.sql

# Restore database
docker-compose exec -T postgres psql -U phone_user phone_list < backup.sql

# Scheduled backup (cron)
0 2 * * * docker-compose exec -T postgres pg_dump -U phone_user phone_list > /backups/phone_list_$(date +\%Y\%m\%d).sql
```

### Redis Backup

```bash
# RDB snapshot is automatic
docker cp phone_list_cache:/data/dump.rdb ./redis_backup.rdb

# Or enable AOF (append-only file) in redis.conf
appendonly yes
```

---

## Monitoring & Logging

### Health Checks

```bash
# API health
curl http://localhost:3000/health

# Database connection
docker-compose exec backend node -e "require('./src/db').testConnection()"

# Redis connection
redis-cli -u redis://localhost:6379 ping
```

### Logs

```bash
# View all logs
docker-compose logs -f

# Backend only
docker-compose logs -f backend

# Frontend only
docker-compose logs -f frontend

# Database only
docker-compose logs -f postgres
```

### Metrics

Add Application Insights or New Relic:

```bash
# Install APM agent
npm install --save @newrelic/nodejs-agent

# Configure newrelic.js
# See backend/README.md for details
```

---

## SSL/TLS Setup

### With Certbot & Let's Encrypt

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --nginx -d yourdomain.com

# Auto-renew (cron)
0 3 * * * certbot renew --quiet

# Update Nginx
sudo tee /etc/nginx/sites-available/phone-list > /dev/null << EOF
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    root /opt/phone-list/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
EOF

sudo nginx -t
sudo systemctl restart nginx
```

---

## Performance Tuning

### Database Optimization

```sql
-- Check slow queries
SELECT query, mean_exec_time, max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Analyze tables
ANALYZE;

-- Reindex
REINDEX DATABASE phone_list;
```

### Backend Optimization

```bash
# Enable compression
# Already configured in nginx.conf

# Increase Node.js memory
NODE_OPTIONS="--max-old-space-size=2048" npm start

# Enable clustering (for multi-core)
# See backend/src/server.js for cluster module integration
```

### Caching Headers

```nginx
# Add to Nginx config
location ~* \.(js|css|png|jpg|jpeg|gif|ico)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

---

## Scaling

### Horizontal Scaling (Load Balancing)

```yaml
# docker-compose.yml with load balancer
version: '3.8'

services:
  nginx-lb:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx-lb.conf:/etc/nginx/nginx.conf
    depends_on:
      - backend1
      - backend2

  backend1:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://...
      REDIS_URL: redis://redis:6379

  backend2:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://...
      REDIS_URL: redis://redis:6379

  postgres:
    image: postgres:14-alpine

  redis:
    image: redis:7-alpine
```

### Vertical Scaling

- Increase container memory: `docker-compose up -d --memory 4g`
- Increase database connection pool
- Add read replicas for PostgreSQL

---

## Troubleshooting

### Services Won't Start

```bash
# Check logs
docker-compose logs

# Verify ports are available
netstat -tlnp | grep 3000

# Clean and rebuild
docker-compose down -v
docker-compose build --no-cache
docker-compose up
```

### Database Connection Issues

```bash
# Test connection
docker-compose exec postgres psql -U phone_user -d phone_list -c "SELECT NOW();"

# Check environment
docker-compose exec backend env | grep DATABASE_URL

# Run migration
docker-compose exec backend npm run migrate
```

### API Returns 500 Errors

```bash
# Check backend logs
docker-compose logs -f backend

# Verify database schema
docker-compose exec postgres psql -U phone_user -d phone_list -c "\dt"

# Check Redis connection
redis-cli -u redis://localhost:6379 ping
```

---

## Maintenance

### Regular Tasks

- **Weekly**: Check disk space, verify backups
- **Monthly**: Review logs, update dependencies
- **Quarterly**: Security audit, performance review

### Updates

```bash
# Update Node.js dependencies
npm audit
npm update
npm install

# Test thoroughly
npm test

# Deploy
docker-compose build
docker-compose up -d
```

---

## Security Checklist

- [ ] Change default passwords in `docker-compose.yml`
- [ ] Set strong JWT_SECRET (min 32 characters)
- [ ] Enable SSL/TLS with valid certificate
- [ ] Configure CORS for frontend domain only
- [ ] Set up firewall rules (only ports 80, 443)
- [ ] Enable database authentication
- [ ] Set Redis password (if exposed)
- [ ] Configure backup retention
- [ ] Enable audit logging
- [ ] Regular security patches

---

For detailed production guidance, see:
- [Backend README](./backend/README.md)
- [Frontend README](./frontend/README.md)
- [Security Best Practices](./docs/SECURITY.md)
