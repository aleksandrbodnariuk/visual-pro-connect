/**
 * Generates PWA app icons from a source image using the Canvas API.
 * Produces standard "any" icons (full-bleed) and "maskable" icons
 * (with 24% safe-zone padding) on a configurable background.
 */

export interface GeneratedIcon {
  size: number;
  purpose: "any" | "maskable" | "apple";
  blob: Blob;
  fileName: string;
}

const ICON_SIZES: Array<{ size: number; purpose: "any" | "maskable" | "apple"; fileName: string }> = [
  { size: 192, purpose: "any", fileName: "app-icon-192.png" },
  { size: 512, purpose: "any", fileName: "app-icon-512.png" },
  { size: 192, purpose: "maskable", fileName: "app-icon-192-maskable.png" },
  { size: 512, purpose: "maskable", fileName: "app-icon-512-maskable.png" },
  { size: 180, purpose: "apple", fileName: "app-icon-apple-180.png" },
];

const SAFE_ZONE_RATIO = 0.76; // 24% padding around for maskable safe zone
const BACKGROUND_COLOR = "#0b0b0b";

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type = "image/png", quality = 0.95): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
      type,
      quality
    );
  });
}

function renderIcon(
  img: HTMLImageElement,
  size: number,
  purpose: "any" | "maskable" | "apple"
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Background fill (dark) for maskable + apple to avoid transparency issues
  if (purpose === "maskable" || purpose === "apple") {
    ctx.fillStyle = BACKGROUND_COLOR;
    ctx.fillRect(0, 0, size, size);
  }

  // Compute draw size
  const targetSize = purpose === "maskable" ? size * SAFE_ZONE_RATIO : size;
  const offset = (size - targetSize) / 2;

  // Preserve aspect ratio (contain)
  const aspect = img.width / img.height;
  let drawW = targetSize;
  let drawH = targetSize;
  if (aspect > 1) {
    drawH = targetSize / aspect;
  } else if (aspect < 1) {
    drawW = targetSize * aspect;
  }
  const dx = offset + (targetSize - drawW) / 2;
  const dy = offset + (targetSize - drawH) / 2;

  ctx.drawImage(img, dx, dy, drawW, drawH);
  return canvas;
}

export async function generateAppIcons(file: File): Promise<GeneratedIcon[]> {
  const img = await loadImage(file);
  const results: GeneratedIcon[] = [];

  for (const spec of ICON_SIZES) {
    const canvas = renderIcon(img, spec.size, spec.purpose);
    const blob = await canvasToBlob(canvas, "image/png");
    results.push({
      size: spec.size,
      purpose: spec.purpose,
      blob,
      fileName: spec.fileName,
    });
  }

  return results;
}