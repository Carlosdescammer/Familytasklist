/**
 * useEncryption Hook
 *
 * Main React hook for encryption functionality
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { generateKeyPair, exportPublicKey, exportPrivateKey, encryptPrivateKey, decryptPrivateKey } from '@/lib/crypto/keys';
import { encrypt, decrypt, encryptForMultipleRecipients, decryptFromMultipleRecipients } from '@/lib/crypto/encryption';
import type { EncryptedPayload, MultiRecipientEncryptedPayload } from '@/lib/crypto/encryption';
import { storeKeys, getKeys, hasKeys, setSessionKey, getSessionKey, clearSessionKey, isUnlocked } from '@/lib/crypto/storage';
import { validatePassphrase } from '@/lib/crypto/utils';

export interface UseEncryptionReturn {
  // Status
  isSetup: boolean;
  isUnlocked: boolean;
  loading: boolean;
  error: Error | null;

  // Setup functions
  setupEncryption: (passphrase: string) => Promise<void>;
  unlockEncryption: (passphrase: string) => Promise<void>;
  lockEncryption: () => void;

  // Encryption functions
  encryptMessage: (message: string, recipientPublicKey: string) => Promise<EncryptedPayload>;
  decryptMessage: (payload: EncryptedPayload) => Promise<string>;
  encryptForFamily: (message: string, familyPublicKeys: Record<string, string>) => Promise<MultiRecipientEncryptedPayload>;
  decryptFromFamily: (payload: MultiRecipientEncryptedPayload) => Promise<string>;

  // Key management
  getPublicKey: () => Promise<string | null>;
  changePassphrase: (oldPassphrase: string, newPassphrase: string) => Promise<void>;
  exportKeys: (passphrase: string) => Promise<string>;
  importKeys: (exportedData: string, passphrase: string) => Promise<void>;

  // Utilities
  validatePassphrase: (passphrase: string) => ReturnType<typeof validatePassphrase>;
}

export function useEncryption(userId: string | null): UseEncryptionReturn {
  const [isSetup, setIsSetup] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Check if encryption is already set up
  useEffect(() => {
    async function checkSetup() {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const keysExist = await hasKeys(userId);
        setIsSetup(keysExist);
        setUnlocked(isUnlocked(userId));
      } catch (err) {
        console.error('Error checking encryption setup:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    checkSetup();
  }, [userId]);

  // Setup encryption for first time
  const setupEncryption = useCallback(async (passphrase: string) => {
    if (!userId) {
      throw new Error('User ID is required');
    }

    setLoading(true);
    setError(null);

    try {
      // Validate passphrase
      const validation = validatePassphrase(passphrase);
      if (!validation.valid) {
        throw new Error(validation.errors.join(', '));
      }

      // Generate key pair
      const keyPair = await generateKeyPair();

      // Export keys
      const publicKey = await exportPublicKey(keyPair.publicKey);
      const privateKey = await exportPrivateKey(keyPair.privateKey);

      // Encrypt private key with passphrase
      const encryptedPrivateKey = await encryptPrivateKey(
        keyPair.privateKey,
        passphrase
      );

      // Store keys locally
      await storeKeys({
        userId,
        publicKey,
        encryptedPrivateKey,
        keyVersion: 1,
        createdAt: Date.now(),
      });

      // Store public key on server
      await fetch('/api/encryption/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          publicKey,
          encryptedPrivateKey,
        }),
      });

      // Store decrypted private key in session
      setSessionKey(userId, keyPair.privateKey);

      setIsSetup(true);
      setUnlocked(true);
    } catch (err) {
      console.error('Error setting up encryption:', err);
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Unlock encryption with passphrase
  const unlockEncryption = useCallback(async (passphrase: string) => {
    if (!userId) {
      throw new Error('User ID is required');
    }

    setLoading(true);
    setError(null);

    try {
      // Get stored keys
      const storedKeys = await getKeys(userId);
      if (!storedKeys) {
        throw new Error('Encryption not set up');
      }

      // Decrypt private key
      const privateKey = await decryptPrivateKey(
        storedKeys.encryptedPrivateKey,
        passphrase
      );

      // Store in session
      setSessionKey(userId, privateKey);
      setUnlocked(true);
    } catch (err) {
      console.error('Error unlocking encryption:', err);
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Lock encryption
  const lockEncryption = useCallback(() => {
    if (userId) {
      clearSessionKey(userId);
      setUnlocked(false);
    }
  }, [userId]);

  // Encrypt message for single recipient
  const encryptMessage = useCallback(async (
    message: string,
    recipientPublicKey: string
  ): Promise<EncryptedPayload> => {
    return await encrypt(message, recipientPublicKey);
  }, []);

  // Decrypt message
  const decryptMessage = useCallback(async (
    payload: EncryptedPayload
  ): Promise<string> => {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const privateKey = getSessionKey(userId);
    if (!privateKey) {
      throw new Error('Encryption is locked. Please unlock first.');
    }

    return await decrypt(payload, privateKey);
  }, [userId]);

  // Encrypt for multiple family members
  const encryptForFamily = useCallback(async (
    message: string,
    familyPublicKeys: Record<string, string>
  ): Promise<MultiRecipientEncryptedPayload> => {
    return await encryptForMultipleRecipients(message, familyPublicKeys);
  }, []);

  // Decrypt from family message
  const decryptFromFamily = useCallback(async (
    payload: MultiRecipientEncryptedPayload
  ): Promise<string> => {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const privateKey = getSessionKey(userId);
    if (!privateKey) {
      throw new Error('Encryption is locked. Please unlock first.');
    }

    return await decryptFromMultipleRecipients(payload, userId, privateKey);
  }, [userId]);

  // Get user's public key
  const getPublicKey = useCallback(async (): Promise<string | null> => {
    if (!userId) return null;

    const storedKeys = await getKeys(userId);
    return storedKeys?.publicKey || null;
  }, [userId]);

  // Change passphrase
  const changePassphrase = useCallback(async (
    oldPassphrase: string,
    newPassphrase: string
  ) => {
    if (!userId) {
      throw new Error('User ID is required');
    }

    setLoading(true);
    setError(null);

    try {
      // Validate new passphrase
      const validation = validatePassphrase(newPassphrase);
      if (!validation.valid) {
        throw new Error(validation.errors.join(', '));
      }

      // Get stored keys
      const storedKeys = await getKeys(userId);
      if (!storedKeys) {
        throw new Error('Encryption not set up');
      }

      // Decrypt private key with old passphrase
      const privateKey = await decryptPrivateKey(
        storedKeys.encryptedPrivateKey,
        oldPassphrase
      );

      // Re-encrypt with new passphrase
      const newEncryptedPrivateKey = await encryptPrivateKey(
        privateKey,
        newPassphrase
      );

      // Update stored keys
      await storeKeys({
        ...storedKeys,
        encryptedPrivateKey: newEncryptedPrivateKey,
      });

      // Update on server
      await fetch('/api/encryption/update-passphrase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          encryptedPrivateKey: newEncryptedPrivateKey,
        }),
      });

      // Keep session key
      setSessionKey(userId, privateKey);
    } catch (err) {
      console.error('Error changing passphrase:', err);
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Export keys for backup
  const exportKeys = useCallback(async (passphrase: string): Promise<string> => {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const storedKeys = await getKeys(userId);
    if (!storedKeys) {
      throw new Error('Encryption not set up');
    }

    // Verify passphrase
    await decryptPrivateKey(storedKeys.encryptedPrivateKey, passphrase);

    // Return encrypted backup
    return btoa(JSON.stringify(storedKeys));
  }, [userId]);

  // Import keys from backup
  const importKeys = useCallback(async (
    exportedData: string,
    passphrase: string
  ) => {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      const storedKeys = JSON.parse(atob(exportedData));

      // Verify passphrase
      await decryptPrivateKey(storedKeys.encryptedPrivateKey, passphrase);

      // Store keys
      await storeKeys(storedKeys);

      setIsSetup(true);
    } catch (err) {
      throw new Error('Invalid backup data or passphrase');
    }
  }, [userId]);

  return {
    isSetup,
    isUnlocked: unlocked,
    loading,
    error,
    setupEncryption,
    unlockEncryption,
    lockEncryption,
    encryptMessage,
    decryptMessage,
    encryptForFamily,
    decryptFromFamily,
    getPublicKey,
    changePassphrase,
    exportKeys,
    importKeys,
    validatePassphrase,
  };
}
