# Docker TLDraw

This repository contains a Docker setup for running [tldraw](https://tldraw.com/), an infinite canvas drawing and diagramming tool.

## Features

- Multi-architecture support (amd64, arm64, armv7, armv6)
- Uses Caddy as a web server
- Minimal production image
- Easy to deploy with docker-compose

## Quick Start

### Using Docker Compose

1. Create a `docker-compose.yml` file:

```yaml
version: '3.8'
services:
  tldraw:
    image: erfianugrah/tldraw:v1.0.0
    container_name: tldraw
    restart: unless-stopped
    volumes:
      - /home/erfi/docker-volumes/tldraw/data:/data  # For Caddy data persistence
      - /home/erfi/docker-volumes/tldraw/config:/config  # For Caddy configuration
    ports:
      - "80:80"  # Expose HTTP port for Caddy
    environment:
      - TZ=UTC  # Set your preferred timezone
    networks:
      tldraw:
        ipv4_address: 172.19.1.2

networks:
  tldraw:
    driver: bridge
    ipam:
      config:
        - subnet: 172.19.1.0/24
          gateway: 172.19.1.1
```

2. Run:
```bash
docker-compose up -d
```

### Using Docker Run

```bash
docker run -d \
  --name tldraw \
  -p 80:80 \
  -v /path/to/data:/data \
  -v /path/to/config:/config \
  erfianugrah/tldraw:v1.0.0
```

## Building from Source

1. Clone this repository:
```bash
git clone https://github.com/yourusername/docker-tldraw.git
cd docker-tldraw
```

2. Build the multi-arch image:
```bash
docker buildx build --platform linux/arm64,linux/amd64,linux/arm/v6,linux/arm/v7 -t yourusername/tldraw:v1.0.0 . --push
```

## Configuration

### Volumes

- `/data`: Caddy data directory for persistence
- `/config`: Caddy configuration directory

### Ports

- `80`: HTTP port

### Environment Variables

- `TZ`: Timezone (default: UTC)

## License

This Docker setup is provided under MIT license. However, please note that tldraw itself is licensed under [tldraw license](https://github.com/tldraw/tldraw/blob/main/LICENSE.md).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

If you encounter any issues with the Docker setup, please open an issue in this repository.

For tldraw-specific issues, please refer to the [official tldraw repository](https://github.com/tldraw/tldraw).

## Acknowledgments

- [tldraw](https://github.com/tldraw/tldraw) for the amazing drawing application
- [Caddy](https://caddyserver.com/) for the web server
