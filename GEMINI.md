# ZK-WebRadio Dashboard: Instructional Mandates

This document serves as the foundational technical and architectural guide for the ZK-WebRadio Dashboard project. It must be used as the primary context for all future AI interactions to ensure consistency, performance, and aesthetic integrity.

## 🏗️ Core Architecture & Patterns

- **Bento Grid Layout:** The main dashboard tab follows a modular grid system. Each widget must be self-contained and visually aligned within the grid.
- **Isolated Scroll Management:** The application enforces a static sidebar and header (`h-screen overflow-hidden`). Central content panes must scroll independently using custom-styled, low-impact scrollbars.
- **Component Memoization:** To handle real-time data refreshes (every 30s) without UI stutter, all heavy statistical widgets (`StatsCard`, `TopTracks`, `TopFailures`, `TrafficView`) must be wrapped in `React.memo`.
- **Service-Oriented Design:** All data fetching and business logic resides in `src/services/api.ts`. Authentication is handled via Supabase (Discord OAuth), with JWT tokens automatically managed in the fetch layer.

## 🎨 Design System: Cyber-Industrial

- **Color Palette:**
  - Background: `#060608` (Main) / `#0a0a0c` (Sidebar/Cards).
  - Accents: Tailwind `primary` (Blue), `emerald-500` (Nominal), `red-500` (Fault/Anomaly).
  - High-Fidelity Glass: Use `bg-white/[0.03]` and `backdrop-blur-xl` sparingly.
- **Typography Standards:**
  - **Geist Sans:** Used for all UI labels, navigation, and primary headers.
  - **JetBrains Mono:** Strictly used for quantitative data, IP addresses, timestamps, and terminal-style previews.
- **Visual Flourishes:**
  - **Technical Accents:** Use corner markings, scanline effects on hover, and pulsing "LED" indicators.
  - **Performance-First Backgrounds:** Avoid heavy canvas-based animations. Use static `radial-gradient` backgrounds for ambient glows to keep CPU usage near 0%.

## 🚀 Performance & Technical Standards

- **Hardware Acceleration:** Ensure all scrollable containers and large background elements use `translate-z-0` or `will-change-scroll` to promote them to GPU layers.
- **CSS Filter Policy:** `blur()` and `backdrop-blur` are prohibited on elements that move during scroll. Use semi-opaque solid backgrounds (`bg-opacity-95`) as alternatives to preserve frame rates.
- **Geolocation Logic:** The `TrafficView` uses a cached IP resolution service. Always use the `geolocateIP` utility to avoid redundant API calls and respect rate limits.
- **Dependency Management:** The project uses **React 19** and **Tailwind CSS v4**. Avoid adding legacy CSS configurations; use the inline `@theme` block in `index.css` for theme extensions.

## 📂 Key Command Reference

- `npm run dev`: Local development terminal.
- `npm run build`: Production compilation (requires clean `tsc` pass).
- `npm run lint`: ESLint code quality audit.

## 🛠️ Development Guidelines

1. **Surgical Updates:** Apply targeted changes strictly within the requested scope.
2. **Type Integrity:** Maintain strict TypeScript definitions for all API responses and component props.
3. **Identity Priority:** User profile data must always be sourced from Discord metadata (`full_name`, `avatar_url`) provided by Supabase.
4. **Error Handling:** Use the `AuthError` terminal-style interface for all authentication or handshake failures.
