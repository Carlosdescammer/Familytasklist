/**
 * Crypto Utilities
 *
 * Helper functions for cryptographic operations using Web Crypto API
 */

/**
 * Convert ArrayBuffer to Base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Base64 string to ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Convert string to ArrayBuffer
 */
export function stringToArrayBuffer(str: string): ArrayBuffer {
  const encoder = new TextEncoder();
  return encoder.encode(str).buffer;
}

/**
 * Convert ArrayBuffer to string
 */
export function arrayBufferToString(buffer: ArrayBuffer): string {
  const decoder = new TextDecoder();
  return decoder.decode(buffer);
}

/**
 * Generate random bytes
 */
export function generateRandomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Generate random IV for AES-GCM
 */
export function generateIV(): Uint8Array {
  return generateRandomBytes(12); // 12 bytes for AES-GCM
}

/**
 * Generate random salt for PBKDF2
 */
export function generateSalt(): Uint8Array {
  return generateRandomBytes(16); // 16 bytes salt
}

/**
 * Hash data using SHA-256
 */
export async function sha256(data: string): Promise<string> {
  const buffer = stringToArrayBuffer(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return arrayBufferToBase64(hashBuffer);
}

/**
 * Generate a random UUID v4
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Validate passphrase strength
 */
export function validatePassphrase(passphrase: string): {
  valid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
} {
  const errors: string[] = [];

  if (passphrase.length < 12) {
    errors.push('Passphrase must be at least 12 characters long');
  }

  if (!/[a-z]/.test(passphrase)) {
    errors.push('Passphrase must contain lowercase letters');
  }

  if (!/[A-Z]/.test(passphrase)) {
    errors.push('Passphrase must contain uppercase letters');
  }

  if (!/[0-9]/.test(passphrase)) {
    errors.push('Passphrase must contain numbers');
  }

  if (!/[^a-zA-Z0-9]/.test(passphrase)) {
    errors.push('Passphrase must contain special characters');
  }

  // Calculate strength
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  if (errors.length === 0) {
    if (passphrase.length >= 20) {
      strength = 'strong';
    } else if (passphrase.length >= 16) {
      strength = 'medium';
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    strength,
  };
}

/**
 * Zeroize sensitive data in memory
 */
export function zeroize(buffer: ArrayBuffer | Uint8Array): void {
  const view = new Uint8Array(buffer instanceof ArrayBuffer ? buffer : buffer.buffer);
  for (let i = 0; i < view.length; i++) {
    view[i] = 0;
  }
}
