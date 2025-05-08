# TLDraw Multiplayer Docker Setup Guide

This guide will help you set up and run the TLDraw multiplayer application using Docker. The application provides a collaborative drawing whiteboard with real-time synchronization.

## Architecture Overview

The application is structured as follows:

- **Frontend**: React application using the TLDraw library for the drawing interface
- **Backend**: Node.js Express server with WebSocket support for real-time synchronization
- **Deployment**: Docker containerization for easy deployment and scaling
- **Data Persistence**: File-based storage for room data and assets

### Components

- **Client (React + TLDraw)**: Provides the UI for room management and the drawing board
- **Server (Express + WebSockets)**: Manages rooms, assets, and real-time synchronization
- **Config Management**: Centralized environment variable configuration
- **Persistence Layer**: File-based storage for rooms and uploaded assets

## Project Structure

```
tldraw-multiplayer/
├── src/
│   ├── client/          # Frontend React application
│   │   ├── components/  # Reusable UI components
│   │   ├── App.jsx      # Main application component
│   │   ├── RoomManager.jsx # Room creation and management
│   │   ├── TLDrawComponent.jsx # Drawing board component
│   │   ├── main.jsx     # Application entry point
│   │   └── *.css        # Styling files
│   └── server/          # Backend Node.js server
│       ├── config.js    # Environment configuration
│       ├── server.node.js # Express server implementation
│       ├── rooms.js     # Room data management
│       ├── assets.js    # Asset storage and retrieval
│       └── unfurl.js    # URL metadata extraction
├── index.html          # HTML entry point
├── package.json        # Project dependencies and scripts
├── vite.config.js      # Vite bundler configuration
├── Dockerfile          # Multi-stage Docker build definition
├── compose.yml         # Docker Compose configuration
├── .eslintrc.json      # ESLint configuration
└── .prettierrc.json    # Prettier configuration
```

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js v18+ (for local development)

### Installation

#### Using Docker Compose (Recommended)

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd tldraw-docker
   ```

2. Start the application with Docker Compose:
   ```bash
   docker compose up -d
   ```

3. Access the application:
   ```
   http://localhost:8000
   ```

#### Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Access the application:
   ```
   http://localhost:5173
   ```

## Configuration

The application is configured using environment variables that can be set in the `compose.yml` file:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `5858` |
| `NODE_ENV` | Environment (`development` or `production`) | `production` |
| `BASE_DIR` | Base directory for data storage | `.` |
| `ROOMS_DIR` | Directory for room data | `./.rooms` |
| `ASSETS_DIR` | Directory for asset storage | `./.assets` |
| `ROOM_PERSISTENCE_INTERVAL_MS` | Interval for saving room data | `2000` |
| `CORS_ENABLED` | Enable CORS | `true` |
| `CORS_ORIGIN` | CORS origin | `*` |

## Data Persistence

The application uses Docker volumes for data persistence:

- `tldraw_rooms`: Stores room data
- `tldraw_assets`: Stores uploaded assets

## Development Tools

The project includes several development tools:

- **Linting**: ESLint for code quality
  ```bash
  npm run lint      # Check for issues
  npm run lint:fix  # Fix issues automatically
  ```

- **Formatting**: Prettier for consistent code style
  ```bash
  npm run format       # Format all files
  npm run format:check # Check formatting
  ```

- **Building**: Build for production
  ```bash
  npm run build
  ```

## Troubleshooting

### Check Server Logs

```bash
docker compose logs -f
```

### Verify Server Health

```bash
curl http://localhost:8000/health
```

Should return: `{"status":"ok", "timestamp":"...", "uptime":...}`

### Check File Permissions

If you encounter file permission issues:

```bash
# For specific host-mounted volumes
sudo chown -R 1000:1000 /path/to/volumes
```

## Deployment Considerations

### Security

- The Docker image runs as a non-root user for improved security
- For production, put this behind a reverse proxy (like Nginx or Traefik) that handles SSL termination

### Scaling

- For horizontal scaling, consider implementing a proper database backend instead of file-based storage
- Use a shared storage system or object storage for assets when running multiple instances

## License

This project is licensed under the terms of the license included with the original tldraw library.