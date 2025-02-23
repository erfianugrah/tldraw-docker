# Build Stage
FROM node:18-alpine AS builder
WORKDIR /app

# Install dependencies and build frontend
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production Stage
FROM node:18-alpine
WORKDIR /app

# Copy build and server files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/server ./server
COPY --from=builder /app/package*.json ./
RUN npm install --production

# Ensure directories exist
RUN mkdir -p ./.rooms ./.assets

# Volume for persistence
VOLUME ["/app/.rooms", "/app/.assets"]

# Expose port and start app
EXPOSE 5858
CMD ["node", "server/server.node.js"]
