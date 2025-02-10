FROM node:18-alpine AS builder

WORKDIR /app

# Install create-vite and initialize project
RUN npm create vite@latest app -- --template react
WORKDIR /app/app

# Update package.json to use correct React version
RUN npm pkg set dependencies.react="^18.2.0" dependencies.react-dom="^18.2.0"

# Install tldraw and dependencies
RUN npm install tldraw
RUN npm install

# Update the title in index.html
RUN sed -i 's/<title>.*<\/title>/<title>TLDraw<\/title>/' index.html

# Create App.jsx with proper line endings
RUN printf '%s\n' \
	'import { Tldraw } from "tldraw"' \
	'import "tldraw/tldraw.css"' \
	'' \
	'export default function App() {' \
	'  return (' \
	'    <div style={{ position: "fixed", inset: 0 }}>' \
	'      <Tldraw />' \
	'    </div>' \
	'  )' \
	'}' > src/App.jsx

# Build the application
RUN npm run build

# Production stage
FROM caddy:2-alpine

# Copy the built files to Caddy's serving directory
COPY --from=builder /app/app/dist /usr/share/caddy

# Create a simple Caddyfile
RUN printf '%s\n' \
	'{' \
	'    auto_https off' \
	'}' \
	'' \
	':80 {' \
	'    root * /usr/share/caddy' \
	'    file_server' \
	'    try_files {path} /index.html' \
	'}' > /etc/caddy/Caddyfile

# Expose port 80
EXPOSE 80

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]
