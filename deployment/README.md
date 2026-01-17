# Logogear Portal AWS Deployment Guide

This guide provides instructions for deploying the Logogear Portal to AWS EC2, following the same deployment pattern as the JTSF project.

## Prerequisites

- AWS EC2 instance (t3.medium or larger recommended)
- Domain: `portal.logogear.co.in` pointing to the EC2 instance
- SSH access to the EC2 instance

## Quick Deployment

1. **SSH into your EC2 instance:**
   ```bash
   ssh -i your-key.pem ec2-user@your-ec2-ip
   ```

2. **Clone the repository:**
   ```bash
   sudo mkdir -p /opt
   cd /opt
   sudo git clone https://github.com/your-org/logogear-portal.git
   sudo chown -R ec2-user:ec2-user /opt/logogear-portal
   ```

3. **Run the deployment script:**
   ```bash
   cd /opt/logogear-portal/deployment
   chmod +x complete-deployment.sh
   ./complete-deployment.sh
   ```

## What the Deployment Script Does

1. **System Setup:**
   - Updates system packages
   - Installs Docker and Docker Compose
   - Installs Git

2. **Application Setup:**
   - Builds Docker images for frontend and backend
   - Sets up PostgreSQL database
   - Configures Nginx reverse proxy
   - Creates necessary directories and permissions

3. **Configuration:**
   - Updates environment variables with EC2 public IP
   - Sets up database with authorized users
   - Configures SSL-ready Nginx (manual SSL setup required)

## Authorized Users

The following users are authorized to access the portal:

- `junaid@logogear.co.in`
- `javed@logogear.co.in`
- `info@logogear.co.in`
- `support@logogear.co.in`
- `sidhanraj@techdrsti.com`
- `mahadesh@techdrsti.com`
- `harshithak82@gmail.com`

**Admin Access:**
- Username: `admin`
- Password: `l0g0gear`

## Features

- **Single Sign-On Authentication** with authorized email addresses
- **BlueDart File Generation** with persistent counter system
- **DC File Generation** using Logo Gear templates
- **File Upload Processing** up to 100MB
- **Audit Logging** for all operations

## Post-Deployment Steps

1. **Setup DNS:**
   ```bash
   # Point portal.logogear.co.in to your EC2 public IP
   # Update your DNS provider with an A record
   ```

2. **Setup SSL Certificate (Optional but Recommended):**
   ```bash
   # Install Certbot
   sudo yum install -y certbot python3-certbot-nginx
   
   # Get SSL certificate
   sudo certbot --nginx -d portal.logogear.co.in
   ```

3. **Test the Application:**
   - Visit `http://your-ec2-ip` or `https://portal.logogear.co.in`
   - Login with authorized email or admin credentials
   - Test BlueDart and DC file generation

## Troubleshooting

### Check Container Status
```bash
cd /opt/logogear-portal/deployment
docker-compose -f docker-compose.prod.yml ps
```

### View Logs
```bash
# Backend logs
docker logs logogear-backend-prod

# Frontend logs  
docker logs logogear-frontend-prod

# Database logs
docker logs logogear-postgres-prod
```

### Restart Services
```bash
cd /opt/logogear-portal/deployment
docker-compose -f docker-compose.prod.yml restart
```

### Update Application
```bash
cd /opt/logogear-portal
git pull origin main
cd deployment
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
```

## Architecture

```
Internet → Nginx (Port 80/443) → Backend (Port 3006) → PostgreSQL (Port 5432)
                ↓
           Frontend (React SPA)
```

## File Structure

```
deployment/
├── docker-compose.prod.yml    # Production Docker Compose
├── nginx.conf                 # Nginx configuration
├── init-db.sql               # Database initialization
├── complete-deployment.sh     # Main deployment script
└── README.md                 # This file

backend/
├── Dockerfile.prod           # Backend production Dockerfile
└── .env.production          # Production environment variables

frontend/
├── Dockerfile.prod          # Frontend production Dockerfile
└── nginx.prod.conf         # Frontend Nginx configuration
```

## Security Notes

- All containers run as non-root users
- Database is isolated in Docker network
- File uploads are validated and size-limited
- Admin credentials should be changed after deployment
- SSL should be enabled for production use

## Support

For deployment issues or questions:
- Check logs using the troubleshooting commands above
- Verify all containers are running
- Ensure EC2 security groups allow HTTP/HTTPS traffic
- Contact the development team for application-specific issues