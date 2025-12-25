import { Injectable } from '@nestjs/common';

/**
 * Service for generating fractional index keys (lexicographically sortable strings)
 * Used for ordering items in lists/kanban boards without reordering all items
 *
 * Implementation based on fractional indexing algorithm:
 * - Keys are strings that sort lexicographically
 * - Format: base-36 encoded strings (e.g., "a", "b", "hzzzzz")
 * - Can insert between any two keys by generating a key between them
 * - Uses base-36 (0-9, a-z) for efficient key generation
 */
@Injectable()
export class PositionKeyService {
  private readonly BASE_36_DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz';
  private readonly MIN_KEY = 'a';
  private readonly MID_KEY = 'm';
  private readonly MAX_KEY = 'z';

  /**
   * Generate a position key between two keys
   * @param before - The key before the desired position (null/undefined for beginning)
   * @param after - The key after the desired position (null/undefined for end)
   * @returns A new position key between before and after
   */
  generateBetween(
    before?: string | null,
    after?: string | null,
  ): string {
    // Handle edge cases
    if (!before && !after) {
      // No constraints - return middle key
      return this.MID_KEY;
    }

    if (!before && after) {
      // Insert at the beginning
      return this.generateBefore(after);
    }

    if (before && !after) {
      // Insert at the end
      return this.generateAfter(before);
    }

    if (before && after) {
      // Insert between two keys
      return this.generateBetweenKeys(before, after);
    }

    // Fallback (should not reach here)
    return this.MID_KEY;
  }

  /**
   * Generate a key that comes before the given key
   */
  private generateBefore(key: string): string {
    // Try to generate a key before by decrementing
    // If key is 'a' or smaller, prepend '0'
    if (this.lexicographicCompare(key, this.MIN_KEY) <= 0) {
      return '0' + key;
    }

    // Try to decrement the last character
    const lastChar = key[key.length - 1];
    const lastCharIndex = this.BASE_36_DIGITS.indexOf(lastChar);

    if (lastCharIndex > 0) {
      // Can decrement last character
      const newLastChar = this.BASE_36_DIGITS[lastCharIndex - 1];
      return key.slice(0, -1) + newLastChar;
    }

    // Need to find a character to decrement
    for (let i = key.length - 2; i >= 0; i--) {
      const charIndex = this.BASE_36_DIGITS.indexOf(key[i]);
      if (charIndex > 0) {
        const newChar = this.BASE_36_DIGITS[charIndex - 1];
        // Fill remaining with 'z' to maximize the key while keeping it less than original
        const fill = 'z'.repeat(key.length - i - 1);
        return key.slice(0, i) + newChar + fill;
      }
    }

    // All characters are at minimum, prepend '0'
    return '0' + key;
  }

  /**
   * Generate a key that comes after the given key
   */
  private generateAfter(key: string): string {
    // Try to increment the last character
    const lastChar = key[key.length - 1];
    const lastCharIndex = this.BASE_36_DIGITS.indexOf(lastChar);

    if (lastCharIndex < this.BASE_36_DIGITS.length - 1) {
      // Can increment last character
      const newLastChar = this.BASE_36_DIGITS[lastCharIndex + 1];
      return key.slice(0, -1) + newLastChar;
    }

    // Need to find a character to increment
    for (let i = key.length - 2; i >= 0; i--) {
      const charIndex = this.BASE_36_DIGITS.indexOf(key[i]);
      if (charIndex < this.BASE_36_DIGITS.length - 1) {
        const newChar = this.BASE_36_DIGITS[charIndex + 1];
        // Fill remaining with '0' to minimize the key while keeping it greater than original
        const fill = '0'.repeat(key.length - i - 1);
        return key.slice(0, i) + newChar + fill;
      }
    }

    // All characters are at maximum, append '0' to extend
    return key + '0';
  }

  /**
   * Generate a key between two existing keys
   * Uses fractional indexing: finds midpoint between keys
   */
  private generateBetweenKeys(before: string, after: string): string {
    // Ensure before < after
    const comparison = this.lexicographicCompare(before, after);
    if (comparison >= 0) {
      // Keys are in wrong order or equal, generate longer key after before
      return this.generateAfter(before + this.MIN_KEY);
    }

    // Use fractional indexing: convert to numbers, find midpoint, convert back
    const beforeNum = this.keyToNumber(before);
    const afterNum = this.keyToNumber(after);
    const midNum = (beforeNum + afterNum) / 2;
    const midKey = this.numberToKey(midNum);

    // Verify the generated key is actually between before and after
    if (
      this.lexicographicCompare(midKey, before) <= 0 ||
      this.lexicographicCompare(midKey, after) >= 0
    ) {
      // Keys are too close, generate longer key
      return this.generateAfter(before + this.MIN_KEY);
    }

    return midKey;
  }

  /**
   * Convert a position key to a number for calculation
   * Treats key as base-36 number (right-aligned, like binary)
   */
  private keyToNumber(key: string): number {
    let num = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key[i];
      const digitValue = this.BASE_36_DIGITS.indexOf(char);
      if (digitValue === -1) {
        // Invalid character, treat as 0
        continue;
      }
      num = num * 36 + digitValue;
    }
    return num;
  }

  /**
   * Convert a number to a position key
   * Uses base-36 encoding
   */
  private numberToKey(num: number): string {
    if (num <= 0) {
      return this.MIN_KEY;
    }

    let key = '';
    let remaining = Math.floor(num);

    while (remaining > 0) {
      const digit = remaining % 36;
      key = this.BASE_36_DIGITS[digit] + key;
      remaining = Math.floor(remaining / 36);
    }

    return key || this.MIN_KEY;
  }

  /**
   * Compare two keys lexicographically
   * Returns negative if a < b, positive if a > b, 0 if equal
   */
  private lexicographicCompare(a: string, b: string): number {
    // Simple string comparison works for lexicographic order
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  }
}

