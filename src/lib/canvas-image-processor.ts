"use client";

export interface FacsimileProcessOptions {
  type: "stamp" | "signature";
  sensitivity?: number; // 0 to 100, default 55
  inkEnhance?: boolean;  // default true
}

/**
 * Loads a File, Blob, or Data URL into an HTMLImageElement
 */
function loadImage(source: string | File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error("Не удалось загрузить изображение для обработки: " + err));

    if (typeof source === "string") {
      img.src = source;
    } else {
      const url = URL.createObjectURL(source);
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.src = url;
    }
  });
}

/**
 * Client-side HTML5 Canvas pixel processor for Auto-Cutout Facsimiles:
 * 1. Background removal with smooth alpha anti-aliasing
 * 2. Ink enhancement (saturation & contrast boost)
 * 3. Auto-crop bounding box and centering
 */
export async function processFacsimileImage(
  source: string | File | Blob,
  options: FacsimileProcessOptions
): Promise<string> {
  if (typeof window === "undefined") return "";

  const img = await loadImage(source);
  const type = options.type;
  const sensitivity = options.sensitivity !== undefined ? options.sensitivity : 55;
  const inkEnhance = options.inkEnhance !== false;

  // Max width/height to keep processing fast while preserving crisp resolution
  const maxDim = 1200;
  let srcW = img.naturalWidth || img.width;
  let srcH = img.naturalHeight || img.height;

  if (srcW > maxDim || srcH > maxDim) {
    const scale = maxDim / Math.max(srcW, srcH);
    srcW = Math.round(srcW * scale);
    srcH = Math.round(srcH * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = srcW;
  canvas.height = srcH;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas context is not available");

  ctx.drawImage(img, 0, 0, srcW, srcH);
  const imgData = ctx.getImageData(0, 0, srcW, srcH);
  const data = imgData.data;

  // Sensitivity mapped to luminance threshold:
  // sensitivity = 0   => threshold = 160
  // sensitivity = 55  => threshold = 215
  // sensitivity = 100 => threshold = 250
  const thresh = 160 + (sensitivity / 100) * 90;
  const featherRange = 28; // Anti-aliasing gradient width

  let minX = srcW;
  let minY = srcH;
  let maxX = 0;
  let maxY = 0;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    const origA = data[i + 3];

    if (origA === 0) continue;

    // Luminance according to ITU-R BT.601
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    // Distance from pure white
    const distFromWhite = Math.sqrt((255 - r) ** 2 + (255 - g) ** 2 + (255 - b) ** 2);

    let finalA = 255;

    // Background removal check
    if (lum >= thresh || distFromWhite < (255 - thresh) * 1.4) {
      finalA = 0;
    } else if (thresh - lum < featherRange) {
      // Soft transition feathering
      const ratio = (thresh - lum) / featherRange;
      finalA = Math.round(255 * Math.max(0, Math.min(1, ratio)));
    }

    if (finalA > 15) {
      // Ink enhancement
      if (inkEnhance) {
        if (type === "stamp") {
          // Detect stamp pigmentation:
          // Blue or violet ink:
          if (b > g || b > r * 0.8) {
            b = Math.min(255, Math.round(b * 1.3));
            r = Math.min(255, Math.round(r * 0.95));
            g = Math.min(255, Math.max(0, Math.round(g * 0.85)));
          } else if (r > g && r > b) {
            // Red stamp
            r = Math.min(255, Math.round(r * 1.25));
            g = Math.max(0, Math.round(g * 0.8));
            b = Math.max(0, Math.round(b * 0.8));
          } else {
            // General dark ink
            const contrast = 1.35;
            r = Math.min(255, Math.max(0, Math.round((r - 128) * contrast + 115)));
            g = Math.min(255, Math.max(0, Math.round((g - 128) * contrast + 115)));
            b = Math.min(255, Math.max(0, Math.round((b - 128) * contrast + 125)));
          }
        } else {
          // Signature: deep blue/black pen
          const contrast = 1.45;
          r = Math.min(255, Math.max(0, Math.round((r - 128) * contrast + 110)));
          g = Math.min(255, Math.max(0, Math.round((g - 128) * contrast + 110)));
          b = Math.min(255, Math.max(0, Math.round((b - 128) * contrast + 125)));
          if (b > r && b > g) {
            b = Math.min(255, Math.round(b * 1.25));
          }
        }
      }

      // Track bounding box for auto-crop
      const px = (i / 4) % srcW;
      const py = Math.floor(i / 4 / srcW);
      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
    }

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = finalA;
  }

  ctx.putImageData(imgData, 0, 0);

  // If bounding box was not found (blank image), fallback to center
  if (minX > maxX || minY > maxY) {
    return canvas.toDataURL("image/png");
  }

  // Auto-Crop with padding and centering
  const boxW = maxX - minX + 1;
  const boxH = maxY - minY + 1;
  const paddingX = Math.round(boxW * 0.05);
  const paddingY = Math.round(boxH * 0.05);

  let cropX = Math.max(0, minX - paddingX);
  let cropY = Math.max(0, minY - paddingY);
  let cropW = Math.min(srcW - cropX, boxW + paddingX * 2);
  let cropH = Math.min(srcH - cropY, boxH + paddingY * 2);

  if (type === "stamp") {
    // Stamp must be square (1:1) to keep round shape symmetrical
    const maxSide = Math.max(cropW, cropH);
    const targetCanvas = document.createElement("canvas");
    const targetSize = Math.min(600, Math.max(350, maxSide));
    targetCanvas.width = targetSize;
    targetCanvas.height = targetSize;
    const targetCtx = targetCanvas.getContext("2d");
    if (targetCtx) {
      const offsetX = (targetSize - (cropW / maxSide) * targetSize) / 2;
      const offsetY = (targetSize - (cropH / maxSide) * targetSize) / 2;
      const drawW = (cropW / maxSide) * targetSize;
      const drawH = (cropH / maxSide) * targetSize;
      targetCtx.drawImage(canvas, cropX, cropY, cropW, cropH, offsetX, offsetY, drawW, drawH);
      return targetCanvas.toDataURL("image/png");
    }
  }

  // Signature crop
  const targetCanvas = document.createElement("canvas");
  targetCanvas.width = cropW;
  targetCanvas.height = cropH;
  const targetCtx = targetCanvas.getContext("2d");
  if (targetCtx) {
    targetCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    return targetCanvas.toDataURL("image/png");
  }

  return canvas.toDataURL("image/png");
}

/**
 * Generates an official, highly realistic round blue stamp on transparent canvas
 */
export function generateDefaultStampDataUrl(): string {
  if (typeof window === "undefined") return "";

  const size = 500;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const cx = size / 2;
  const cy = size / 2;
  const inkColor = "#1d4ed8"; // Deep stamp blue
  const fontFam = "sans-serif, Arial";

  ctx.strokeStyle = inkColor;
  ctx.fillStyle = inkColor;

  // Outer solid ring
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, 215, 0, Math.PI * 2);
  ctx.stroke();

  // Outer thin secondary ring
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, 206, 0, Math.PI * 2);
  ctx.stroke();

  // Inner ring
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 140, 0, Math.PI * 2);
  ctx.stroke();

  // Helper to draw text along an arc
  const drawArcText = (
    text: string,
    radius: number,
    startAngle: number,
    endAngle: number,
    isClockwise = true,
    fontSize = 17,
    isBold = true
  ) => {
    ctx.font = `${isBold ? "bold " : ""}${fontSize}px ${fontFam}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const totalAngle = Math.abs(endAngle - startAngle);
    const step = totalAngle / (text.length - 1);

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const angle = isClockwise ? startAngle + i * step : startAngle - i * step;
      ctx.save();
      ctx.translate(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
      ctx.rotate(angle + (isClockwise ? Math.PI / 2 : -Math.PI / 2));
      ctx.fillText(char, 0, 0);
      ctx.restore();
    }
  };

  // Top Arc Text
  const topText = "РОССИЙСКАЯ ФЕДЕРАЦИЯ • ЯНАО • Г. НОЯБРЬСК";
  drawArcText(topText, 175, -Math.PI * 0.85, -Math.PI * 0.15, true, 16, true);

  // Bottom Arc Text
  const bottomText = "ОГРНИП 309264819700017 • ДЛЯ ДОКУМЕНТОВ";
  drawArcText(bottomText, 175, Math.PI * 0.85, Math.PI * 0.15, false, 15, true);

  // Center Content
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.font = "bold 21px " + fontFam;
  ctx.fillText("СТО «ЧАЙКА-СЕРВИС»", cx, cy - 42);

  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - 100, cy - 25);
  ctx.lineTo(cx + 100, cy - 25);
  ctx.stroke();

  ctx.font = "bold 17px " + fontFam;
  ctx.fillText("ИП Водоватовский А.И.", cx, cy - 6);

  ctx.font = "bold 15px " + fontFam;
  ctx.fillText("ИНН 263112957774", cx, cy + 22);

  ctx.beginPath();
  ctx.moveTo(cx - 90, cy + 38);
  ctx.lineTo(cx + 90, cy + 38);
  ctx.stroke();

  ctx.font = "13px " + fontFam;
  ctx.fillText("г. Ноябрьск", cx, cy + 54);

  // Decorative stars at sides
  const drawStar = (x: number, y: number) => {
    ctx.font = "bold 18px " + fontFam;
    ctx.fillText("★", x, y);
  };
  drawStar(cx - 175, cy);
  drawStar(cx + 175, cy);

  return canvas.toDataURL("image/png");
}

/**
 * Generates an authentic handwritten cursive signature in blue ink on transparent canvas
 */
export function generateDefaultSignatureDataUrl(): string {
  if (typeof window === "undefined") return "";

  const w = 450;
  const h = 180;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const inkColor = "#1e40af"; // Authentic pen blue
  ctx.strokeStyle = inkColor;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Initial Capital Letter "В" with loops and flourishes
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(45, 120);
  ctx.bezierCurveTo(40, 60, 50, 40, 75, 45);
  ctx.bezierCurveTo(95, 50, 100, 75, 80, 85);
  ctx.bezierCurveTo(115, 95, 120, 130, 80, 135);
  ctx.bezierCurveTo(55, 138, 50, 115, 70, 110);
  ctx.stroke();

  // Dynamic strokes representing "од-ова-тов-ский"
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(85, 110);
  ctx.bezierCurveTo(105, 105, 115, 120, 130, 112);
  ctx.bezierCurveTo(145, 105, 155, 122, 175, 110);
  ctx.bezierCurveTo(185, 102, 195, 115, 210, 108);
  ctx.bezierCurveTo(225, 100, 235, 125, 255, 105);
  ctx.bezierCurveTo(270, 90, 280, 120, 295, 108);
  ctx.bezierCurveTo(310, 95, 325, 118, 345, 102);
  ctx.stroke();

  // Ascender stroke representing "т" and loop "в"
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(215, 115);
  ctx.lineTo(220, 65);
  ctx.stroke();

  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(205, 80);
  ctx.lineTo(235, 78);
  ctx.stroke();

  // Long characteristic flourish tail underneath
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.moveTo(340, 105);
  ctx.bezierCurveTo(370, 85, 385, 110, 360, 125);
  ctx.bezierCurveTo(310, 155, 180, 150, 90, 142);
  ctx.bezierCurveTo(60, 140, 130, 158, 250, 150);
  ctx.bezierCurveTo(320, 145, 400, 142, 425, 135);
  ctx.stroke();

  return canvas.toDataURL("image/png");
}
