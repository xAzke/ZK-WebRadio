# ZK-WebRadio API

ZK-WebRadio is a high-performance, containerized API designed for Multi Theft Auto (MTA) servers. It provides players with seamless audio playback from multiple streaming platforms (like Deezer, YouTube, and SoundCloud) without requiring local storage of audio files. The API acts as a gateway, fetching and streaming content directly from the source or via specialized microservices.

## Technology Stack

- **Framework:** .NET 8.0 (ASP.NET Core)
- **Language:** C#
- **Communication:** gRPC (for service-to-service communication)
- **Data Storage:** SQLite (Local storage for API keys and track metadata)
- **Caching:** Redis (Distributed cache for search results and stream URLs)
- **Containerization:** Docker & Docker Compose
- **Reverse Proxy:** Nginx (Optional, for authentication and load balancing)
- **Libraries:**
  - `Grpc.AspNetCore`: High-performance gRPC support.
  - `Microsoft.EntityFrameworkCore.Sqlite`: Lightweight database management.
  - `StackExchange.Redis`: Efficient caching.
  - `Newtonsoft.Json`: Robust JSON handling.

## Project Architecture

The project follows a microservices-inspired architecture to ensure scalability and separation of concerns:

1.  **WebRadio API (Gateway):** The main entry point that handles HTTP requests from MTA servers, manages authentication (API Keys/User-Agents), and orchestrates calls to backend services.
2.  **Deezer Service:** A specialized gRPC service that interfaces with the Deezer API, handles track searching, and manages local streaming/caching of audio files.
3.  **Redis Cache:** Stores frequently accessed search results and resolved stream URLs to reduce latency and API usage.
4.  **SQLite DBs:** Stores persistent information such as API keys and playback statistics.

## Getting Started

### Prerequisites

- [Docker](https://www.docker.com/get-started) and [Docker Compose](https://docs.docker.com/compose/install/)
- [.NET 8.0 SDK](https://dotnet.microsoft.com/download/dotnet/8.0) (for local development)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/xAzke/ZK-WebRadio.git
    cd ZK-WebRadio/API
    ```

2.  **Configuration:**
    - Create/Edit `.env` file in the root with your environment variables.
    - Configure `appsettings.json` in `webradio/` and `deezer-service/` for service-specific settings (e.g., API keys).

3.  **Run with Docker Compose:**
    ```bash
    docker-compose up -d
    ```

## Project Structure

- `webradio/`: The main gateway API project.
- `deezer-service/`: The gRPC service for Deezer integration.
- `data/`: Directory for persistent SQLite databases.
- `Protos/`: shared gRPC service definitions (`webradio.proto`).
- `docker-compose.yml`: Orchestration for all services (API, Deezer, Redis).
- `radio.sh`: Utility script for management.

## Key Features

- **Multi-Provider Support:** Unified interface for Deezer, YouTube*, and SoundCloud*.
- **High Performance:** Utilizes gRPC for internal communication and Redis for caching.
- **MTA Optimized:** Specialized User-Agent authentication for `playSound` and `playSound3D` compatibility.
- **Secure:** Integrated API Key management and IP-based restrictions.
- **Analytics:** Tracks metadata and playback statistics for popular tracks.
- **Local File Streaming:** Supports serving local audio files directly to clients.

*\*Note: YouTube and SoundCloud support is integrated via the provider interface.*

## Development Workflow

1.  **Branching:** Use feature branches (`feat/feature-name`) or bugfix branches (`fix/bug-name`).
2.  **Commits:** Follow [Conventional Commits](https://www.conventionalcommits.org/) (e.g., `feat:`, `fix:`, `chore:`).
3.  **PRs:** Submit pull requests to the `api` or `main` branch for review.

## Coding Standards

- Follow standard **C# Coding Conventions** (PascalCase for methods/classes, camelCase for local variables).
- Ensure all new features are accompanied by appropriate gRPC proto updates if necessary.
- Maintain thin controllers by delegating logic to services.

## Testing

- The project uses standard .NET testing patterns.
- Ensure `docker-compose.yml` passes validation after changes.
- Verify gRPC connectivity between services using internal logging.

## Contributing

1. Fork the repository.
2. Create your feature branch.
3. Commit your changes following conventional standards.
4. Push to the branch.
5. Create a new Pull Request.

## License

Distributed under the MIT License. See `LICENSE` for more information.
