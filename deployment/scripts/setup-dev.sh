#!/bin/bash

# Development environment setup script
set -e

echo "🚀 Setting up development environment..."

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ required. Current: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) found"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed"
    exit 1
fi

echo "✅ Docker found"

# Setup environment file
echo "⚙️ Setting up environment configuration..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env file from template"
    echo "⚠️  Please update .env with your configuration"
else
    echo "✅ .env file already exists"
fi

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend && npm install && cd ..

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend && npm install && cd ..

# Start development databases
echo "🗄️ Starting development databases..."
docker-compose -f deployment/docker-compose.dev.yml up -d db redis

# Wait for database
echo "⏳ Waiting for database to be ready..."
sleep 10

# Run database migrations
echo "🗄️ Running database migrations..."
cd backend && npm run migrate && cd ..

# Seed database
echo "🌱 Seeding database..."
cd backend && npm run db:seed && cd ..

# Create directories
echo "📁 Creating necessary directories..."
mkdir -p logs uploads data templates output

echo "✅ Development environment setup complete!"
echo ""
echo "🎯 Next steps:"
echo "1. Update your .env file with proper configuration"
echo "2. Start development: npm run dev"
echo "3. Open http://localhost:3001 in your browser"