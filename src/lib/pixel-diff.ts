import { PNG } from 'pngjs';
import type { Difference } from '@/types/puzzle';

const CHANGE_THRESHOLD = 30;  // sum of |ΔR|+|ΔG|+|ΔB| to count as changed
const DILATE_RADIUS = 4;       // px to expand changed mask (handles anti-aliasing)
const MIN_COMPONENT_RATIO = 0.0005; // min component size as fraction of total pixels
const MERGE_DIST_PCT = 6;      // merge component centers within this % distance
const MIN_RADIUS_PCT = 3;
const MAX_RADIUS_PCT = 10;

interface Component {
  minX: number; maxX: number;
  minY: number; maxY: number;
  pixelCount: number;
}

function decodePng(buffer: Buffer): PNG {
  return PNG.sync.read(buffer);
}

function buildChangedMask(orig: PNG, mod: PNG): Uint8Array {
  const { width, height } = orig;
  const mask = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const dr = Math.abs(orig.data[idx]   - mod.data[idx]);
      const dg = Math.abs(orig.data[idx+1] - mod.data[idx+1]);
      const db = Math.abs(orig.data[idx+2] - mod.data[idx+2]);
      if (dr + dg + db > CHANGE_THRESHOLD) mask[y * width + x] = 1;
    }
  }
  return mask;
}

function dilateMask(mask: Uint8Array, width: number, height: number): Uint8Array {
  const out = new Uint8Array(mask);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!mask[y * width + x]) continue;
      for (let dy = -DILATE_RADIUS; dy <= DILATE_RADIUS; dy++) {
        for (let dx = -DILATE_RADIUS; dx <= DILATE_RADIUS; dx++) {
          const ny = y + dy, nx = x + dx;
          if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
            out[ny * width + nx] = 1;
          }
        }
      }
    }
  }
  return out;
}

function findComponents(mask: Uint8Array, width: number, height: number): Component[] {
  const visited = new Uint8Array(mask.length);
  const components: Component[] = [];

  for (let startY = 0; startY < height; startY++) {
    for (let startX = 0; startX < width; startX++) {
      if (!mask[startY * width + startX] || visited[startY * width + startX]) continue;

      // BFS
      const queue: number[] = [startY * width + startX];
      let head = 0;
      let minX = startX, maxX = startX, minY = startY, maxY = startY, pixelCount = 0;

      while (head < queue.length) {
        const pos = queue[head++];
        if (visited[pos]) continue;
        visited[pos] = 1;
        pixelCount++;
        const cy = Math.floor(pos / width);
        const cx = pos % width;
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        const neighbors = [
          pos - width, pos + width,
          cx > 0 ? pos - 1 : -1,
          cx < width - 1 ? pos + 1 : -1,
        ];
        for (const n of neighbors) {
          if (n >= 0 && n < mask.length && mask[n] && !visited[n]) {
            queue.push(n);
          }
        }
      }
      components.push({ minX, maxX, minY, maxY, pixelCount });
    }
  }
  return components;
}

function mergeNearbyComponents(components: Component[], width: number, height: number): Component[] {
  const merged = [...components];
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < merged.length; i++) {
      for (let j = i + 1; j < merged.length; j++) {
        const a = merged[i], b = merged[j];
        const cx1 = (a.minX + a.maxX) / 2 / width * 100;
        const cy1 = (a.minY + a.maxY) / 2 / height * 100;
        const cx2 = (b.minX + b.maxX) / 2 / width * 100;
        const cy2 = (b.minY + b.maxY) / 2 / height * 100;
        const dist = Math.sqrt((cx1 - cx2) ** 2 + (cy1 - cy2) ** 2);
        if (dist < MERGE_DIST_PCT) {
          merged[i] = {
            minX: Math.min(a.minX, b.minX),
            maxX: Math.max(a.maxX, b.maxX),
            minY: Math.min(a.minY, b.minY),
            maxY: Math.max(a.maxY, b.maxY),
            pixelCount: a.pixelCount + b.pixelCount,
          };
          merged.splice(j, 1);
          changed = true;
          break;
        }
      }
      if (changed) break;
    }
  }
  return merged;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

/** Deterministically extract difference coordinates by pixel comparison. */
export async function extractCoordinatesFromPixelDiff(
  originalBuffer: Buffer,
  modifiedBuffer: Buffer,
): Promise<Difference[]> {
  const orig = decodePng(originalBuffer);
  const mod  = decodePng(modifiedBuffer);
  const { width, height } = orig;
  const totalPixels = width * height;

  const rawMask   = buildChangedMask(orig, mod);
  const dilated   = dilateMask(rawMask, width, height);
  const allComps  = findComponents(dilated, width, height);

  // Filter noise
  const minPixels = totalPixels * MIN_COMPONENT_RATIO;
  const filtered  = allComps.filter(c => c.pixelCount >= minPixels);

  // Merge nearby
  const merged = mergeNearbyComponents(filtered, width, height);

  // Sort by size descending (most prominent first)
  merged.sort((a, b) => b.pixelCount - a.pixelCount);

  return merged.map(c => {
    const cx = (c.minX + c.maxX) / 2 / width  * 100;
    const cy = (c.minY + c.maxY) / 2 / height * 100;
    const halfW = (c.maxX - c.minX) / 2 / width  * 100;
    const halfH = (c.maxY - c.minY) / 2 / height * 100;
    const radius = clamp(Math.max(halfW, halfH), MIN_RADIUS_PCT, MAX_RADIUS_PCT);
    return { x: Math.round(cx * 10) / 10, y: Math.round(cy * 10) / 10, radius: Math.round(radius * 10) / 10 };
  });
}
