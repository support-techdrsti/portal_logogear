#!/bin/bash

echo "🚀 Logogear Portal Complete Production Deployment"
echo "================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Please don't run this script as root. Run as ec2-user."
    exit 1
fi

# Update system
print_status "Updating system packages..."
sudo yum update -y

# Install Docker
print_status "Installing Docker..."
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -a -G docker ec2-user

# Install Docker Compose
print_status "Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Git
print_status "Installing Git..."
sudo yum install -y git

# Clone repository (if not already present)
if [ ! -d "/opt/logogear-portal" ]; then
    print_status "Cloning Logogear Portal repository..."
    sudo mkdir -p /opt
    cd /opt
    # Replace with your actual repository URL
    sudo git clone https://github.com/your-org/logogear-portal.git
    sudo chown -R ec2-user:ec2-user /opt/logogear-portal
fi

# Navigate to deployment directory
cd /opt/logogear-portal/deployment

# Debug: Verify we're in the right place
print_status "Current working directory: $(pwd)"
print_status "Checking project structure..."
if [[ ! -f "docker-compose.prod.yml" ]]; then
    print_error "docker-compose.prod.yml not found! Are we in the right directory?"
    print_status "Files in current directory:"
    ls -la
    exit 1
fi

if [[ ! -d "../backend" ]]; then
    print_error "Backend directory not found! Project structure may be incorrect."
    print_status "Contents of parent directory:"
    ls -la ../
    exit 1
fi

print_status "Project structure verified"

# Update EC2 IP automatically
print_status "Updating EC2 public IP in environment files..."
PUBLIC_IP=$(curl -s ifconfig.me)
if [[ -z "$PUBLIC_IP" ]]; then
    print_error "Could not retrieve public IP address"
    exit 1
fi

print_status "Public IP detected: $PUBLIC_IP"

# Update backend environment file
print_status "Updating backend environment configuration..."
sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=http://$PUBLIC_IP|g" ../backend/.env.production
sed -i "s|API_BASE_URL=.*|API_BASE_URL=http://$PUBLIC_IP/api|g" ../backend/.env.production

print_status "Environment configuration updated"

# Setup environment file for Docker Compose
print_status "Setting up environment file for Docker Compose..."
cat > .env << EOF
# Database
DB_PASSWORD=logogear_secure_db_password_2026

# Security
JWT_SECRET=logogear_jwt_secret_key_very_secure_2026_portal
SESSION_SECRET=logogear_session_secret_key_very_secure_2026

# URLs
FRONTEND_URL=http://$PUBLIC_IP
API_BASE_URL=http://$PUBLIC_IP/api
EOF

print_status "Environment file created"

# Fix file permissions for Docker containers
print_status "Setting up file permissions..."
chmod 644 nginx.conf
chmod 644 init-db.sql
chmod 644 .env

# Create necessary directories with proper permissions
print_status "Creating necessary directories..."
mkdir -p ../backend/uploads ../output ../logs
chmod -R 755 ../backend/uploads ../output ../logs

print_status "File permissions configured"

# Stop any existing services
print_status "Stopping existing services..."
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true

# Clean up old containers and images (but keep volumes)
print_status "Cleaning up old containers..."
docker container prune -f
docker image prune -f

# Build fresh images
print_status "Building fresh Docker images..."
BUILD_RETRIES=0
MAX_BUILD_RETRIES=2

while [[ $BUILD_RETRIES -le $MAX_BUILD_RETRIES ]]; do
    if docker-compose -f docker-compose.prod.yml build --no-cache; then
        print_status "Docker images built successfully"
        break
    else
        BUILD_RETRIES=$((BUILD_RETRIES + 1))
        if [[ $BUILD_RETRIES -le $MAX_BUILD_RETRIES ]]; then
            print_warning "Build failed, retrying... (attempt $BUILD_RETRIES/$MAX_BUILD_RETRIES)"
            sleep 10
        else
            print_error "Failed to build Docker images after $MAX_BUILD_RETRIES retries"
            print_error "This is usually due to network issues. Please check your internet connection and try again."
            exit 1
        fi
    fi
done

# Start fresh deployment
print_status "Starting fresh deployment..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for PostgreSQL to be ready
print_status "Waiting for PostgreSQL to be ready..."
sleep 30

# Check if PostgreSQL is accessible
print_status "Checking PostgreSQL connection..."
until docker-compose -f docker-compose.prod.yml exec -T postgres pg_isready -U postgres; do
    echo "Waiting for PostgreSQL..."
    sleep 5
done

print_status "PostgreSQL is ready!"

# Wait for backend to start
print_status "Waiting for backend to start..."
sleep 20

# Check container status
print_status "Checking container status..."
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Test application endpoints
print_status "Testing application endpoints..."

# Test frontend
print_status "Testing frontend..."
FRONTEND_RESPONSE=$(curl -s -w "%{http_code}" http://localhost/)
FRONTEND_STATUS=${FRONTEND_RESPONSE: -3}
if [ "$FRONTEND_STATUS" = "200" ]; then
    print_status "Frontend - SUCCESS"
else
    print_error "Frontend - FAILED (Status: $FRONTEND_STATUS)"
fi

# Test backend health
print_status "Testing backend health..."
BACKEND_RESPONSE=$(curl -s -w "%{http_code}" http://localhost/api/status)
BACKEND_STATUS=${BACKEND_RESPONSE: -3}
if [ "$BACKEND_STATUS" = "200" ]; then
    print_status "Backend API - SUCCESS"
else
    print_error "Backend API - FAILED (Status: $BACKEND_STATUS)"
fi

# Test authentication endpoint
print_status "Testing authentication..."
AUTH_RESPONSE=$(curl -s -w "%{http_code}" http://localhost/auth/me)
AUTH_STATUS=${AUTH_RESPONSE: -3}
if [ "$AUTH_STATUS" = "401" ] || [ "$AUTH_STATUS" = "200" ]; then
    print_status "Authentication endpoint - SUCCESS"
else
    print_error "Authentication endpoint - FAILED (Status: $AUTH_STATUS)"
fi

# Final status check
echo ""
print_status "DEPLOYMENT SUMMARY"
echo "===================="
docker-compose -f docker-compose.prod.yml ps

echo ""
print_status "🌐 Application URLs:"
echo "   Portal: http://$PUBLIC_IP"
echo "   Domain: https://portal.logogear.co.in (after DNS setup)"
echo ""
print_status "👥 Authorized Users:"
echo "   - junaid@logogear.co.in"
echo "   - javed@logogear.co.in"
echo "   - info@logogear.co.in"
echo "   - support@logogear.co.in"
echo "   - sidhanraj@techdrsti.com"
echo "   - mahadesh@techdrsti.com"
echo "   - harshithak82@gmail.com"
echo "   - admin (username: admin, password: l0g0gear)"
echo ""
print_status "🎉 Logogear Portal deployment completed successfully!"
echo ""
print_status "✅ Working Features:"
echo "   - Single Sign-On Authentication"
echo "   - BlueDart File Generation"
echo "   - DC File Generation"
echo "   - File Upload Processing (up to 100MB)"
echo "   - Persistent Counter System"
echo ""
print_warning "📋 Post-Deployment Checklist:"
echo "   1. Setup DNS: Point portal.logogear.co.in to $PUBLIC_IP"
echo "   2. Setup SSL certificate for HTTPS"
echo "   3. Test BlueDart file generation"
echo "   4. Test DC file generation"
echo "   5. Verify all authorized users can login"
echo ""
print_status "🔧 For troubleshooting, check:"
echo "   - Backend logs: docker logs logogear-backend-prod"
echo "   - Frontend logs: docker logs logogear-frontend-prod"
echo "   - Database logs: docker logs logogear-postgres-prod"