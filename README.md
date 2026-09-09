# Perfumes El Padrino

Tienda digital premium con catálogo administrable, carrito y cierre de pedidos por WhatsApp. El sistema usa una vitrina React/Vinext, una API ASP.NET Core 8 y PostgreSQL en Supabase.

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
npm run dev -- --port 3001
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

Frontend:

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SITE_URL`

No agregues contraseñas ni cadenas de conexión a archivos versionados.
