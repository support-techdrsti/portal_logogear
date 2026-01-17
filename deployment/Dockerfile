# Multi-stage build for Logogear Portal AWS Deployment
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install Python and required packages for Python scripts
RUN apk add --no-cache python3 py3-pip python3-dev build-base
RUN pip3 install pandas openpyxl

# Copy package files
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/
COPY package*.json ./

# Install dependencies
RUN cd backend && npm ci --only=production &&
# Generate Prisma client
RUN cd backend && npx prisma generate --schema=../database/schema.prisma

# Build the application
RUN cd backend && npm run build && \
    cd ../frontend && npm run build

# Production stage
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/backend/dist ./backend/dist
COPY --from=builder --chown=nodejs:nodejs /app/frontend/dist ./frontend/dist
COPY --from=builder --chown=nodejs:nodejs /app/backend/node_modules ./backend/node_modules
COPY --from=builder --chown=nodejs:nodejs /app/database ./database
COPY --from=builder --chown=nodejs:nodejs /app/backend/package*.json ./backend/

# Create necessary directories
RUN mkdir -p logs uploads data templates output && \
    chown -R nodejs:nodejs logs uploads data templates output

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "backend/dist/server.js"]