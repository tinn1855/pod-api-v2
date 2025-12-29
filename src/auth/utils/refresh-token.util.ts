import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

/**
 * Generate opaque refresh token: selector.validator
 * - selector: random bytes (base64url) - stored in DB, used for lookup
 * - validator: random bytes (base64url) - hashed and stored, verified on use
 */
export function generateRefreshToken(): {
  token: string;
  selector: string;
  validator: string;
} {
  // Generate 32 bytes for selector and validator (each)
  const selector = crypto.randomBytes(32).toString('base64url');
  const validator = crypto.randomBytes(32).toString('base64url');
  const token = `${selector}.${validator}`;

  return { token, selector, validator };
}

/**
 * Parse refresh token into selector and validator
 */
export function parseRefreshToken(token: string): {
  selector: string;
  validator: string;
} | null {
  const parts = token.split('.');
  if (parts.length !== 2) {
    return null;
  }
  return {
    selector: parts[0],
    validator: parts[1],
  };
}

/**
 * Hash validator using bcrypt (consistent with password hashing)
 */
export async function hashValidator(validator: string): Promise<string> {
  return bcrypt.hash(validator, 10);
}

/**
 * Verify validator against hash
 */
export async function verifyValidator(
  validator: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(validator, hash);
}

