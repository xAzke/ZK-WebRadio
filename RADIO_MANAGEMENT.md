# 📻 Guía de Gestión: radio.sh

El script `radio.sh` es una herramienta de terminal diseñada para facilitar la administración, el despliegue y el mantenimiento de la API de **ZK-WebRadio**. Actúa como una interfaz simplificada sobre Docker Compose, permitiéndote gestionar los servicios sin necesidad de recordar comandos complejos.

---

## 🚀 Comandos Rápidos

Para ejecutar el script, utiliza la siguiente sintaxis desde la raíz del proyecto:

```bash
./radio.sh [comando]
```

| Comando | Descripción |
| :--- | :--- |
| `up` | Levanta todos los servicios en segundo plano. |
| `down` | Detiene y elimina los contenedores activos. |
| `restart` | Reinicia todos los servicios. |
| `logs` | Muestra los registros (logs) en tiempo real. |
| `build` | Reconstruye las imágenes de los servicios. |
| `db` | Abre una consola interactiva de la base de datos SQLite. |
| `stats` | Muestra el estado y consumo de los contenedores. |

---

## 🛠️ Detalle de Funcionalidades

### 🔋 Gestión de Servicios (`up` / `down` / `restart`)
Estos comandos gestionan el ciclo de vida de los contenedores (API, Deezer Service y Redis).
- **Auto-detección:** El script detecta automáticamente si debe usar la configuración de **Producción** (`docker-compose.prod.yml`) o la de **Desarrollo** basándose en la presencia de archivos o parámetros.

### 📝 Visualización de Logs (`logs`)
Ideal para depuración. Te permite ver qué está pasando dentro de la API en tiempo real.
- *Tip:* Presiona `Ctrl + C` para salir de la vista de logs sin detener el servidor.

### 🏗️ Reconstrucción (`build`)
Utilízalo después de hacer cambios en el código fuente de los servicios para generar nuevas imágenes de Docker actualizadas.

### 🗄️ Consola de Base de Datos (`db`)
Accede directamente a la base de datos SQLite interna (`webradio.db`) que se encuentra dentro del contenedor. Es muy útil para:
- Consultar API Keys manualmente.
- Revisar estadísticas de canciones.
- Limpiar metadatos antiguos.

### 📊 Monitoreo (`stats`)
Proporciona una vista rápida del uso de CPU y Memoria de cada componente del sistema, ayudándote a identificar cuellos de botella.

---

## 📋 Requisitos para su uso
1. Tener **Docker** y **Docker Compose** instalados y en ejecución.
2. Dar permisos de ejecución al script (solo la primera vez):
   ```bash
   chmod +x radio.sh
   ```

---

> [!TIP]
> Si ejecutas el script sin ningún comando (`./radio.sh`), verás una pantalla de ayuda con todos los comandos disponibles y una breve explicación.
