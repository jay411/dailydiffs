/**
 * Server and client-safe username validation (AUTH.md).
 * Returns { valid: true } or { valid: false, error: string }.
 */
export function validateUsername(username: string): { valid: boolean; error?: string } {
  if (username.length < 3) return { valid: false, error: 'Too short (min 3)' };
  if (username.length > 16) return { valid: false, error: 'Too long (max 16)' };

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { valid: false, error: 'Only letters, numbers, and underscores' };
  }

  if (!/^[a-zA-Z]/.test(username)) {
    return { valid: false, error: 'Must start with a letter' };
  }

  const sqlPatterns = /('|"|;|--|\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC|SCRIPT)\b)/i;
  if (sqlPatterns.test(username)) {
    return { valid: false, error: 'Invalid characters' };
  }

  const promptPatterns = /(ignore|pretend|system|prompt|instruction|override|bypass|jailbreak|you are|act as)/i;
  if (promptPatterns.test(username)) {
    return { valid: false, error: 'Username not allowed' };
  }

  const offensivePatterns = /(admin|moderator|dailydiffs|official|support|fuck|shit|ass|damn|bitch|nigger|faggot)/i;
  if (offensivePatterns.test(username)) {
    return { valid: false, error: 'Username not available' };
  }

  return { valid: true };
}
