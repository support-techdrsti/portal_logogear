#!/bin/bash

# Build script for Logogear Internal Portal
set -e

echo "🏗️ Building Logogear Internal Portal..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf backend/dist
rm -rf frontend/dist

# Install dependencies
echo "📦 Installing backend dependencies..."
cd backend && npm ci

echo "📦 Installing frontend dependencies..."
cd ../frontend && npm ci && cd ..

# Build backend
echo "🏗️ Building backend..."
cd backend && npm run build && cd ..

# Build frontend
echo "🏗️ Building frontend..."
cd frontend && npm run build && cd ..

# Generate Prisma client
echo "🔧 Generating Prisma client..."
cd backend && npx prisma generate --schema=../database/schema.prisma && cd ..

echo "✅ Build completed successfully!"