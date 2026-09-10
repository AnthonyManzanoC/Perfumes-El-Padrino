# Perfumes El Padrino

Tienda digital premium con catálogo administrable, carrito visible y compra por transferencia dentro de la web. El sistema usa Next.js para Vercel, una API ASP.NET Core 8 y PostgreSQL en Supabase. La configuración alternativa de Sites/Vinext se conserva con `dev:sites` y `build:sites`.

## Qué incluye

- Catálogo responsive con búsqueda, categorías, ordenamiento, ofertas, destacados y control de stock.
- Ficha individual para cada perfume con URL compartible, galería de hasta 8 fotos, descripción, notas, disponibilidad y SEO propio.
- Carrito persistente y visible con checkout interno: correo, teléfono, ciudad, dirección, total calculado por la API, instrucciones bancarias y comprobante privado.
- Recomendador de fragancias determinístico de tres preguntas, sin IA.
- Página `/nosotros` conectada a los textos, logo, colores, dirección e imagen administrables.
- Panel `/admin` para productos, precio normal u oferta, envío gratis o con costo por perfume, galerías, stock, categorías, pedidos, textos, colores, logo e imágenes.
- Reserva por 24 horas mientras se espera el comprobante; se conserva durante la revisión bancaria. El stock se descuenta una sola vez al aprobar el pago y se repone al cancelar antes del despacho.
- Seguimiento privado del pedido, historial, transportadora y guía; actualización automática cada 15 segundos.
- Correos de todos los estados con PDF y cola persistente de reintentos. Brevo y datos bancarios editables en Administración > Compras y correo.
- Descripciones sensoriales y notas para los 67 perfumes, con fuentes en `catalog/fragrance-sources.json`.
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


## Compra por transferencia

1. El cliente crea el pedido en el carrito. El servidor valida disponibilidad, suma los precios actuales y reserva las unidades durante 24 horas.
2. La pantalla `/pedido/[numero]` muestra los datos de transferencia guardados para ese pedido. El correo inicial incluye el enlace privado; su token viaja en el fragmento y después se guarda en el dispositivo, nunca en consultas URL del servidor.
3. El cliente adjunta JPG, PNG o WebP de hasta 2 MB. El pedido pasa a **En verificación**, sin marcarlo como pagado. La reserva no vence mientras el administrador revisa el banco.
4. El administrador abre el comprobante y confirma que el dinero ingresó. La acción **Aprobar pago verificado** descuenta el stock en una transacción serializable.
5. El pedido pasa por **Pagado → Preparando envío → Enviado → Entregado**. Para despachar se exige transportadora y guía; el enlace HTTPS de seguimiento es opcional. El sistema registra y notifica los datos; la contratación de la transportadora y cualquier devolución de dinero se coordinan por la tienda.
6. Un comprobante rechazado requiere un motivo y permite volver a adjuntarlo durante 24 horas. La cancelación conserva el historial. No se eliminan pedidos ni se reponen unidades de pedidos ya despachados.

Cada evento guarda en la misma transacción una notificación al cliente y otra al administrador. Brevo recibe por HTTPS el HTML, texto y PDF en Base64. Los fallos permanecen en la cola con reintentos crecientes hasta seis horas y se conserva el orden por pedido y destinatario. La entrega es al menos una vez: un corte después de que Brevo acepte el mensaje puede ocasionar duplicados. “Enviado” significa aceptado por el proveedor, no entregado ni leído.

Los comprobantes se guardan como `bytea` privado en PostgreSQL/Supabase, con acceso únicamente por la API autenticada, sin crear enlaces públicos ni depender del disco efímero de Render. Las nuevas tablas y las tablas de pedidos/sesiones tienen RLS habilitado sin políticas para usuarios del navegador. La API debe conectarse con el propietario de las tablas o un rol de servidor con BYPASSRLS. No hace falta configurar un bucket público ni entregar claves de Supabase al cliente.

Los PDF son resúmenes sin acreditación de pago antes de la aprobación y recibos de compra después. No sustituyen una factura tributaria. QuestPDF se utiliza bajo su licencia Community para el negocio pequeño descrito; revisar su licencia si la organización supera el umbral de ingresos aplicable.

## Brevo y activación

El envío usa `POST https://api.brevo.com/v3/smtp/email`, cabecera `api-key` y adjuntos `attachment: [{ name, content }]`. Referencia: https://developers.brevo.com/reference/send-transac-email.

1. Desplegar juntos backend y frontend. La migración `BrevoEmailApi` se ejecuta al iniciar la API; elimina la configuración SMTP, crea `BrevoApiKeyEncrypted` vacía y desactiva nuevas compras hasta configurar Brevo. Conserva pedidos, PDF y cola.
2. Mantener `Commerce__EncryptionKey`: clave Base64 de 32 bytes, estable y privada, igual en todas las instancias. Se sigue usando AES-GCM.
3. En Administración > Compras y correo, pegar la clave API completa de Brevo y guardar. Vacío conserva la clave existente; GET nunca devuelve la clave ni el cifrado. No usar la antigua contraseña de Gmail.
4. Verificar el remitente en Brevo, enviar una prueba al administrador y activar las compras cuando los datos bancarios sean reales.

`Brevo__ApiKey` es un bootstrap opcional solo para una base nueva; la configuración normal es desde el administrador. No guardar secretos en Git. Se puede retirar la variable antigua `Smtp__Password` del alojamiento. No se necesitan puertos SMTP ni MailKit. El cliente HTTP tiene timeout, TLS normal, redirecciones desactivadas y cabecera sensible redactada. Los errores muestran mensajes seguros según estado HTTP; no se guardan respuestas del proveedor con datos personales.

El contrato de Application está en `Application/IEmailSender.cs`; el adaptador HTTP en `Infrastructure/BrevoEmailSender.cs`. La cola existente consume la interfaz. Se mantiene el proyecto actual sin reorganizar las demás funcionalidades.

## Validación del checkout

`backend/PerfumesElPadrino.IntegrationTests` contiene una suite de integración contra PostgreSQL real. Recibe `TEST_POSTGRES`, crea un esquema aleatorio `checkout_test_*`, aplica las migraciones y elimina exclusivamente ese esquema al terminar. No usa las tablas de producción, no envía correos y prueba privacidad, totales, reservas, comprobantes, aprobación concurrente, envíos e historial. Ejecutar desde la raíz:

```powershell
dotnet run --project backend/PerfumesElPadrino.IntegrationTests --artifacts-path work/integration-tests
npm.cmd run build
```

La suite genera PDF de prueba de una y varias páginas en `work/` para verificar su maquetación.


### Resultado de verificación en este equipo

- 37 comprobaciones de integración correctas, incluida concurrencia de checkout/aprobación, reenvío de comprobantes y reposición de stock.
- Compilaciones Next.js y .NET correctas; análisis lint de los nuevos componentes correcto. El lint global todavía informa incidencias en componentes anteriores y en los componentes UI incluidos por el proyecto.
- Catálogo real: 67 descripciones con notas y 233 imágenes verificadas.
- Estos cambios no se han publicado en Vercel/Render desde esta tarea. La configuración bancaria conserva los ejemplos y el checkout permanece desactivado.

### Validación del cambio a Brevo

Compilación de .NET y Next.js correcta; lint del componente de administración correcto. Diez comprobaciones HTTP simuladas verifican endpoint, autenticación, PDF Base64, destinatario, HTML/texto, envío sin adjunto y errores 400/401/403/429/503, sin enviar correos reales. La suite de integración añade comprobaciones de guardado cifrado y conservación de clave vacía. No se ha desplegado ni validado una clave real de Brevo.
