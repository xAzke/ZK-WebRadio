# 🌐 Guía de Configuración de Dominio y SSL

Esta guía explica cómo configurar tu propio dominio y asegurar la conexión con HTTPS para la API de **ZK-WebRadio**.

---

## 1. Configuración de DNS

En el panel de tu proveedor de dominio (Cloudflare, GoDaddy, Namecheap, etc.):

1.  Crea un **Registro A**.
2.  **Nombre/Host:** `@` (para el dominio principal) o `api` (para un subdominio).
3.  **Valor/IP:** La dirección IP pública de tu servidor VPS.
4.  **TTL:** Automático o 3600.

---

## 2. Instalación y Configuración de Nginx

Nginx actuará como un **Proxy Inverso**, recibiendo las peticiones en el puerto 80/443 y redirigiéndolas al contenedor de la API que corre internamente en el puerto `5000`.

### Instalación
```bash
sudo apt update
sudo apt install nginx -y
```

### Configuración del sitio
Crea un nuevo archivo de configuración:
```bash
sudo nano /etc/nginx/sites-available/webradio
```

Pega el siguiente contenido (reemplaza `tu-dominio.com` por tu dominio real):
```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection keep-alive;
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Activar el sitio
```bash
# Crear enlace simbólico
sudo ln -s /etc/nginx/sites-available/webradio /etc/nginx/sites-enabled/

# Verificar que no haya errores de sintaxis
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

---

## 3. Seguridad con SSL (HTTPS)

Utilizaremos **Certbot** de Let's Encrypt para obtener un certificado gratuito de forma automática.

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtener e instalar el certificado
sudo certbot --nginx -d tu-dominio.com
```

*Sigue las instrucciones en pantalla (usualmente pide un correo y aceptar los términos). Certbot configurará automáticamente la redirección de HTTP a HTTPS.*

---

## 4. Ajustes en la API

Para que la API funcione correctamente detrás de un proxy y no haya problemas de CORS con el Dashboard:

### Configuración de Headers (Ya integrada)
La aplicación ya está configurada en `Startup.cs` para confiar en los encabezados `X-Forwarded-For` y `X-Forwarded-Proto` que envía Nginx:

```csharp
services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownProxies.Clear();
    options.KnownNetworks.Clear();
});
```

### CORS para el Dashboard
Si usas el Dashboard, asegúrate de actualizar su URL en el archivo `webradio/appsettings.json` o mediante variables de entorno en tu `docker-compose.prod.yml`:

```json
"Dashboard": {
  "Url": "https://dashboard.tu-dominio.com"
}
```

O en `docker-compose.prod.yml`:
```yaml
environment:
  - Dashboard__Url=https://dashboard.tu-dominio.com
```

---

## 🚀 Verificación
Una vez completado, tu API debería estar accesible en:
`https://tu-dominio.com/webradio/health` (o cualquier endpoint de la API).
