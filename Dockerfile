FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# Final stage
FROM node:18-alpine

WORKDIR /app

# Copy built frontend files
COPY --from=builder /app/dist ./dist
# Copy server files
COPY --from=builder /app/src/server ./server
COPY --from=builder /app/package*.json ./

# Install production dependencies
RUN npm install --production

# Create directories for data persistence
RUN mkdir -p ./.rooms ./.assets

# Create volume mount points
VOLUME ["/app/.rooms", "/app/.assets"]

# Expose port
EXPOSE 5858

# Start the server
CMD ["node", "server/server.node.js"]
