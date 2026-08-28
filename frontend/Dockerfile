# Frontend Dockerfile for ContextCleanse - Standard Docker Build
# Supports Next.js with standard Docker Compose v2

# ==========================================
# Base Stage - Node.js setup
# ==========================================
FROM node:26-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    libc6-compat \
    curl \
    dumb-init \
    bash \
    ca-certificates && \
    rm -rf /var/cache/apk/* /tmp/*

# Enable Corepack for pnpm/yarn support
RUN corepack enable

# Use the current npm release supported by the Node base image
RUN npm install -g npm@12.0.2 --no-audit --no-fund

# Create app user for security with proper permissions
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    mkdir -p /app/.next/cache && \
    chown -R nextjs:nodejs /app

# Set working directory
WORKDIR /app

# Set optimal Node.js flags for performance
ENV NODE_OPTIONS="--max-old-space-size=4096 --no-warnings"
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
ENV NPM_CONFIG_FUND=false
ENV NPM_CONFIG_AUDIT=false

# ==========================================
# Dependencies Stage - Install dependencies
# ==========================================
FROM base AS deps

# Copy package files for dependency installation
COPY package.json package-lock.json* ./

# Install production dependencies
RUN npm ci \
    --ignore-scripts \
    --no-audit \
    --no-fund \
    --prefer-offline && \
    npm cache clean --force

# ==========================================
# Build Stage - Next.js compilation
# ==========================================
FROM base AS builder

# Copy package files first for better caching
COPY package.json package-lock.json* ./

# Install all dependencies
RUN npm ci \
    --ignore-scripts \
    --no-audit \
    --no-fund \
    --prefer-offline

# Copy source code
COPY next.config.js ./
COPY tsconfig.json ./
COPY tailwind.config.js ./
COPY postcss.config.js ./
COPY eslint.config.mjs ./
COPY public ./public
COPY app ./app
COPY lib ./lib
COPY types ./types
COPY components ./components

# Set optimized build environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DOCKER_BUILD=true
ENV NEXT_PRIVATE_DEBUG_CACHE=1

# Create .next directory with proper permissions
RUN mkdir -p .next/cache && chown -R nextjs:nodejs .next

# Run complete build pipeline
RUN set -e && \
    echo "🔍 Starting build pipeline..." && \
    npm run type-check && \
    echo "✅ Type check completed" && \
    npm run lint:fix && \
    echo "✅ Linting completed" && \
    npx next build && \
    echo "✅ Build completed" && \
    find .next/cache -name "*.tsbuildinfo" -delete 2>/dev/null || true && \
    find .next/cache -name "eslint" -type d -exec rm -rf {} + 2>/dev/null || true && \
    rm -rf node_modules/.cache && \
    echo "📁 Build output:" && \
    ls -la .next/ && \
    echo "📊 Build statistics:" && \
    du -sh .next/* 2>/dev/null || echo "No build output found"

# ==========================================
# Development Stage - Optimized for development
# ==========================================
FROM base AS development

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies
RUN npm ci \
    --ignore-scripts \
    --no-audit \
    --no-fund \
    --prefer-offline

# Copy configuration files
COPY next.config.js ./
COPY tsconfig.json ./
COPY tailwind.config.js ./
COPY postcss.config.js ./
COPY eslint.config.mjs ./

# Copy source code
COPY app ./app
COPY lib ./lib
COPY types ./types
COPY components ./components
COPY public ./public

# Copy pre-compilation script
COPY scripts ./scripts

# Set development environment
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PRIVATE_DEBUG_CACHE=1

# Create Next.js directories with proper permissions
RUN mkdir -p .next/cache .next/server .next/server/pages .next/server/app && \
    chown -R nextjs:nodejs /app && \
    chmod -R 777 /app/.next

# Pre-build and pre-compile pages for zero first-visit delay
RUN set -e && \
    echo "🏗️  Starting Next.js build..." && \
    npm run build && \
    echo "✅ Build completed, starting page pre-compilation..." && \
    timeout 300s bash -c ' \
        echo "🚀 Starting server for pre-compilation..." && \
        npm start & \
        SERVER_PID=$! && \
        echo "📍 Server PID: $SERVER_PID" && \
        sleep 15 && \
        echo "🏗️  Running page pre-compilation..." && \
        node scripts/prebuild-pages.js && \
        echo "⏹️  Stopping server..." && \
        kill $SERVER_PID || true && \
        wait $SERVER_PID 2>/dev/null || true && \
        echo "✅ Pre-compilation completed successfully" \
    ' || echo "⚠️  Pre-compilation failed but continuing..."

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check for development
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Development command
CMD ["npm", "run", "dev"]

# ==========================================
# Production Stage - Optimized runtime
# ==========================================
FROM base AS production

# Set production environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy production dependencies
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy package.json for npm commands
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Copy build output
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy source directories needed for runtime
COPY --from=builder --chown=nextjs:nodejs /app/app ./app
COPY --from=builder --chown=nextjs:nodejs /app/lib ./lib
COPY --from=builder --chown=nextjs:nodejs /app/components ./components
COPY --from=builder --chown=nextjs:nodejs /app/types ./types

# Copy configuration files
COPY --from=builder --chown=nextjs:nodejs /app/next.config.js ./next.config.js
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./tsconfig.json

# Handle standalone files if they exist
RUN if [ -d ".next/standalone" ]; then \
      echo "✅ Using standalone build"; \
      cp -r .next/standalone/* . 2>/dev/null || true; \
      mkdir -p .next/static && cp -r .next/static .next/standalone/.next/ 2>/dev/null || true; \
    else \
      echo "⚠️ No standalone build found, using regular build"; \
    fi

# Create necessary directories
RUN mkdir -p /app/.next/cache /app/logs && \
    chown -R nextjs:nodejs /app/.next /app/logs

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check for production
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Add labels for image management
LABEL org.opencontainers.image.title="ContextCleanse Frontend"
LABEL org.opencontainers.image.description="Standard Docker build Next.js frontend"
LABEL org.opencontainers.image.version="1.0.0"

# Production command
CMD echo "🚀 Starting Next.js server" && \
    if [ -f "server.js" ]; then \
      echo "✅ Running standalone server"; \
      exec dumb-init node server.js; \
    else \
      echo "⚠️ Running with npm start"; \
      exec dumb-init npm start; \
    fi