# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine

# Install security updates
RUN apk update && \
    apk upgrade && \
    apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -S appgroup && \
    adduser -S appuser -G appgroup

# Set working directory
WORKDIR /app

# Copy built assets
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/src/shared ./src/shared

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# Security hardening
RUN chown -R appuser:appgroup /app && \
    chmod -R 500 /app

# Switch to non-root user
USER appuser

# Set security env vars
ENV NODE_ENV=production \
    NPM_CONFIG_AUDIT=true \
    NPM_CONFIG_AUDIT_LEVEL=moderate \
    NODE_OPTIONS='--max-old-space-size=512'

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-3000}/health || exit 1

# Start application with dumb-init
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/server.js"]

# Expose port
EXPOSE ${PORT:-3000}

# Labels
LABEL maintainer="team@call-bray-game.com" \
      version="1.0.0" \
      description="Call Bray Card Game" \
      security.updates="true" \
      security.rootless="true" 