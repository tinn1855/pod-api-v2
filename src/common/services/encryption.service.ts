import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

interface EncryptedPayload {
  iv: string;
  tag: string;
  ct: string;
}

@Injectable()
export class EncryptionService implements OnModuleInit {
  private algorithm = 'aes-256-gcm';
  private keyLength = 32; // 32 bytes for AES-256
  private ivLength = 16; // 16 bytes for GCM
  private tagLength = 16; // 16 bytes for GCM tag
  private key: Buffer;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY');
    if (!encryptionKey) {
      throw new Error(
        'ENCRYPTION_KEY environment variable is required. Provide either a 32-byte base64 string or a 64-character hex string.',
      );
    }

    // Try to parse as base64 first
    let keyBuffer: Buffer;
    try {
      keyBuffer = Buffer.from(encryptionKey, 'base64');
      if (keyBuffer.length !== this.keyLength) {
        throw new Error('Invalid base64 key length');
      }
    } catch {
      // If base64 fails, try hex
      try {
        if (encryptionKey.length !== 64) {
          throw new Error('Invalid hex key length');
        }
        keyBuffer = Buffer.from(encryptionKey, 'hex');
        if (keyBuffer.length !== this.keyLength) {
          throw new Error('Invalid hex key length');
        }
      } catch (error) {
        throw new Error(
          `ENCRYPTION_KEY must be either a 32-byte base64 string (44 chars) or a 64-character hex string. Error: ${error.message}`,
        );
      }
    }

    this.key = keyBuffer;
  }

  /**
   * Encrypt a plaintext string using AES-256-GCM
   * Returns a JSON string containing iv, tag, and ciphertext (all base64)
   */
  encryptString(plaintext: string): string {
    if (!plaintext || plaintext.length === 0) {
      throw new Error('Cannot encrypt empty string');
    }

    // Generate random IV
    const iv = crypto.randomBytes(this.ivLength);

    // Create cipher
    const cipher = crypto.createCipheriv(
      this.algorithm,
      this.key,
      iv,
    ) as crypto.CipherGCM;

    // Encrypt
    let encrypted = cipher.update(plaintext, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    // Get authentication tag
    const tag = cipher.getAuthTag();

    // Create payload
    const payload: EncryptedPayload = {
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      ct: encrypted.toString('base64'),
    };

    return JSON.stringify(payload);
  }

  /**
   * Decrypt an encrypted payload string
   * Expects JSON string with {iv, tag, ct} (all base64)
   */
  decryptString(encryptedPayload: string): string {
    if (!encryptedPayload || encryptedPayload.length === 0) {
      throw new Error('Cannot decrypt empty payload');
    }

    let payload: EncryptedPayload;
    try {
      payload = JSON.parse(encryptedPayload);
    } catch (error) {
      throw new Error(`Invalid encrypted payload format: ${error.message}`);
    }

    if (!payload.iv || !payload.tag || !payload.ct) {
      throw new Error(
        'Invalid encrypted payload: missing required fields (iv, tag, ct)',
      );
    }

    try {
      const iv = Buffer.from(payload.iv, 'base64');
      const tag = Buffer.from(payload.tag, 'base64');
      const encrypted = Buffer.from(payload.ct, 'base64');

      // Create decipher
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.key,
        iv,
      ) as crypto.DecipherGCM;
      decipher.setAuthTag(tag);

      // Decrypt
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted.toString('utf8');
    } catch (error) {
      // Never log the actual error or payload to prevent secret leakage
      throw new Error('Decryption failed: invalid or corrupted payload');
    }
  }
}

