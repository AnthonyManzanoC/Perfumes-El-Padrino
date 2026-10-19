# Revisión vigente de disponibilidad — 18 de octubre de 2026

El propietario amplió la evidencia a 23 imágenes y confirmó que todos los pedidos son pruebas y que solo debe cambiar el stock. La revisión vigente está en `inventory-availability-review-2026-10-18.json`: **89 referencias disponibles y 8 agotadas**. Se reactivan Armani Code, Uomo Born in Roma, Aventus, Silver Mountain Water, 9PM original y CK Free. Los cinco productos afectados por reservas de prueba mantienen sus pedidos: stock administrativo 2 = 1 reservado + 1 disponible. Los demás datos comerciales permanecen intactos.

`node scripts/reconcile-availability-2026-10-18.mjs` audita sin modificar el catálogo; `--apply` aplica el ajuste manual fechado con respaldo, protección de concurrencia y verificación de todos los campos no relacionados con stock. **No usar este comando para reponer automáticamente futuras ventas.** La revisión exporta un CSV completo en `work/inventory-2026-10-18/availability-review.csv`. Los dos importadores del primer corte ahora rechazan ejecutarse para no devolver a agotado modelos reintroducidos por el propietario. La protección de URLs ya está desplegada en la API.

Observaciones sin modificación por el alcance “solo stock”: la foto 22 muestra Mugler A*Men Fantasm 100 ml, no el original EDT; y la imagen 23 de CK Free muestra 50 ml frente a 100 ml en la ficha existente. Estos casos quedan señalados para una corrección comercial separada; no se crean duplicados ni se inventan nuevos precios.

# Catálogo real — septiembre de 2026 (histórico)

Los 67 productos y sus precios/ofertas se transcribieron de las nueve capturas de WhatsApp del propietario. El propietario autorizó **una unidad de cada producto y envío gratis**; ambos valores se pueden cambiar en Administración.

`current-products.tsv` conserva el listado transcrito. Los tamaños ausentes en las capturas quedan vacíos, sin inferir la presentación vendida a partir de una fotografía comercial. Las fotos pueden mostrar otros tamaños o revisiones de empaque de la misma fragancia.

`image-sources.json` registra la procedencia de cada imagen descargada y las observaciones de identificación. Las fotografías pertenecen a sus fabricantes o comercios de origen; no se encontró una licencia abierta de reutilización. No se generaron frascos artificiales.

`real-catalog.json` contiene los datos de importación y las rutas locales a las galerías optimizadas. El reemplazo explícito guarda primero los productos anteriores en `work/catalog-backups/`, conserva los pedidos históricos y reemplaza el catálogo en una transacción. No se ejecuta al iniciar normalmente la tienda.

No repitas la importación después de editar inventario o productos desde el administrador: restablece el catálogo completo a la configuración inicial autorizada.
# Inventario confirmado el 18 de octubre de 2026

Las once capturas del propietario contienen 83 referencias distintas (Island Bliss aparece repetido en el solapamiento). `inventory-2026-10-18.json` registra precios, ofertas y volúmenes explícitos: 60 referencias existentes, 23 nuevas y 14 fichas anteriores que pasan a stock cero, conservando sus URLs y galerías.

`new-arrivals-2026-10-18.json` contiene las 23 fichas nuevas y 84 fotografías WebP: 3 o 4 por perfume. Los originales y su procedencia están en `research/inventory-2026-10-18-{a,b,c}.json`. Son recursos del fabricante o minoristas identificados, no fotografías de autoría de la tienda ni material con licencia abierta. No se inventaron frascos ni se intercambiaron variantes para completar galerías. Las concentraciones contradictorias no se añaden al nombre público.

La cantidad base mantiene la autorización previa de una unidad por producto, conserva cantidades positivas y respeta reservas de pedidos. Los volúmenes ausentes en las últimas capturas permanecen sin especificar.

Publicación segura:

1. Preparar imágenes B con `node scripts/prepare-inventory-2026-10-18-assets.mjs` y compilar fichas con `node scripts/finalize-inventory-2026-10-18.mjs`.
2. Publicar y verificar los recursos estáticos antes de referenciarlos desde la base de datos.
3. `node scripts/sync-inventory-2026-10-18.mjs` solo muestra el plan. Requiere credenciales administrativas en variables de entorno. `--apply` guarda respaldos en `work/catalog-backups/`, valida reservas/concurrencia mediante la API y comprueba que no cambien slugs. `--verify` es de solo lectura.
4. Si Render aún ejecuta la API antigua que recalcula slugs en cada PUT, el proyecto `backend/PerfumesElPadrino.CatalogInventory` permite exclusivamente ajustar stock de las 74 fichas revisadas. Usa `CATALOG_POSTGRES`, verifica IDs contra el catálogo público, no ejecuta migraciones ni inicia trabajadores y realiza una transacción serializable con validación de reservas y concurrencia. Sin `--apply` no modifica nada. Después, `--apply --create-only` del script Node rechaza cualquier PUT y solo crea los productos nuevos. No usar esta alternativa para cambiar descripciones, precios o galerías existentes.

El parche de `AdminController` conserva slugs publicados incluso al cambiar el nombre; solo genera slug para nuevas fichas. Nunca volver a importar un inventario anterior sobre este corte ni restablecer unidades vendidas sin otro inventario autorizado.
