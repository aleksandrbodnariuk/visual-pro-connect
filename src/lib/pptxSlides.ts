import JSZip from 'jszip';

/** Витягує зі слайдів PowerPoint найбільше зображення кожного слайда у правильному порядку. */
export async function extractPptxSlideImages(file: File): Promise<Blob[]> {
  const zip = await JSZip.loadAsync(file);
  const pres = await zip.file('ppt/presentation.xml')?.async('string');
  const presRels = await zip.file('ppt/_rels/presentation.xml.rels')?.async('string');
  if (!pres || !presRels) throw new Error('Це не схоже на файл PowerPoint (.pptx)');
  const relMap = relTargets(presRels);
  const ids = [...pres.matchAll(/<p:sldId\b[^>]*r:id="([^"]+)"/g)].map((m) => m[1]);
  const out: Blob[] = [];
  for (const id of ids) {
    const target = relMap[id]; if (!target) continue;
    const name = target.split('/').pop()!;
    const rels = await zip.file(`ppt/slides/_rels/${name}.rels`)?.async('string');
    if (!rels) continue;
    const media = Object.values(relTargets(rels)).filter((t) => t.includes('media/') && /\.(png|jpe?g|webp|gif)$/i.test(t))
      .map((t) => zip.file('ppt/media/' + t.split('/').pop()!)).filter(Boolean) as JSZip.JSZipObject[];
    if (!media.length) continue;
    const blobs = await Promise.all(media.map((m) => m.async('blob')));
    out.push(blobs.reduce((a, b) => (b.size > a.size ? b : a)));
  }
  return out;
}

function relTargets(xml: string): Record<string, string> {
  const r: Record<string, string> = {};
  for (const m of xml.matchAll(/<Relationship\b([^>]*)\/?>/g)) {
    const id = /Id="([^"]+)"/.exec(m[1])?.[1]; const t = /Target="([^"]+)"/.exec(m[1])?.[1];
    if (id && t) r[id] = t;
  }
  return r;
}

/** Стискає картинку до WebP шириною до 1920px. */
export async function toWebp(blob: Blob, max = 1920, quality = 0.82): Promise<Blob> {
  const bmp = await createImageBitmap(blob);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Не вдалося стиснути'))), 'image/webp', quality));
}
