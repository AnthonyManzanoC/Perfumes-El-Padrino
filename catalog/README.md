# Catálogo real — septiembre de 2026

Los 67 productos y sus precios/ofertas se transcribieron de las nueve capturas de WhatsApp del propietario. El propietario autorizó **una unidad de cada producto y envío gratis**; ambos valores se pueden cambiar en Administración.

`current-products.tsv` conserva el listado transcrito. Los tamaños ausentes en las capturas quedan vacíos, sin inferir la presentación vendida a partir de una fotografía comercial. Las fotos pueden mostrar otros tamaños o revisiones de empaque de la misma fragancia.

`image-sources.json` registra la procedencia de cada imagen descargada y las observaciones de identificación. Las fotografías pertenecen a sus fabricantes o comercios de origen; no se encontró una licencia abierta de reutilización. No se generaron frascos artificiales.

`real-catalog.json` contiene los datos de importación y las rutas locales a las galerías optimizadas. El reemplazo explícito guarda primero los productos anteriores en `work/catalog-backups/`, conserva los pedidos históricos y reemplaza el catálogo en una transacción. No se ejecuta al iniciar normalmente la tienda.

No repitas la importación después de editar inventario o productos desde el administrador: restablece el catálogo completo a la configuración inicial autorizada.
