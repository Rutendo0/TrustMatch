# TrustMatch Server Dockerfile
# Multi-stage build for production

# ── Builder stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install system dependencies for native modules (sharp, canvas/face-api.js)
RUN apk add --no-cache \
    vips-dev \
    fftw-dev \
    build-base \
    python3 \
    libc-dev \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    librsvg-dev \
    pixman-dev

COPY package*.json ./
COPY prisma ./prisma/

# Install ALL dependencies (including devDeps for tsc and prisma CLI)
RUN npm ci

COPY . .

# Generate Prisma client
RUN npx prisma generate

# Compile TypeScript
RUN npm run build

# ── Production runner stage ──────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Install system dependencies (needed at runtime for native modules)
RUN apk add --no-cache \
    vips \
    fftw \
    cairo \
    pango \
    jpeg \
    giflib \
    librsvg \
    pixman \
    python3

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

COPY package*.json ./
COPY prisma ./prisma/

# Install only production dependencies
RUN npm ci --only=production

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Generate Prisma client against production node_modules
RUN npx prisma generate

# Create required directories
RUN mkdir -p uploads/photos uploads/documents uploads/selfies uploads/voice-notes logs && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Run migrations then start
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
