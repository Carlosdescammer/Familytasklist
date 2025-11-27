/**
 * Encryption and Decryption Functions
 *
 * High-level functions for encrypting and decrypting data
 */

import {
  generateAESKey,
  exportAESKey,
  importAESKey,
  importPublicKey,
} from './keys';
import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
  stringToArrayBuffer,
  arrayBufferToString,
  generateIV,
} from './utils';

/**
 * Encrypted payload structure
 */
export interface EncryptedPayload {
  version: number;
  algorithm: string;
  encryptedData: string; // Base64
  encryptedKey: string; // Base64
  iv: string; // Base64
}

/**
 * Multi-recipient encrypted payload
 */
export interface MultiRecipientEncryptedPayload {
  version: number;
  algorithm: string;
  encryptedData: string; // Base64
  encryptedKeys: Record<string, string>; // userId -> Base64 encrypted AES key
  iv: string; // Base64
}

/**
 * Encrypt data for a single recipient
 *
 * @param data - Plain text data to encrypt
 * @param recipientPublicKeyString - Recipient's public key (Base64)
 * @returns Encrypted payload
 */
export async function encrypt(
  data: string,
  recipientPublicKeyString: string
): Promise<EncryptedPayload> {
  // Generate random AES key for this message
  const aesKey = await generateAESKey();

  // Generate random IV
  const iv = generateIV();

  // Encrypt data with AES key
  const dataBuffer = stringToArrayBuffer(data);
  const encryptedData = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    aesKey,
    dataBuffer
  );

  // Export AES key
  const aesKeyExported = await exportAESKey(aesKey);

  // Encrypt AES key with recipient's public RSA key
  const recipientPublicKey = await importPublicKey(recipientPublicKeyString);
  const aesKeyBuffer = base64ToArrayBuffer(aesKeyExported);
  const encryptedAESKey = await crypto.subtle.encrypt(
    {
      name: 'RSA-OAEP',
    },
    recipientPublicKey,
    aesKeyBuffer
  );

  return {
    version: 1,
    algorithm: 'RSA-OAEP + AES-256-GCM',
    encryptedData: arrayBufferToBase64(encryptedData),
    encryptedKey: arrayBufferToBase64(encryptedAESKey),
    iv: arrayBufferToBase64(iv),
  };
}

/**
 * Decrypt data with private key
 *
 * @param payload - Encrypted payload
 * @param privateKey - User's private key
 * @returns Decrypted plain text
 */
export async function decrypt(
  payload: EncryptedPayload,
  privateKey: CryptoKey
): Promise<string> {
  try {
    // Decrypt AES key with private RSA key
    const encryptedAESKeyBuffer = base64ToArrayBuffer(payload.encryptedKey);
    const decryptedAESKeyBuffer = await crypto.subtle.decrypt(
      {
        name: 'RSA-OAEP',
      },
      privateKey,
      encryptedAESKeyBuffer
    );

    // Import AES key
    const aesKeyString = arrayBufferToBase64(decryptedAESKeyBuffer);
    const aesKey = await importAESKey(aesKeyString);

    // Decrypt data with AES key
    const encryptedDataBuffer = base64ToArrayBuffer(payload.encryptedData);
    const iv = base64ToArrayBuffer(payload.iv);
    const decryptedDataBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      aesKey,
      encryptedDataBuffer
    );

    return arrayBufferToString(decryptedDataBuffer);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data. Invalid key or corrupted data.');
  }
}

/**
 * Encrypt data for multiple recipients
 *
 * @param data - Plain text data to encrypt
 * @param recipientPublicKeys - Map of userId -> public key (Base64)
 * @returns Multi-recipient encrypted payload
 */
export async function encryptForMultipleRecipients(
  data: string,
  recipientPublicKeys: Record<string, string>
): Promise<MultiRecipientEncryptedPayload> {
  // Generate random AES key for this message
  const aesKey = await generateAESKey();

  // Generate random IV
  const iv = generateIV();

  // Encrypt data with AES key
  const dataBuffer = stringToArrayBuffer(data);
  const encryptedData = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    aesKey,
    dataBuffer
  );

  // Export AES key
  const aesKeyExported = await exportAESKey(aesKey);
  const aesKeyBuffer = base64ToArrayBuffer(aesKeyExported);

  // Encrypt AES key for each recipient
  const encryptedKeys: Record<string, string> = {};
  for (const [userId, publicKeyString] of Object.entries(recipientPublicKeys)) {
    const recipientPublicKey = await importPublicKey(publicKeyString);
    const encryptedAESKey = await crypto.subtle.encrypt(
      {
        name: 'RSA-OAEP',
      },
      recipientPublicKey,
      aesKeyBuffer
    );
    encryptedKeys[userId] = arrayBufferToBase64(encryptedAESKey);
  }

  return {
    version: 1,
    algorithm: 'RSA-OAEP + AES-256-GCM',
    encryptedData: arrayBufferToBase64(encryptedData),
    encryptedKeys,
    iv: arrayBufferToBase64(iv),
  };
}

/**
 * Decrypt data from multi-recipient payload
 *
 * @param payload - Multi-recipient encrypted payload
 * @param userId - Current user's ID
 * @param privateKey - User's private key
 * @returns Decrypted plain text
 */
export async function decryptFromMultipleRecipients(
  payload: MultiRecipientEncryptedPayload,
  userId: string,
  privateKey: CryptoKey
): Promise<string> {
  try {
    // Get encrypted AES key for this user
    const encryptedAESKeyString = payload.encryptedKeys[userId];
    if (!encryptedAESKeyString) {
      throw new Error('No encrypted key found for this user');
    }

    // Decrypt AES key with private RSA key
    const encryptedAESKeyBuffer = base64ToArrayBuffer(encryptedAESKeyString);
    const decryptedAESKeyBuffer = await crypto.subtle.decrypt(
      {
        name: 'RSA-OAEP',
      },
      privateKey,
      encryptedAESKeyBuffer
    );

    // Import AES key
    const aesKeyString = arrayBufferToBase64(decryptedAESKeyBuffer);
    const aesKey = await importAESKey(aesKeyString);

    // Decrypt data with AES key
    const encryptedDataBuffer = base64ToArrayBuffer(payload.encryptedData);
    const iv = base64ToArrayBuffer(payload.iv);
    const decryptedDataBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      aesKey,
      encryptedDataBuffer
    );

    return arrayBufferToString(decryptedDataBuffer);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data. Invalid key or corrupted data.');
  }
}

/**
 * Encrypt data with a password (simpler than public key encryption)
 * Useful for encrypting private notes that only the owner can see
 *
 * @param data - Plain text data
 * @param password - Password to encrypt with
 * @returns Encrypted data as Base64 string
 */
export async function encryptWithPassword(
  data: string,
  password: string
): Promise<string> {
  const aesKey = await generateAESKey();
  const iv = generateIV();

  // Encrypt data
  const dataBuffer = stringToArrayBuffer(data);
  const encryptedData = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    aesKey,
    dataBuffer
  );

  // Export and encrypt AES key with password
  const aesKeyExported = await exportAESKey(aesKey);
  const { encryptPrivateKey } = await import('./keys');
  const encryptedAESKey = await encryptPrivateKey(
    await importAESKey(base64ToArrayBuffer(aesKeyExported)),
    password
  );

  // Combine encrypted key + IV + encrypted data
  const payload = {
    encryptedKey: encryptedAESKey,
    iv: arrayBufferToBase64(iv),
    encryptedData: arrayBufferToBase64(encryptedData),
  };

  return btoa(JSON.stringify(payload));
}

/**
 * Decrypt data with a password
 *
 * @param encryptedString - Encrypted data as Base64 string
 * @param password - Password to decrypt with
 * @returns Decrypted plain text
 */
export async function decryptWithPassword(
  encryptedString: string,
  password: string
): Promise<string> {
  try {
    const payload = JSON.parse(atob(encryptedString));
    const { decryptPrivateKey } = await import('./keys');

    // Decrypt AES key with password
    const aesKey = await decryptPrivateKey(payload.encryptedKey, password);

    // Decrypt data
    const encryptedDataBuffer = base64ToArrayBuffer(payload.encryptedData);
    const iv = base64ToArrayBuffer(payload.iv);
    const decryptedDataBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      aesKey,
      encryptedDataBuffer
    );

    return arrayBufferToString(decryptedDataBuffer);
  } catch (error) {
    throw new Error('Failed to decrypt. Invalid password or corrupted data.');
  }
}
