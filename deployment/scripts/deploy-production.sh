#!/bin/bash

# Deploy to production environment
set -e

echo "🚀 Deploying to production environment..."

# Confirmation prompt
read -p "Are you sure you want to deploy to PRODUCTION? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

# Set environment
export NODE_ENV=production
export COMPOSE_FILE=deployment/docker-compose.prod.yml

# Build application
echo "🏗️ Building application..."
./deployment/scripts/build.sh

# Run tests
echo "🧪 Running tests..."
cd backend && npm test && cd ..

# Build Docker images
echo "🐳 Building Docker images..."
docker-compose -f $COMPOSE_FILE build

# Backup database
echo "💾 Creating database backup..."
./deployment/scripts/backup-db.sh

# Deploy with zero downtime
echo "🔄 Performing zero-downtime deployment..."
docker-compose -f $COMPOSE_FILE up -d --no-deps app

# Run database migrations
echo "🗄️ Running database migrations..."
docker-compose -f $COMPOSE_FILE exec app npm run migrate:prod

# Health check
echo "🏥 Performing health check..."
sleep 15
curl -f https://portal.logogear.co.in/health || exit 1

echo "✅ Production deployment completed successfully!"