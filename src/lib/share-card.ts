/**
 * Generates a 1200×630 share card PNG using an offscreen <canvas>.
 * NO puzzle spoilers — only shows score, time, diffs-found count, and streak.
 */

export type ShareCardData = {
  /** Puzzle date string YYYY-MM-DD */
  date: string;
  totalScore: number;
  totalTimeSeconds: number;
  /** e.g. [5,4,5,3,5] – diffs found per round (not the images!) */
  diffsPerRound: number[];
  streakCount: number;
};

function zeroPad(n: number) {
  return String(n).padStart(2, '0');
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m > 0 ? `${m}m ${zeroPad(s)}s` : `${s}s`;
}

/** Returns a data-URL (PNG) for the share card, or null if canvas is unavailable */
export async function generateShareCard(data: ShareCardData): Promise<string | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;

  const W = 1200;
  const H = 630;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#0f172a'); // slate-900
  grad.addColorStop(1, '#1e293b'); // slate-800
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Accent stripe at top
  ctx.fillStyle = '#10b981'; // emerald-500
  ctx.fillRect(0, 0, W, 6);

  // Logo / title
  ctx.fillStyle = '#f1f5f9'; // slate-100
  ctx.font = 'bold 64px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('DailyDiffs', 80, 110);

  // Date label
  ctx.fillStyle = '#64748b'; // slate-500
  ctx.font = '32px system-ui, -apple-system, sans-serif';
  ctx.fillText(data.date, 80, 158);

  // Score (large)
  ctx.fillStyle = '#10b981'; // emerald-500
  ctx.font = 'bold 120px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(data.totalScore.toLocaleString(), W - 80, 160);

  ctx.fillStyle = '#64748b';
  ctx.font = '28px system-ui, -apple-system, sans-serif';
  ctx.fillText('points', W - 80, 200);

  // Divider line
  ctx.strokeStyle = '#334155'; // slate-700
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(80, 240);
  ctx.lineTo(W - 80, 240);
  ctx.stroke();

  // Stats row — time + streak
  ctx.textAlign = 'left';
  ctx.fillStyle = '#94a3b8'; // slate-400
  ctx.font = '30px system-ui, -apple-system, sans-serif';
  ctx.fillText(`⏱  ${formatTime(data.totalTimeSeconds)}`, 80, 310);

  if (data.streakCount > 0) {
    ctx.fillText(`🔥  ${data.streakCount} day streak`, 80 + 320, 310);
  }

  // Per-round diffs row
  const roundEmoji = (found: number, total = 5) => {
    const filled = '●'.repeat(found);
    const empty = '○'.repeat(Math.max(0, total - found));
    return filled + empty;
  };

  ctx.font = '28px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('Rounds:', 80, 390);

  const roundX = 80;
  const roundY = 440;
  const roundW = (W - 160) / 5;
  data.diffsPerRound.forEach((found, i) => {
    const x = roundX + i * roundW;
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(x, roundY - 50, roundW - 16, 90, 12);
    ctx.fill();

    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`R${i + 1}`, x + (roundW - 16) / 2, roundY - 15);

    ctx.fillStyle = found > 0 ? '#34d399' : '#475569';
    ctx.font = '22px monospace';
    ctx.fillText(roundEmoji(found), x + (roundW - 16) / 2, roundY + 22);
  });

  // Footer CTA
  ctx.textAlign = 'center';
  ctx.fillStyle = '#475569';
  ctx.font = '24px system-ui, -apple-system, sans-serif';
  ctx.fillText('Play today at dailydiffs.app', W / 2, H - 50);

  return canvas.toDataURL('image/png');
}

/** Builds a share text string (no spoilers) */
export function buildShareText(data: ShareCardData): string {
  const emojiRows = data.diffsPerRound
    .map((found, i) => {
      const full = 5;
      return `R${i + 1}: ${'🟢'.repeat(found)}${'⚫'.repeat(Math.max(0, full - found))}`;
    })
    .join('  ');

  const streakLine = data.streakCount > 0 ? `\n🔥 ${data.streakCount} day streak` : '';
  return `DailyDiffs ${data.date}\n${data.totalScore.toLocaleString()} pts · ${formatTime(data.totalTimeSeconds)}\n${emojiRows}${streakLine}\nhttps://dailydiffs.app`;
}
