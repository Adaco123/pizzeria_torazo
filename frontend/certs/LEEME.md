# HTTPS local con mkcert

Los certificados (`*.pem`) NO se suben al repositorio (ver `.gitignore`).

1. Instala mkcert y su autoridad local (una sola vez por computadora):
   `mkcert -install`
2. Desde `frontend/certs`, genera el certificado con tu IP de red local
   (reemplaza 192.168.1.50 por la tuya; `ipconfig` en Windows, `ip a` en Linux):
   `mkcert -cert-file dev.pem -key-file dev-key.pem localhost 127.0.0.1 192.168.1.50`
3. Copia esos mismos dos archivos a `backend/certs/`.
4. Frontend: `.env.local` con `VITE_API_URL=https://192.168.1.50:5000` y `npm run dev`.
5. Backend: en `backend/.env` agrega
   `SSL_CERT=certs/dev.pem`, `SSL_KEY=certs/dev-key.pem` y
   `CORS_ORIGINS=https://192.168.1.50:5173,https://localhost:5173`.

Para abrirlo desde un celular/tablet: instala en él el archivo `rootCA.pem`
(ruta con `mkcert -CAROOT`) y confíalo en los ajustes del dispositivo.
