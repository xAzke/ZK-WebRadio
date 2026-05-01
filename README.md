# ZK-WebRadio Dashboard

[![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
[![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/vercel-%23000000.svg?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)

A premium, high-performance administration dashboard for the ZK-WebRadio project. Designed with a professional "Control Room" aesthetic, this dashboard provides real-time analytics, cache management, and secure administrative controls.

## 🚀 Technology Stack

- **Frontend:** React 19 (Vite)
- **Styling:** TailwindCSS 4 (Modern Hardware Aesthetic)
- **Authentication:** Supabase Auth (Discord OAuth)
- **Backend Integration:** Connects to a remote .NET API via JWT
- **Data Visualization:** Recharts
- **Icons:** Lucide-React
- **Language:** TypeScript

## 🏗️ Project Architecture

The project is a serverless-ready frontend application optimized for deployment on **Vercel**.

- **Authentication:** Fully managed by **Supabase Auth**. No local session server is required.
- **Security:** Implements a PostgreSQL-based Discord ID whitelist (via triggers) to restrict access.
- **Communication:** Uses standard JWT Bearer tokens (ES256) to authorize requests to the central radio API.

## 📂 Project Structure

```text
Dashboard/
├── src/                # Frontend React code
│   ├── components/     # UI and Feature components
│   │   ├── ui/         # Shadcn base components
│   │   └── ...         # Feature components (Stats, Tables, etc.)
│   ├── lib/            # Supabase client and utilities
│   ├── services/       # API integration layer (JWT handled automatically)
│   └── App.tsx         # Main application entry and session management
├── public/             # Static assets
├── supabase_whitelist.sql # Utility to setup Discord security in Supabase
└── Dockerfile          # Optional containerization
```

## ✨ Key Features

- **Immersive Control Room UI:** High-end dark theme with glassmorphism and animated ambient effects.
- **Real-time Stats:** Monitoring of uptime, listener searches, and stream metrics.
- **Advanced Analytics:** Interactive charts for Top Tracks, Top IPs, and failure ratios.
- **Cache Browser:** Visual tool to manage and preview cached audio assets.
- **API Key Control:** Full management suite for third-party access keys.
- **Secure Access:** Discord OAuth 2.0 integration with strict ID whitelisting.

## 🛠️ Getting Started

### Prerequisites

- Node.js (Latest LTS)
- A Supabase Project (with Discord Auth enabled)

### Local Configuration

1. Clone and install:
   ```bash
   git clone https://github.com/xAzke/ZK-WebRadio.git
   cd ZK-WebRadio/Dashboard
   npm install
   ```

2. Set up your `.env`:
   ```env
   VITE_API_URL=https://your-api.com/admin
   VITE_SUPABASE_URL=https://your-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-key
   ```

3. Run development server:
   ```bash
   npm run dev
   ```

## 🔐 Security Setup

To enforce the Discord whitelist, execute the `supabase_whitelist.sql` script in your Supabase SQL Editor. This ensures only specific Discord IDs can enter the dashboard.

## 🚀 Deployment

This dashboard is optimized for **Vercel**:
1. Connect this repository to Vercel.
2. Add the environment variables from your `.env` to the Vercel project settings.
3. Deploy!

## 📄 License

Part of the ZK-WebRadio ecosystem. Reference the root repository for details.
