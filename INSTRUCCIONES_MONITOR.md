# Instrucciones para ejecutar el Portal de Monitoreo

## Datos de acceso al Portal de Monitoreo
- **Email**: admin.monitor@inventario.cl
- **Contraseña**: Monitor2025!
- **URL de acceso**: http://localhost:3000/monitor/login

## Pasos para ejecutar con Docker

1. Asegúrate de que Docker y Docker Compose estén instalados y funcionando.

2. Copia el archivo .env.docker a .env:
   ```bash
   cp .env.docker .env
   ```

3. Levanta los contenedores:
   ```bash
   docker-compose up -d
   ```

4. El sistema estará disponible en:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3300
   - Portal de Monitoreo: http://localhost:3000/monitor/login

5. La primera vez que accedas al Portal de Monitoreo, deberás configurar la autenticación 2FA:
   - Ingresa con las credenciales proporcionadas
   - Escanea el código QR con Google Authenticator o app similar
   - Ingresa el código de 6 dígitos para completar el login

## Pasos para ejecutar sin Docker

1. Inicia Redis:
   ```bash
   npm run redis
   ```

2. Aplica las migraciones a la base de datos:
   ```bash
   mysql -u root -p < db/init/04_monitor_setup.sql
   ```

3. Inicia el backend:
   ```bash
   cd backend
   npm install
   npm start
   ```

4. Inicia el frontend en otra terminal:
   ```bash
   cd frontend
   npm install
   npm start
   ```

## Notas importantes

- El usuario administrador del monitor ya está creado en la base de datos con todos los permisos necesarios.
- La contraseña del administrador está hasheada con bcrypt y configurada en el archivo .env.
- El sistema está configurado para usar autenticación de dos factores (2FA) para mayor seguridad.

## Resolución de problemas

- Si tienes problemas con Redis, asegúrate de que esté instalado y funcionando:
  ```bash
  redis-cli ping
  ```
  Deberías recibir "PONG" como respuesta.

- Si hay problemas con la autenticación 2FA, puedes regenerar el secreto TOTP:
  ```bash
  npm run gen-totp --user admin_monitor
  ```
