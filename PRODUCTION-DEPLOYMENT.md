# Production Deployment Guide

## Quick Production Deployment

For efficient production deployment without development overhead:

### 1. One-Command Deployment

```bash
npm run deploy:prod
```

This will:

- Build optimized production bundle
- Transfer files to production server
- Install production dependencies only
- Configure PM2 for process management
- Start the application

### 2. Manual Deployment Steps

If you prefer manual control:

```bash
# 1. Build for production
npm run build:prod

# 2. Run the optimized deployment script
./deploy-production-optimized.sh

# 3. Or deploy manually to your server
rsync -avz --exclude='node_modules' . user@server:~/verus-dapp/
ssh user@server 'cd ~/verus-dapp && npm ci --production && pm2 restart verus-explorer'
```

## Production Configuration

### Environment Variables

Copy `env.production.template` to `.env.production` and update:

```bash
cp env.production.template .env.production
```

**Required settings:**

- `VERUS_RPC_HOST` - Your Verus daemon RPC endpoint
- `VERUS_RPC_USER` - RPC username
- `VERUS_RPC_PASSWORD` - RPC password
- `JWT_SECRET` - Secure random string (32+ characters)

### Server Requirements

**Minimum:**

- 2GB RAM
- 1 CPU core
- 10GB storage

**Recommended:**

- 4GB RAM
- 2+ CPU cores
- 20GB storage
- SSD storage

### Dependencies

**Required:**

- Node.js 18+
- Redis (for caching)
- PM2 (for process management)

**Install on Ubuntu:**

```bash
# Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Redis
sudo apt-get install redis-server
sudo systemctl enable redis-server

# PM2
sudo npm install -g pm2
```

## Performance Optimizations

### Production Build Features

- **Tree shaking** - Removes unused code
- **Minification** - Compresses JavaScript/CSS
- **Console removal** - Removes console.log statements
- **Image optimization** - WebP/AVIF format support
- **Bundle analysis** - Use `npm run analyze` to check bundle size

### Caching Strategy

- **Blockchain data**: 30 seconds
- **Block data**: 5 minutes
- **Transaction data**: 2 minutes
- **Address data**: 1 minute
- **Mempool data**: 10 seconds

### Rate Limiting

- **Window**: 15 minutes
- **Max requests**: 200 per window
- **Configurable** via environment variables

## Monitoring & Maintenance

### Health Checks

```bash
# Application health
curl http://your-server:3000/api/health

# ZMQ status
curl http://your-server:3000/api/zmq/status

# Batch info
curl http://your-server:3000/api/batch-info
```

### PM2 Management

```bash
# View status
pm2 status

# View logs
pm2 logs verus-explorer

# Restart application
pm2 restart verus-explorer

# Monitor resources
pm2 monit
```

### Log Files

- **Application logs**: PM2 handles this
- **Access logs**: Built into Next.js
- **Error logs**: Check PM2 logs

## Security Considerations

### Firewall Configuration

```bash
# Allow HTTP traffic
sudo ufw allow 3000/tcp

# Allow RPC access (if needed externally)
sudo ufw allow 18843/tcp

# Allow SSH
sudo ufw allow ssh
```

### Environment Security

- Use strong JWT secrets (32+ characters)
- Keep RPC credentials secure
- Use HTTPS in production (setup reverse proxy)
- Regular security updates

### SSL/HTTPS Setup (Optional)

Use Nginx as reverse proxy:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Troubleshooting

### Common Issues

**Application won't start:**

- Check `.env.production` configuration
- Verify Verus daemon is running
- Check PM2 logs: `pm2 logs verus-explorer`

**Slow performance:**

- Increase cache TTL values
- Add more RAM
- Use SSD storage
- Enable Redis caching

**Connection errors:**

- Verify RPC credentials
- Check firewall settings
- Ensure Verus daemon is accessible

### Debug Mode

Enable debug logging by setting:

```bash
NODE_ENV=production
DEBUG=verus:*
```

## Updates

To update the production deployment:

```bash
# Pull latest changes
git pull origin main

# Deploy updated version
npm run deploy:prod
```

The deployment script handles:

- Building new version
- Transferring files
- Restarting services
- Zero-downtime updates
