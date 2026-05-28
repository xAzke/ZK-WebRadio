# Guía de Configuración de Variables del Sistema

Esta guía detalla qué variables de configuración y credenciales debes colocar en cada archivo del proyecto para el correcto funcionamiento del backend y los contenedores de Docker.

---

## 1. Archivo de Entorno Principal (`.env`)
**Ruta del archivo:** `[API/.env](file:///c:/Users/Diego/Desktop/ZK-WebRadio/API/.env)`

Este es el archivo centralizado para configurar el entorno y la base de datos. Modifica los siguientes valores según corresponda:

### Base de Datos Supabase (C# Backend)
* **`DB_HOST`**: Host de tu base de datos Supabase. Se recomienda usar la URL de Connection Pooler (`aws-1-us-east-2.pooler.supabase.com`).
* **`DB_PORT`**: Puerto de la base de datos (por defecto `5432`).
* **`DB_NAME`**: Nombre de la base de datos (generalmente `postgres`).
* **`DB_USER`**: Usuario del pooler. Para Supabase, sigue el formato `postgres.[ID_PROYECTO]` (ej. `postgres.puhmoxdpjwdjtldrmblq`).
* **`DB_PASS`**: **[CRÍTICO]** Tu contraseña real de la base de datos de Supabase.

### URLs y Servicios
* **`DASHBOARD_URL`**: La URL del frontend donde corre el Dashboard (ej. `http://localhost:3000` o `https://dashboard.tu-dominio.com`). Se utiliza para configurar la política CORS en la API.
* **`SupabaseUrl`**: URL del proyecto Supabase para validar tokens JWT (`https://[ID_PROYECTO].supabase.co`).
* **`REDIS_CONFIGURATION`**: Host y puerto de Redis para la caché en producción (por defecto `redis:6379`).

---

## 2. Configuración de la API (`webradio/appsettings.json`)
**Ruta del archivo:** `[API/webradio/appsettings.json](file:///c:/Users/Diego/Desktop/ZK-WebRadio/API/webradio/appsettings.json)`

Contiene las configuraciones globales que sirven como fallback o se usan en desarrollo:

* **`ConnectionStrings:DefaultConnection`**: Cadena de conexión completa. Deja el placeholder `TU_PASSWORD_AQUI`, ya que la API reemplazará ese valor automáticamente si defines `DB_PASS` en tu entorno o en el `.env`.
* **`SupabaseUrl`**: Dirección de Supabase para desarrollo.
* **`Dashboard:Url`**: Dirección base del dashboard frontend.
* **`ApplicationOptions:EncryptionKey`**: Clave de encriptación interna (clave AES de 32 bytes en Base64).

---

## 3. Configuración de Producción (`webradio/appsettings.Production.json`)
**Ruta del archivo:** `[API/webradio/appsettings.Production.json](file:///c:/Users/Diego/Desktop/ZK-WebRadio/API/webradio/appsettings.Production.json)`

Este archivo sobrescribe los valores de `appsettings.json` cuando `ASPNETCORE_ENVIRONMENT=Production` (por defecto en Docker Compose):

* **`ConnectionStrings:DefaultConnection`**: Deja el placeholder `TU_PASSWORD_AQUI`. Se inyectará `DB_PASS` en tiempo de ejecución.
* **`Redis:Configuration`**: Apunta a `redis:6379`.
* **`ApplicationOptions:EncryptionKey`**: Cambia este valor por una clave segura de encriptación de producción.
* **`ApplicationOptions:ApiKeys`**: Configura las ApiKeys permitidas para los servidores externos de WebRadio.

---

## 4. Configuración del Entorno de Contenedores (`docker-compose.prod.yml`)
**Ruta del archivo:** `[API/docker-compose.prod.yml](file:///c:/Users/Diego/Desktop/ZK-WebRadio/API/docker-compose.prod.yml)`

No es necesario editar este archivo manualmente para cambiar configuraciones de base de datos o claves. Ahora lee dinámicamente las variables correspondientes del archivo `.env`:

* El contenedor `webradio` mapea `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`, `SupabaseUrl`, `DASHBOARD_URL` y `Redis__Configuration`.
* El contenedor `deezer` utiliza directamente los tokens ARL declarados en sus propios archivos de settings de servicio (`deezer-service/appsettings.json`).
