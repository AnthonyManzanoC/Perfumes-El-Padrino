# Perfumes El Padrino

Tienda digital premium con catálogo administrable, carrito y cierre de pedidos por WhatsApp. El sistema usa Next.js para Vercel, una API ASP.NET Core 8 y PostgreSQL en Supabase. La configuración alternativa de Sites/Vinext se conserva con `dev:sites` y `build:sites`.

## Qué incluye

- Catálogo responsive con búsqueda, categorías, ordenamiento, ofertas, destacados y control de stock.
- Ficha individual para cada perfume con URL compartible, galería de hasta 8 fotos, descripción, notas, disponibilidad y SEO propio.
- Carrito persistente en el dispositivo y pedido registrado antes de abrir WhatsApp, con subtotal, envío y total claramente desglosados.
- Recomendador de fragancias determinístico de tres preguntas, sin IA.
- Página `/nosotros` conectada a los textos, logo, colores, dirección e imagen administrables.
- Panel `/admin` para productos, precio normal u oferta, envío gratis o con costo por perfume, galerías, stock, categorías, pedidos, textos, colores, logo e imágenes.
- Inventario automático: se descuenta al confirmar/entregar un pedido y se repone al devolverlo a un estado no confirmado o eliminarlo.
- Sesiones administrativas revocables, contraseñas PBKDF2, CORS y límite de intentos de inicio de sesión.
- Migraciones de Entity Framework y configuración para desplegar la API en Render.

## Ejecutar en local

La cadena de Supabase y la cuenta inicial se guardan con **.NET User Secrets**, fuera del repositorio. Una vez configuradas, ejecuta:

```powershell
.\scripts\start-local.ps1
```

También puedes iniciar cada proceso por separado:

```powershell
dotnet run --project .\backend\PerfumesElPadrino.Api --launch-profile http
npm.cmd run dev -- --port 3001
```

Direcciones locales:

- Tienda: `http://localhost:3001`
- Administración: `http://localhost:3001/admin`
- Nosotros: `http://localhost:3001/nosotros`
- Ficha de ejemplo: `http://localhost:3001/perfumes/burberry-goddess`
- Salud de API: `http://localhost:5190/health`

## Variables para producción

Backend:

- `ConnectionStrings__Postgres`
- `AdminSeed__Email`
- `AdminSeed__Password`
- `CorsOrigins__0`

Frontend (Vercel):

- `API_URL`: `https://perfumes-el-padrino-api.onrender.com` (URL pública de la API C#, sin barra final). Este es también el valor predeterminado de producción.
- `NEXT_PUBLIC_SITE_URL`

No agregues contraseñas ni cadenas de conexión a archivos versionados.

## Despliegue en Vercel y Render

El repositorio incluye `vercel.json`: preset **Next.js**, comando `npm run build`, salida `.next` e instalación `npm ci`. No usar el preset Vite ni la salida `dist`: el build Vinext/Cloudflare anterior no generaba un sitio estático y provocaba un 404 aunque la compilación terminara correctamente.

1. Mantener la raíz del proyecto en `./` y desplegar el último commit de `master`.
2. En Vercel configurar `API_URL=https://perfumes-el-padrino-api.onrender.com` y `NEXT_PUBLIC_SITE_URL=https://perfumes-el-padrino.vercel.app`. Si existe `NEXT_PUBLIC_API_URL` con `localhost`, eliminarla o sustituirla por la URL de Render; `API_URL` tiene prioridad. Volver a desplegar después de cambiar variables.
3. En Render mantener `ConnectionStrings__Postgres`, `AdminSeed__Email` y `AdminSeed__Password` como secretos. No mover la conexión PostgreSQL al frontend.
4. El navegador solicita `/api/...` al mismo dominio de la tienda; Next.js reenvía método, cuerpo y autorización a Render. Las páginas de producto y Nosotros consultan Render en el servidor. Esto evita depender de CORS en el navegador.

La configuración local sigue usando `http://localhost:5190`. Para probar la web local contra Render, definir `API_URL` con su dirección antes de iniciar Next.js.

Comprobaciones: `node scripts/test-backend-url.mjs`, `npm run build`, `node node_modules/next/dist/bin/next start --port 3001`. Revisar `/`, `/admin`, `/nosotros`, `/perfumes/burberry-goddess` y `/api/storefront`. La API C# debe permanecer publicada para consultar datos y registrar pedidos; Vercel no ejecuta el proyecto .NET.
