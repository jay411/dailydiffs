import { generateSecret, generateSync, verifySync, generateURI } from 'otplib';
import { createHmac, timingSafeEqual } from 'crypto';

export const COOKIE_NAME = 'admin_2fa';
const COOKIE_MAX_AGE_SECONDS = 24 * 60 * 60; // 24 hours

/** Verify a 6-digit TOTP code against ADMIN_TOTP_SECRET. */
export function verifyTOTP(token: string): boolean {
  const secret = process.env.ADMIN_TOTP_SECRET;
  if (!secret) return false;
  try {
    const result = verifySync({ token, secret });
    return result.valid;
  } catch {
    return false;
  }
}

/** Generate the otpauth URI for QR code scanning. */
export function getTOTPUri(email: string): string {
  const secret = process.env.ADMIN_TOTP_SECRET;
  if (!secret) throw new Error('ADMIN_TOTP_SECRET is not set');
  return generateURI({ strategy: 'totp', secret, label: email, issuer: 'DailyDiffs Admin' });
}

/** Generate a fresh TOTP secret — run once, save to .env.local. */
export function newTOTPSecret(): string {
  return generateSecret();
}

/** Issue a signed 24-hour session token tied to the admin email. */
export function issueCookieToken(email: string): string {
  const secret = process.env.ADMIN_TOTP_SECRET!;
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = `${email}|${issuedAt}`;
  const sig = createHmac('sha256', secret).update(payload).digest('hex');
  return `${Buffer.from(payload).toString('base64url')}.${sig}`;
}

/** Verify a cookie token. Returns true if valid, unexpired, and matches email. */
export function verifyCookieToken(token: string, email: string): boolean {
  try {
    const secret = process.env.ADMIN_TOTP_SECRET;
    if (!secret) return false;

    const dot = token.lastIndexOf('.');
    if (dot === -1) return false;

    const payloadB64 = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const payload = Buffer.from(payloadB64, 'base64url').toString();

    // Timing-safe signature check
    const expectedSig = createHmac('sha256', secret).update(payload).digest('hex');
    const sigBuf = Buffer.from(sig, 'hex');
    const expectedBuf = Buffer.from(expectedSig, 'hex');
    if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return false;

    const [storedEmail, issuedAtStr] = payload.split('|');
    if (storedEmail !== email) return false;

    const age = Math.floor(Date.now() / 1000) - parseInt(issuedAtStr, 10);
    return age >= 0 && age < COOKIE_MAX_AGE_SECONDS;
  } catch {
    return false;
  }
}

// Re-export for use in setup page
export { generateSync as generateTOTPToken };
