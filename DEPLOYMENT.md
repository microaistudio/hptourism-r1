# HP Tourism Portal - Deployment Guide

This guide helps you deploy the HP Tourism portal to a new VM with the same database state as your development environment.

## Prerequisites

- Node.js 20+ installed
- PostgreSQL database available
- Git installed

## Step 1: Clone Repository

```bash
git clone https://github.com/microaistudio/hptourism-r1.git
cd hptourism-r1
```

## Step 2: Install Dependencies

```bash
npm install
```

**⚠️ IMPORTANT:** Always run `npm install` after pulling new code to ensure all dependencies are up to date.

## Step 3: Configure Environment Variables

Create a `.env` file in the root directory:

```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database

# Session Secret (generate a random string)
SESSION_SECRET=your-random-secret-here-change-this-in-production

# Object Storage (if using)
DEFAULT_OBJECT_STORAGE_BUCKET_ID=your-bucket-id
PUBLIC_OBJECT_SEARCH_PATHS=path-to-public-objects
PRIVATE_OBJECT_DIR=path-to-private-objects
```

## Step 4: Run Database Migrations

This creates all required tables in your database:

```bash
npm run db:push
```

If you get errors, use force mode:

```bash
npm run db:push -- --force
```

## Step 5: Seed Initial Data

This creates the default admin user and essential data:

```bash
npx tsx server/seed.ts
```

**Default Admin Credentials:**
- Mobile: `9999999999`
- Password: `admin123`
- ⚠️ **IMPORTANT:** Change this password immediately after first login!

The seed script is **idempotent** - safe to run multiple times. It will:
- Create admin user if it doesn't exist
- Update existing admin user to ensure correct role
- Not duplicate data

## Step 6: Build for Production

```bash
npm run build
```

## Step 7: Start Application

### Development Mode:
```bash
npm run dev
```

### Production Mode:
```bash
npm start
```

## Step 8: Verify Deployment

1. Open browser: `http://your-server-ip:5000`
2. Login with admin credentials (9999999999 / admin123)
3. You should see the Admin Dashboard with User Management
4. **Change the default admin password immediately**

---

## Troubleshooting

### Admin User Shows Wrong Dashboard

If admin user sees property owner dashboard instead of admin panel:

```bash
# Connect to your PostgreSQL database
psql $DATABASE_URL

# Check user role
SELECT mobile, full_name, role FROM users WHERE mobile = '9999999999';

# Fix role if needed
UPDATE users SET role = 'admin' WHERE mobile = '9999999999';
```

### Database Migration Errors

If `db:push` fails:

1. Check DATABASE_URL is correct
2. Ensure PostgreSQL is running
3. Try with `--force` flag:
   ```bash
   npm run db:push -- --force
   ```

### Port Already in Use

If port 5000 is taken, modify `server/index.ts` or use environment variable:

```bash
PORT=3000 npm start
```

---

## Production Best Practices

1. **Use a reverse proxy** (Nginx/Apache) in front of Node.js
2. **Use PM2 or systemd** to keep the app running
3. **Set up SSL/TLS** for HTTPS
4. **Change default admin password** immediately
5. **Set strong SESSION_SECRET** (not the example one)
6. **Configure firewall** to allow only necessary ports
7. **Set up database backups**
8. **Use environment-specific .env files** (don't commit to git)

## PM2 Setup (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start npm --name "hp-tourism" -- start

# Save PM2 configuration
pm2 save

# Setup startup script
pm2 startup
```

## Nginx Reverse Proxy Example

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Database Schema

The application uses PostgreSQL with Drizzle ORM. Schema is defined in `shared/schema.ts`.

Main tables:
- `users` - All system users (admin, officers, property owners)
- `homestay_applications` - Property registration applications
- `documents` - File upload metadata
- `payments` - Payment records
- `notifications` - System notifications
- `production_stats` - Analytics data

## Updating Existing Deployment

When pulling new code from Git:

```bash
cd ~/projects/hptourism-r1.1
git pull origin main
npm install           # ← CRITICAL: Always install new dependencies
npm run build
pm2 restart hp-tourism
```

Common mistake: Forgetting to run `npm install` after `git pull` will cause build failures if new packages were added.

---

## Support

For issues or questions:
1. Check logs: Application logs, PostgreSQL logs
2. Review this deployment guide
3. Check `replit.md` for system architecture details

### Common Build Errors

**Error: "Rollup failed to resolve import"**
- Cause: Missing dependencies
- Fix: Run `npm install` before `npm run build`
