# ZK-WebRadio Dashboard: Cyber-Industrial Admin

[![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
[![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)

Una interfaz administrativa de alta fidelidad y grado industrial para el sistema de relay ZK-WebRadio. Este dashboard combina una estética "Cyber-Industrial" con inteligencia de red en tiempo real, análisis de tráfico geolocalizado y gestión de operaciones de alto rendimiento.

## 🚀 Stack Tecnológico

- **Frontend:** React 19 (Vite)
- **Estilos:** Tailwind CSS v4 (Sistema de diseño Cyber-Industrial)
- **Tipografía:** Geist Sans (UI) y JetBrains Mono (Datos Técnicos)
- **Autenticación:** Supabase Auth (Integración Discord OAuth)
- **Mapas:** MapLibre GL con capas de calor (Heatmaps) personalizadas
- **Animaciones:** Framer Motion (Transiciones BlurFade optimizadas)
- **Visualización:** Recharts (Analíticas dinámicas y progreso de audiencia)
- **Iconografía:** Lucide React (con iconos de estado "Flame" dinámicos)

## 🏗️ Arquitectura del Proyecto

El dashboard utiliza una arquitectura modular de "Bento Grid", optimizada para la eficiencia operativa.

- **Diseño Bento Grid:** Organización modular donde cada widget es autónomo y visualmente coherente.
- **Gestión de Scroll Aislada:** Sidebar y cabecera estáticos con paneles de contenido que hacen scroll de forma independiente.
- **Capa de Servicios:** Integración centralizada en `src/services/api.ts` con manejo automático de tokens JWT y normalización de IPs (IPv4/IPv6).
- **Inteligencia de Red:** Geolocalización en tiempo real mediante API propia (`gip.api.azke.tech`) con caché persistente en memoria.
- **Rendimiento:** Uso de aceleración por hardware (`translate-z-0`) y memoización de componentes para mantener un uso de CPU <1%.

## ✨ Funcionalidades Clave

- **🌐 Network Intelligence:** Mapa global interactivo con **Heatmaps** de densidad y marcadores **"Flame"** que escalan según el volumen de tráfico.
- **📊 Audiencia Activa:** Monitorización en tiempo real con barras de progreso dinámicas en Recharts para audiencia y distribución de hardware.
- **🗺️ Geolocalización Visual:** Identificación de países mediante banderas SVG integradas directamente desde la API de inteligencia de red.
- **🔑 Control de API:** Consola de gestión de credenciales con previsualizaciones de seguridad y edición en línea.
- **🚨 Monitor de Anomalías:** Seguimiento de fallos críticos del sistema con herramientas de reparación de metadatos integradas.
- **📂 Navegador de Caché:** Explorador visual para gestionar y previsualizar activos de audio distribuidos.

## 🛠️ Instalación y Configuración

### Requisitos Previos
- Node.js (Última versión LTS)
- Proyecto Supabase (Con Discord Auth habilitado)
- API Key para el servicio de geolocalización de Azke Tech

### Pasos de Configuración
1. **Instalar dependencias:** `npm install`
2. **Variables de Entorno:** Configurar `.env` con:
   - `VITE_API_URL`: URL de tu API de administración.
   - `VITE_GEO_API_KEY`: Tu clave para la API de geolocalización.
   - `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
3. **Modo Desarrollo:** `npm run dev`

## 📝 Estándares de Desarrollo

- **Tipografía:** `Geist Sans` para etiquetas de UI y `JetBrains Mono` estrictamente para datos cuantitativos, IPs y terminales.
- **Colores:** Fondo base `#060608`, acentos en azul primario, verde esmeralda para estados nominales y rojo para anomalías.
- **Surgical Updates:** Las actualizaciones deben ser quirúrgicas y mantener la integridad de tipos en TypeScript.
- **Memoización:** Los widgets pesados deben estar envueltos en `React.memo` para soportar ciclos de refresco de 30s sin stuttering.

---
Parte del ecosistema administrativo de **ZK-WebRadio**.
