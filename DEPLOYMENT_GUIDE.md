# HP Tourism Platform - Customer DC Deployment Guide

## Overview
This guide covers deploying the HP Tourism Digital Ecosystem on customer's data center infrastructure.

## System Requirements

### Hardware Requirements
- **Application Server**: 4 CPU cores, 8 GB RAM, 100 GB SSD
- **Database Server**: 4 CPU cores, 16 GB RAM, 500 GB SSD (with backup storage)
- **Object Storage Server**: 2 CPU cores, 4 GB RAM, 2 TB HDD (scalable based on document volume)

### Software Requirements
- **Operating System**: Ubuntu 22.04 LTS or RHEL 8+
- **Node.js**: v20.x LTS
- **PostgreSQL**: v14+ with JSONB support
- **MinIO**: Latest stable version (for object storage)

---

## Component Installation

### 1. PostgreSQL Database Setup

```bash
# Install PostgreSQL 14+
sudo apt update
sudo apt install postgresql-14 postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql
CREATE DATABASE hp_tourism_db;
CREATE USER hp_tourism_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE hp_tourism_db TO hp_tourism_user;
\q
```

#### Enable WAL Archiving (Recommended for Production)

```bash
# Edit PostgreSQL configuration
sudo nano /etc/postgresql/14/main/postgresql.conf

# Add/modify these settings:
wal_level = replica
archive_mode = on
archive_command = 'cp %p /var/lib/postgresql/14/archive/%f'
max_wal_senders = 3
```

#### Configure Automated Backups

```bash
# Create backup script
sudo nano /usr/local/bin/backup-postgres.sh
```

```bash
#!/bin/bash
# PostgreSQL Backup Script
BACKUP_DIR="/backups/postgresql"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="hp_tourism_db"

# Create backup directory
mkdir -p $BACKUP_DIR

# Perform backup
pg_dump -U hp_tourism_user $DB_NAME | gzip > $BACKUP_DIR/backup_${DATE}.sql.gz

# Keep only last 7 days of backups
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: backup_${DATE}.sql.gz"
```

```bash
# Make executable
sudo chmod +x /usr/local/bin/backup-postgres.sh

# Add to crontab (daily at 2 AM)
sudo crontab -e
0 2 * * * /usr/local/bin/backup-postgres.sh
```

---

### 2. MinIO Object Storage Setup

MinIO provides S3-compatible object storage for document and image files.

```bash
# Download MinIO
wget https://dl.min.io/server/minio/release/linux-amd64/minio
chmod +x minio
sudo mv minio /usr/local/bin/

# Create MinIO user and directories
sudo useradd -r minio-user -s /sbin/nologin
sudo mkdir -p /data/minio
sudo chown minio-user:minio-user /data/minio

# Create MinIO systemd service
sudo nano /etc/systemd/system/minio.service
```

```ini
[Unit]
Description=MinIO Object Storage
Documentation=https://docs.min.io
After=network.target

[Service]
User=minio-user
Group=minio-user
WorkingDirectory=/usr/local/bin/

Environment="MINIO_ROOT_USER=admin"
Environment="MINIO_ROOT_PASSWORD=YourSecurePassword123"

ExecStart=/usr/local/bin/minio server /data/minio --console-address ":9001"

Restart=always
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

```bash
# Start MinIO service
sudo systemctl daemon-reload
sudo systemctl start minio
sudo systemctl enable minio

# Verify MinIO is running
curl http://localhost:9000/minio/health/live
```

#### Configure MinIO Buckets

Access MinIO Console at `http://server-ip:9001` and create:
- Bucket name: `hp-tourism-documents`
- Enable versioning
- Set lifecycle policies (optional: auto-delete after X years)

---

### 3. Application Deployment

```bash
# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Clone application repository
git clone <repository-url> /opt/hp-tourism
cd /opt/hp-tourism

# Install dependencies
npm install --production

# Create environment file
sudo nano .env
```

#### Environment Configuration (.env)

```env
# Database Configuration
DATABASE_URL=postgresql://hp_tourism_user:your_secure_password@localhost:5432/hp_tourism_db
PGHOST=localhost
PGPORT=5432
PGDATABASE=hp_tourism_db
PGUSER=hp_tourism_user
PGPASSWORD=your_secure_password

# Object Storage Configuration (MinIO)
STORAGE_PROVIDER=minio
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=admin
MINIO_SECRET_KEY=YourSecurePassword123
MINIO_BUCKET=hp-tourism-documents
MINIO_USE_SSL=false

# Application Configuration
NODE_ENV=production
PORT=5000
SESSION_SECRET=generate_random_64_char_string_here

# HimKosh Payment Gateway
HIMKOSH_MERCHANT_CODE=your_merchant_code
HIMKOSH_SERVICE_CODE=your_service_code
HIMKOSH_POST_URL=https://payment.himachal.nic.in/echallan/
HIMKOSH_VERIFY_URL=https://payment.himachal.nic.in/echallan/verify
HIMKOSH_RETURN_URL=https://your-domain.gov.in/payment/callback
```

```bash
# Build application
npm run build

# Run database migrations
npm run db:push

# Create systemd service
sudo nano /etc/systemd/system/hp-tourism.service
```

```ini
[Unit]
Description=HP Tourism Digital Platform
After=network.target postgresql.service minio.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/hp-tourism
Environment="NODE_ENV=production"
ExecStart=/usr/bin/node server/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Start application
sudo systemctl daemon-reload
sudo systemctl start hp-tourism
sudo systemctl enable hp-tourism

# Check status
sudo systemctl status hp-tourism
```

---

### 4. Nginx Reverse Proxy (Optional but Recommended)

```bash
# Install Nginx
sudo apt install nginx

# Configure Nginx
sudo nano /etc/nginx/sites-available/hp-tourism
```

```nginx
server {
    listen 80;
    server_name tourism.himachal.gov.in;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/hp-tourism /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Backup Strategy

### Database Backups
- **Daily**: Full PostgreSQL dump (automated via cron)
- **Retention**: 7 days on local server, 30 days on backup server
- **Recovery Time Objective (RTO)**: 1 hour
- **Recovery Point Objective (RPO)**: 24 hours

### Object Storage Backups
MinIO provides built-in replication. For additional safety:

```bash
# Sync MinIO data to backup location
rsync -avz --delete /data/minio/ /backups/minio/
```

---

## Monitoring & Maintenance

### Log Files
- **Application**: `/var/log/hp-tourism/app.log`
- **PostgreSQL**: `/var/log/postgresql/postgresql-14-main.log`
- **MinIO**: `journalctl -u minio -f`
- **Nginx**: `/var/log/nginx/access.log`, `/var/log/nginx/error.log`

### Health Checks
```bash
# Check application health
curl http://localhost:5000/api/health

# Check PostgreSQL
sudo -u postgres psql -c "SELECT 1"

# Check MinIO
curl http://localhost:9000/minio/health/live
```

### Performance Monitoring
- Install `pgAdmin` for PostgreSQL monitoring (optional)
- Monitor disk usage: `df -h`
- Monitor system resources: `htop`

---

## Security Checklist

- [ ] Firewall configured (allow only necessary ports)
- [ ] SSL certificates installed for HTTPS
- [ ] Database passwords changed from defaults
- [ ] MinIO credentials changed from defaults
- [ ] Session secret generated (64+ random characters)
- [ ] Regular security updates enabled
- [ ] Backup verification tested
- [ ] Access logs enabled and monitored

---

## Troubleshooting

### Application won't start
```bash
# Check logs
journalctl -u hp-tourism -n 50

# Verify environment variables
sudo cat /opt/hp-tourism/.env

# Check database connectivity
psql -U hp_tourism_user -h localhost -d hp_tourism_db
```

### MinIO connection issues
```bash
# Verify MinIO is running
systemctl status minio

# Test connectivity
curl http://localhost:9000/minio/health/live
```

### Database performance issues
```bash
# Check connections
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"

# Analyze slow queries
sudo -u postgres psql hp_tourism_db -c "SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"
```

---

## Support Contact

For deployment assistance:
- Technical Team: [Your contact]
- Email: [Your email]
- Emergency Hotline: [Your phone]

---

**Last Updated**: November 2025  
**Version**: 1.0
