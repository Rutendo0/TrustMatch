# TrustMatch Server Dockerfile
# Multi-stage build for production

# ── Base stage ────────────────────────────────────────────────────────────────
FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies needed for sharp (image processing)
RUN apk add --no-cache \
    vips-dev \
    fftw-dev \
    build-base \
    python3 \
    libc-dev

COPY package*.json ./
COPY prisma ./prisma/

# ── Dependencies stage ───────────────────────────────────────────────────────
FROM base AS deps

WORKDIR /app

RUN npm ci --only=production

# ── Production build stage ───────────────────────────────────────────────────
FROM base AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# ── Production runner stage ──────────────────────────────────────────────────
FROM base AS runner

WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# Copy built files and production dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

# Generate Prisma client at runtime
RUN npx prisma generate

# Create uploads directory
RUN mkdir -p uploads/photos uploads/documents uploads/selfies uploads/voice-notes logs && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start the application
CMD ["node", "dist/index.js"]
