# ZK-WebRadio Dashboard

[![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
[![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Hono](https://img.shields.io/badge/Hono-E36002?style=for-the-badge&logo=hono&logoColor=white)](https://hono.dev/)

A modern, high-performance administration dashboard for the ZK-WebRadio project. This dashboard provides real-time statistics, cache management, API key administration, and detailed analytics for the radio station's operations.

## 🚀 Technology Stack

- **Frontend Framework:** React 19 (Vite)
- **Styling:** TailwindCSS 4, Shadcn/UI
- **Backend/Auth Server:** Hono (Node Server)
- **Authentication:** Better-Auth
- **Database:** SQLite (Better-SQLite3)
- **Data Visualization:** Recharts
- **Icons:** Lucide-React
- **Language:** TypeScript

## 🏗️ Project Architecture

The project follows a modern full-stack architecture with a clear separation between the frontend dashboard and the authentication/admin backend.

- **Frontend (`/src`):** React SPA powered by Vite, utilizing a component-based architecture.
- **Backend (`/server`):** Hono-based API server handling authentication and administrative tasks.
- **Authentication:** Integrated `Better-Auth` for secure session management and user roles.

## 📂 Project Structure

```text
Dashboard/
├── src/                # Frontend React code
│   ├── components/     # UI and Feature components
│   │   ├── ui/         # Shadcn base components
│   │   └── ...         # Feature-specific components (Stats, Tables, etc.)
│   ├── lib/            # Utility functions and auth-client
│   ├── services/       # API integration layer
│   └── App.tsx         # Main application entry
├── server/             # Backend Hono server
│   ├── index.ts        # Server entry point
│   └── auth.ts         # Authentication configuration
├── public/             # Static assets
└── Dockerfile          # Containerization setup
```

## ✨ Key Features

- **Real-time Statistics:** Interactive cards showing listeners, track stats, and server health.
- **Analytics:** Visual charts for Top Tracks, Top IPs, and system failures using Recharts.
- **Cache Management:** Tools to browse and manage the application's cache.
- **API Key Management:** Complete system to generate, revoke, and track API keys.
- **Secure Authentication:** Role-based access control with Better-Auth.
- **Responsive Design:** Fully optimized for all screen sizes using TailwindCSS.

## 🛠️ Getting Started

### Prerequisites

- Node.js (Latest LTS recommended)
- npm or pnpm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/xAzke/ZK-WebRadio.git
   cd ZK-WebRadio/Dashboard
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file based on the project requirements (see `.env.production` for reference).

4. Run the development server:
   ```bash
   # Runs both frontend and backend
   npm run dev:all
   ```

## 📜 Development Workflow

- **Branching Strategy:** Main development happens on the `dashboard` branch.
- **Code Standards:** ESLint and TypeScript are strictly enforced for code quality.
- **Build Process:** Vite handles the frontend bundling, while `tsc` ensures type safety across the project.

## 🐳 Docker Deployment

The project includes a multi-stage Docker setup for production environments:

```bash
docker build -t zk-webradio-dashboard .
docker run -p 80:80 zk-webradio-dashboard
```

## 📄 License

This project is part of the ZK-WebRadio ecosystem. Reference the root repository for licensing details.
