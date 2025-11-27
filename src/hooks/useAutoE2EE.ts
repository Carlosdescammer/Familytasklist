/**
 * Auto E2EE Hook
 *
 * Automatically sets up and manages E2EE without user intervention
 * Encryption happens transparently in the background
 */

'use client';

import { useEffect, useState } from 'react';
import { useEncryption } from './useEncryption';

// Auto-generated passphrase from user's session
// In production, this would be derived from Clerk's session token
const generateAutoPassphrase = (userId: string): string => {
  // Use userId + a constant salt to generate consistent passphrase
  // This way the same user always gets the same passphrase
  // Salt includes uppercase, lowercase, numbers, and special characters to meet validation
  const salt = 'FamilyList-E2EE-Auto-2024!';
  return `${userId}-${salt}`;
};

export function useAutoE2EE(userId: string | null) {
  const encryption = useEncryption(userId);
  const [autoSetupComplete, setAutoSetupComplete] = useState(false);
  const [autoSetupInProgress, setAutoSetupInProgress] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || autoSetupComplete || autoSetupInProgress) {
      return;
    }

    const setupAutomatically = async () => {
      setAutoSetupInProgress(true);
      setSetupError(null);

      try {
        console.log('[Auto E2EE] Starting auto-setup for user:', userId);

        // Wait a bit for encryption hook to initialize
        await new Promise(resolve => setTimeout(resolve, 100));

        // Check if already set up
        if (encryption.isSetup) {
          console.log('[Auto E2EE] Encryption already set up, checking unlock status');
          // Auto-unlock if not already unlocked
          if (!encryption.isUnlocked) {
            console.log('[Auto E2EE] Unlocking encryption...');
            const autoPassphrase = generateAutoPassphrase(userId);
            await encryption.unlockEncryption(autoPassphrase);
            console.log('[Auto E2EE] Successfully unlocked encryption');
          } else {
            console.log('[Auto E2EE] Encryption already unlocked');
          }
          setAutoSetupComplete(true);
          return;
        }

        // Auto-setup encryption with generated passphrase
        console.log('[Auto E2EE] Setting up new encryption...');
        const autoPassphrase = generateAutoPassphrase(userId);
        await encryption.setupEncryption(autoPassphrase);
        console.log('[Auto E2EE] Successfully set up encryption');

        setAutoSetupComplete(true);
      } catch (error: any) {
        console.error('[Auto E2EE] Failed to auto-setup:', error);
        setSetupError(error?.message || 'Unknown error');
        // Mark as complete to avoid infinite retries
        setAutoSetupComplete(true);
      } finally {
        setAutoSetupInProgress(false);
      }
    };

    // Small delay to avoid running during initial render
    const timer = setTimeout(() => {
      setupAutomatically();
    }, 300);

    return () => clearTimeout(timer);
  }, [userId, encryption, autoSetupComplete, autoSetupInProgress]);

  return {
    isReady: autoSetupComplete,
    isSetup: encryption.isSetup,
    isUnlocked: encryption.isUnlocked,
    error: setupError,
  };
}
