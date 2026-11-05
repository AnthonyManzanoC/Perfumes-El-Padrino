const maxBytes = 2_000_000;
const formats = ['image/jpeg', 'image/png', 'image/webp'];

export async function prepareProof(file: File): Promise<File> {
  const supported = formats.includes(file.type) || (!file.type && /\.(jpe?g|png|webp)$/i.test(file.name));
  if (file.size === 0 || !supported)
    throw new Error('Elige una imagen JPG, PNG o WebP.');
  if (file.size > 20_000_000)
    throw new Error('La imagen original pesa más de 20 MB. Elige una copia más pequeña.');

  const image = await createImageBitmap(file).catch(() => {
    throw new Error('No pudimos abrir esa imagen. Elige un comprobante válido.');
  });

  try {
    if (file.size <= maxBytes && image.width <= 12_000 && image.height <= 12_000 &&
        image.width * image.height <= 48_000_000)
      return file;

    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 2200 / Math.max(image.width, image.height));
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('No pudimos preparar la imagen en este dispositivo.');
    context.fillStyle = 'white';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    for (const quality of [0.9, 0.8, 0.65]) {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', quality),
      );
      if (blob && blob.size <= maxBytes)
        return new File([blob], 'comprobante.jpg', { type: 'image/jpeg' });
    }
    throw new Error('La imagen sigue pesando más de 2 MB. Recorta los bordes o elige otra foto.');
  } finally {
    image.close();
  }
}
