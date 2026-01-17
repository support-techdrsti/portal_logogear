#!/bin/bash

# Deploy to staging environment
set -e

echo "🚀 Deploying to staging environment..."

# Set environment
export NODE_ENV=staging
export COMPOSE_FILE=deployment/docker-compose.staging.yml

# Build application
echo "🏗️ Building application..."
./deployment/scripts/build.sh

# Build Docker images
echo "🐳 Building Docker images..."
docker-compose -f $COMPOSE_FILE build

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f $COMPOSE_FILE down

# Start new containers
echo "▶️ Starting new containers..."
docker-compose -f $COMPOSE_FILE up -d

# Run database migrations
echo "🗄️ Running database migrations..."
docker-compose -f $COMPOSE_FILE exec app npm run migrate:prod

# Health check
echo "🏥 Performing health check..."
sleep 10
curl -f http://localhost:3000/health || exit 1

echo "✅ Staging deployment completed successfully!"