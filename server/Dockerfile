# TrustMatch Server Dockerfile

FROM node:20-alpine AS builder

WORKDIR /app

# Install ALL system deps needed to compile native addons (canvas, sharp, etc.)
RUN apk add --no-cache \
    build-base \
    python3 \
    vips-dev \
    fftw-dev \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    librsvg-dev \
    pixman-dev \
    pkgconfig \
    curl \
    unzip

COPY package*.json ./
COPY prisma ./prisma/

# Install ALL deps (dev + prod) — tsc, prisma CLI, and native addons all compile here
RUN npm ci

COPY . .

# Generate Prisma client and compile TypeScript
RUN npx prisma generate
RUN npm run build
RUN chmod +x start.sh

# Pre-download face-api.js models during build to avoid CDN dependency at runtime
RUN mkdir -p models && \
    echo "Downloading face-api.js models..." && \
    curl -sfL -o models/tiny_face_detector_model-weights_manifest.json \
        "https://justadudewhokeys.github.io/face-api.js/models/tiny_face_detector_model-weights_manifest.json" && \
    curl -sfL -o models/tiny_face_detector_model-shard1 \
        "https://justadudewhokeys.github.io/face-api.js/models/tiny_face_detector_model-shard1" && \
    curl -sfL -o models/face_landmark_68_model-weights_manifest.json \
        "https://justadudewhokeys.github.io/face-api.js/models/face_landmark_68_model-weights_manifest.json" && \
    curl -sfL -o models/face_landmark_68_model-shard1 \
        "https://justadudewhokeys.github.io/face-api.js/models/face_landmark_68_model-shard1" && \
    curl -sfL -o models/face_recognition_model-weights_manifest.json \
        "https://justadudewhokeys.github.io/face-api.js/models/face_recognition_model-weights_manifest.json" && \
    curl -sfL -o models/face_recognition_model-shard1 \
        "https://justadudewhokeys.github.io/face-api.js/models/face_recognition_model-shard1" && \
    echo "face-api.js models downloaded successfully" || \
    echo "WARNING: Failed to download face-api.js models — will try at runtime"

# ── Production runner ────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Runtime shared libraries only (no -dev, no pkg-config needed)
RUN apk add --no-cache \
    vips \
    fftw \
    cairo \
    pango \
    jpeg \
    giflib \
    librsvg \
    pixman \
    openssl \
    curl

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Copy everything from builder — compiled JS, node_modules with native binaries, prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/models ./models

COPY --from=builder /app/start.sh ./start.sh

RUN mkdir -p uploads/photos uploads/documents uploads/selfies uploads/voice-notes logs && \
    chmod +x start.sh && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

CMD ["sh", "start.sh"]
