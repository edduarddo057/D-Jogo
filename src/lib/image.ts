/**
 * Reduz uma foto escolhida no celular para um quadrado pequeno (corte no centro), em JPEG.
 * Fotos de câmera têm vários MB; perfil e turma só precisam de 256×256 (~20–40 KB), e o servidor
 * recusa acima de 300 KB.
 */
export async function squarePhoto(file: File, size = 256, quality = 0.85): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob) throw new Error('toBlob');
  return new File([blob], 'foto.jpg', { type: 'image/jpeg' });
}
