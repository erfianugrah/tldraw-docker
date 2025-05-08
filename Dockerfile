# Build Stage
FROM node:18-alpine AS builder
WORKDIR /app

# Install dependencies and build frontend
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production Stage
FROM node:18-alpine AS production
WORKDIR /app

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy build and server files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/server ./server
COPY --from=builder /app/package*.json ./

# Install production dependencies only
RUN npm ci --production && \
    npm cache clean --force

# Create directories for volumes
RUN mkdir -p ./.rooms ./.assets && \
    chown -R appuser:appgroup ./.rooms ./.assets

# Set permissions
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Volume for persistence
VOLUME ["/app/.rooms", "/app/.assets"]

# Set environment variables
ENV NODE_ENV=production \
    PORT=5858

# Expose port
EXPOSE 5858

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/health || exit 1

# Start app
CMD ["node", "server/server.node.js"]