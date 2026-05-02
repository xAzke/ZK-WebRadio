# ZK-WebRadio Dashboard: Cyber-Industrial Admin

[![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
[![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)

A high-fidelity, industrial-grade administrative interface for the ZK-WebRadio relay system. This dashboard combines a professional "Cyber-Industrial" aesthetic with real-time network intelligence, geolocated traffic analysis, and high-performance operations management.

## 🚀 Technology Stack

- **Frontend:** React 19 (Vite)
- **Styling:** Tailwind CSS v4 (Cyber-Industrial Design System)
- **Typography:** Geist Sans (UI) & JetBrains Mono (Technical Data)
- **Authentication:** Supabase Auth (Discord OAuth integration)
- **Maps:** MapLibre GL with @mapcn/map components
- **Animations:** Framer Motion (Optimized BlurFade transitions)
- **Data Visualization:** Recharts (Analytics & Trends)
- **Icons:** Lucide React

## 🏗️ Project Architecture

The dashboard is built on a modular "Bento Grid" architecture, optimized for administrative focus and operational speed.

- **Isolated Scrolling:** Fixed sidebar and main header with independent content scroll for a native-app feel.
- **Service Layer:** Centralized API integration in `src/services/api.ts` with JWT handling and real-time state sync.
- **Live Geolocation:** Real-time IP resolution using external geolocation APIs with intelligent in-memory caching.
- **Performance Optimized:** GPU-accelerated layers and component memoization to ensure <1% CPU usage in idle states.

## ✨ Key Features

- **🌐 Network Intelligence:** Interactive global map with live IP geolocation and traffic volume markers.
- **📊 Real-time Audience:** Dynamic metrics showing active consumers, hardware distribution, and ingress trends.
- **🔑 API Control Console:** Professional credential management with inline editing and "terminal-style" security previews.
- **🚨 Anomalies Monitoring:** Full-width tracking of critical system failures and metadata repair tools.
- **📂 Cache Management:** Visual browser for exploring and managing distributed audio assets.
- **🛡️ Secure Node Access:** Administrative terminal-style Login and AuthError screens for authorized operators only.

## 📂 Project Structure

```text
Dashboard/
├── src/                
│   ├── components/     
│   │   ├── analytics/  # Recharts and breakdown components
│   │   ├── magicui/    # Optimized animation primitives
│   │   ├── ui/         # Base Shadcn/Radix components (Map, Chart, etc.)
│   │   ├── TrafficView.tsx # Live Map & Intelligence Hub
│   │   └── ...         # Feature components (ApiKeys, Stats, Tables)
│   ├── lib/            # Shared utilities and Supabase client
│   ├── services/       # API Layer (Geolocation & Dashboard sync)
│   └── App.tsx         # Main layout orquestrator & Bento Grid
├── public/             
├── components.json     # UI configuration
└── index.html          
```

## 🛠️ Getting Started

### Prerequisites

- Node.js (Latest LTS)
- A Supabase Project (Discord Auth enabled)

### Local Configuration

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Environment Setup:**
   Create a `.env` file in the root:
   ```env
   VITE_API_URL=https://your-api.com/admin
   VITE_SUPABASE_URL=https://your-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-key
   ```

3. **Development Mode:**
   ```bash
   npm run dev
   ```

## 📝 Development Standards

- **Performance:** Avoid heavy canvas animations; use CSS radial gradients and hardware-accelerated layers.
- **Typography:** Strictly use `Geist Sans` for UI labels and `JetBrains Mono` for all quantitative data.
- **Colors:** Base background `#060608`, primary accents in high-contrast blue, emerald, and technical amber.
- **Components:** Ensure all heavy widgets are wrapped in `React.memo` to handle the 30s auto-refresh cycles.

## 📄 License

Part of the ZK-WebRadio administrative ecosystem. Reference the main repository for comprehensive licensing information.
