/**
 * Key Generation and Management
 *
 * Functions for generating, storing, and managing cryptographic keys
 */

import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
  stringToArrayBuffer,
  arrayBufferToString,
  generateSalt,
} from './utils';

/**
 * Key pair type
 */
export interface KeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

/**
 * Exported key pair (serialized for storage)
 */
export interface ExportedKeyPair {
  publicKey: string; // Base64-encoded
  privateKey: string; // Base64-encoded
}

/**
 * Generate RSA key pair for asymmetric encryption
 */
export async function generateKeyPair(): Promise<KeyPair> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 4096, // Strong key size
      publicExponent: new Uint8Array([1, 0, 1]), // 65537
      hash: 'SHA-256',
    },
    true, // extractable
    ['encrypt', 'decrypt']
  );

  return {
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
  };
}

/**
 * Export public key to Base64 string
 */
export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('spki', publicKey);
  return arrayBufferToBase64(exported);
}

/**
 * Import public key from Base64 string
 */
export async function importPublicKey(publicKeyString: string): Promise<CryptoKey> {
  const keyBuffer = base64ToArrayBuffer(publicKeyString);
  return await crypto.subtle.importKey(
    'spki',
    keyBuffer,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    true,
    ['encrypt']
  );
}

/**
 * Export private key to Base64 string
 */
export async function exportPrivateKey(privateKey: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('pkcs8', privateKey);
  return arrayBufferToBase64(exported);
}

/**
 * Import private key from Base64 string
 */
export async function importPrivateKey(privateKeyString: string): Promise<CryptoKey> {
  const keyBuffer = base64ToArrayBuffer(privateKeyString);
  return await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    true,
    ['decrypt']
  );
}

/**
 * Derive encryption key from passphrase using PBKDF2
 */
export async function deriveKeyFromPassphrase(
  passphrase: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  // Import passphrase as key material
  const passphraseKey = await crypto.subtle.importKey(
    'raw',
    stringToArrayBuffer(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // Derive AES key from passphrase
  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: 100000, // High iteration count for security
      hash: 'SHA-256',
    },
    passphraseKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false, // not extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt private key with passphrase
 */
export async function encryptPrivateKey(
  privateKey: CryptoKey,
  passphrase: string
): Promise<string> {
  // Generate random salt
  const salt = generateSalt();

  // Derive encryption key from passphrase
  const encryptionKey = await deriveKeyFromPassphrase(passphrase, salt);

  // Export private key
  const privateKeyBuffer = await crypto.subtle.exportKey('pkcs8', privateKey);

  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Encrypt private key
  const encryptedPrivateKey = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    encryptionKey,
    privateKeyBuffer
  );

  // Combine salt + IV + encrypted data
  const combined = new Uint8Array(
    salt.length + iv.length + encryptedPrivateKey.byteLength
  );
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encryptedPrivateKey), salt.length + iv.length);

  return arrayBufferToBase64(combined.buffer);
}

/**
 * Decrypt private key with passphrase
 */
export async function decryptPrivateKey(
  encryptedPrivateKeyString: string,
  passphrase: string
): Promise<CryptoKey> {
  // Decode encrypted data
  const combined = new Uint8Array(base64ToArrayBuffer(encryptedPrivateKeyString));

  // Extract salt, IV, and encrypted data
  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const encryptedData = combined.slice(28);

  // Derive decryption key from passphrase
  const decryptionKey = await deriveKeyFromPassphrase(passphrase, salt);

  try {
    // Decrypt private key
    const decryptedPrivateKey = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      decryptionKey,
      encryptedData
    );

    // Import decrypted private key
    return await crypto.subtle.importKey(
      'pkcs8',
      decryptedPrivateKey,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256',
      },
      true,
      ['decrypt']
    );
  } catch (error) {
    throw new Error('Invalid passphrase or corrupted key');
  }
}

/**
 * Generate AES key for symmetric encryption
 */
export async function generateAESKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true, // extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * Export AES key to Base64 string
 */
export async function exportAESKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('raw', key);
  return arrayBufferToBase64(exported);
}

/**
 * Import AES key from Base64 string
 */
export async function importAESKey(keyString: string): Promise<CryptoKey> {
  const keyBuffer = base64ToArrayBuffer(keyString);
  return await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Verify passphrase by attempting to decrypt a test value
 */
export async function verifyPassphrase(
  encryptedPrivateKey: string,
  passphrase: string
): Promise<boolean> {
  try {
    await decryptPrivateKey(encryptedPrivateKey, passphrase);
    return true;
  } catch {
    return false;
  }
}
