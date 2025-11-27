/**
 * Secure Key Storage
 *
 * Functions for securely storing encryption keys in IndexedDB
 */

const DB_NAME = 'FamilyListCrypto';
const DB_VERSION = 1;
const KEYS_STORE = 'keys';

/**
 * Stored key data
 */
export interface StoredKeyData {
  userId: string;
  publicKey: string;
  encryptedPrivateKey: string;
  keyVersion: number;
  createdAt: number;
}

/**
 * Initialize IndexedDB
 */
async function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object store for keys
      if (!db.objectStoreNames.contains(KEYS_STORE)) {
        const keyStore = db.createObjectStore(KEYS_STORE, { keyPath: 'userId' });
        keyStore.createIndex('userId', 'userId', { unique: true });
      }
    };
  });
}

/**
 * Store user's keys in IndexedDB
 */
export async function storeKeys(keyData: StoredKeyData): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([KEYS_STORE], 'readwrite');
    const store = transaction.objectStore(KEYS_STORE);
    const request = store.put(keyData);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Retrieve user's keys from IndexedDB
 */
export async function getKeys(userId: string): Promise<StoredKeyData | null> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([KEYS_STORE], 'readonly');
    const store = transaction.objectStore(KEYS_STORE);
    const request = store.get(userId);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete user's keys from IndexedDB
 */
export async function deleteKeys(userId: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([KEYS_STORE], 'readwrite');
    const store = transaction.objectStore(KEYS_STORE);
    const request = store.delete(userId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Check if keys exist for user
 */
export async function hasKeys(userId: string): Promise<boolean> {
  const keys = await getKeys(userId);
  return keys !== null;
}

/**
 * Clear all keys from IndexedDB
 */
export async function clearAllKeys(): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([KEYS_STORE], 'readwrite');
    const store = transaction.objectStore(KEYS_STORE);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Session storage for unlocked private key (in-memory only)
const sessionKeys = new Map<string, CryptoKey>();

/**
 * Store unlocked private key in session (memory only)
 */
export function setSessionKey(userId: string, privateKey: CryptoKey): void {
  sessionKeys.set(userId, privateKey);
}

/**
 * Get unlocked private key from session
 */
export function getSessionKey(userId: string): CryptoKey | null {
  return sessionKeys.get(userId) || null;
}

/**
 * Clear session key (lock encryption)
 */
export function clearSessionKey(userId: string): void {
  sessionKeys.delete(userId);
}

/**
 * Clear all session keys
 */
export function clearAllSessionKeys(): void {
  sessionKeys.clear();
}

/**
 * Check if encryption is unlocked (session key exists)
 */
export function isUnlocked(userId: string): boolean {
  return sessionKeys.has(userId);
}
