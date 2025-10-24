# Multi-stage build for HP Tourism Digital Ecosystem
# Optimized for Google Cloud Run deployment

# Stage 1: Build frontend
FROM node:20-slim AS frontend-build

WORKDIR /app

# Copy frontend package files
COPY client/package*.json ./client/
COPY package*.json ./

# Install dependencies
WORKDIR /app/client
RUN npm ci --only=production

# Copy frontend source
COPY client ./

# Build frontend (Vite production build)
RUN npm run build

# Stage 2: Production backend
FROM node:20-slim

WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy server code
COPY server ./server
COPY shared ./shared
COPY drizzle.config.ts ./

# Copy built frontend from previous stage
COPY --from=frontend-build /app/client/dist ./client/dist

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser
RUN chown -R appuser:appuser /app
USER appuser

# Expose port (GCP Cloud Run uses PORT env variable)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/api/auth/me', (r) => { process.exit(r.statusCode === 401 ? 0 : 1) })"

# Set production environment
ENV NODE_ENV=production

# Start the server
CMD ["node", "server/index.js"]
