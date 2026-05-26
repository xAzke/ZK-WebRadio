# Resumen de Migración a Supabase (PostgreSQL)

Se ha migrado la base de datos local de SQLite a una base de datos en la nube (PostgreSQL) utilizando Supabase.

## Cambios Realizados

### 1. Dependencias (webradio.csproj)
*   **Eliminado:** `Microsoft.EntityFrameworkCore.Sqlite` (v8.0.0)
*   **Añadido:** `Npgsql.EntityFrameworkCore.PostgreSQL` (v8.0.0)

### 2. Configuración (appsettings.json & Docker)
*   Se ha añadido la sección `ConnectionStrings` con la clave `DefaultConnection`.
*   Se ha eliminado la sección `Database:Path` que apuntaba al archivo local `.db`.
*   **Mejora de Seguridad y Flexibilidad:** En `docker-compose.prod.yml`, se han separado las credenciales en variables individuales (`DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`). Esto es más limpio y permite cambiar solo la contraseña o el host sin tocar toda la cadena de conexión.
*   **Limpieza de Docker:** Se eliminó el volumen `./data:/app/data` ya que la aplicación ahora es "stateless".

### 3. Código Fuente (Startup.cs)
*   **ConfigureServices:** Se cambió `options.UseSqlite` por `options.UseNpgsql`.
*   **Lógica de Conexión Robusta:** El sistema ahora intenta leer la conexión completa de `DefaultConnection`. Si no existe, construye la cadena automáticamente usando las variables `DB_HOST`, `DB_NAME`, `DB_USER` y `DB_PASS`.
*   **Configure:** Se eliminó la lógica de creación de carpetas locales para la DB. La aplicación ahora intenta conectar directamente a la red.
*   Se mantiene `context.Database.EnsureCreated()`, lo que significa que al iniciar la aplicación, las tablas se crearán automáticamente en Supabase si aún no existen.

## Próximos Pasos Recomendados

1.  **Configurar Contraseña:** Abre `webradio/appsettings.json` y pon tu contraseña de Supabase.
2.  **Prueba de Conexión:** Inicia la aplicación. Deberías ver en los logs que se conecta a PostgreSQL.
3.  **Seguridad:** Considera usar variables de entorno para la contraseña en lugar de dejarla en el archivo JSON si vas a subir esto a un repositorio público.
4.  **Limpieza:** Puedes borrar de forma segura el archivo `webradio.db` de tu servidor una vez confirmes que todo funciona en la nube.

---
*Generado automáticamente por Gemini CLI - 10 de Mayo de 2026*