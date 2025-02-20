# TLDraw Multiplayer Docker Setup Guide

This guide will help you set up a TLDraw multiplayer application using Docker.

## Project Structure

First, create the following directory structure:

```
tldraw-multiplayer/
├── src/
│   ├── client/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   └── server/
│       ├── server.node.js
│       ├── rooms.js
│       ├── assets.js
│       └── unfurl.js
├── index.html
├── package.json
├── vite.config.js
├── Dockerfile
└── docker-compose.yml
```

## Step 1: Copy All Files

Copy the provided files into their respective locations in the directory structure above.

## Step 2: Install Dependencies

```bash
npm install
```

## Step 3: Build and Run with Docker

```bash
# Create data directories
mkdir -p data/rooms data/assets

# Build and start the container
docker-compose up -d
```

## Step 4: Access Your Application

Open your browser and go to:

```
http://localhost:5858
```

To create or join a specific room, add the room ID to the URL path:

```
http://localhost:5858/my-room-name
```

## Development Mode

If you want to develop locally without Docker:

```bash
# Start both the server and client
npm run dev

# Access at http://localhost:5173
```

## Troubleshooting

### Check Server Logs

```bash
docker-compose logs -f
```

### Verify Container is Running

```bash
docker-compose ps
```

### Check File Permissions

If you have issues with data persistence, check that your data directories have the right permissions:

```bash
sudo chown -R 1000:1000 data/
```

### Test Server Directly

To verify the server is working:

```bash
curl http://localhost:5858/health
```

Should return: `{"status":"ok"}`

## Additional Configuration

### Change Port

To use a different port, modify `docker-compose.yml`:

```yaml
ports:
  - "8080:5858"  # Change 8080 to your preferred port
```

### Enable SSL/TLS

For production, you may want to put this behind a reverse proxy like Nginx or Traefik that handles SSL termination.
