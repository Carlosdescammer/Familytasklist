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
  const salt = 'familylist-e2ee-auto-2024';
  return `${userId}-${salt}`;
};

export function useAutoE2EE(userId: string | null) {
  const encryption = useEncryption(userId);
  const [autoSetupComplete, setAutoSetupComplete] = useState(false);
  const [autoSetupInProgress, setAutoSetupInProgress] = useState(false);

  useEffect(() => {
    if (!userId || autoSetupComplete || autoSetupInProgress) {
      return;
    }

    const setupAutomatically = async () => {
      setAutoSetupInProgress(true);

      try {
        // Check if already set up
        if (encryption.isSetup) {
          // Auto-unlock if not already unlocked
          if (!encryption.isUnlocked) {
            const autoPassphrase = generateAutoPassphrase(userId);
            await encryption.unlockEncryption(autoPassphrase);
            console.log('[Auto E2EE] Automatically unlocked encryption');
          }
          setAutoSetupComplete(true);
          return;
        }

        // Auto-setup encryption with generated passphrase
        const autoPassphrase = generateAutoPassphrase(userId);
        await encryption.setupEncryption(autoPassphrase);
        console.log('[Auto E2EE] Automatically set up encryption');

        setAutoSetupComplete(true);
      } catch (error) {
        console.error('[Auto E2EE] Failed to auto-setup:', error);
        // Don't retry to avoid infinite loops
        setAutoSetupComplete(true);
      } finally {
        setAutoSetupInProgress(false);
      }
    };

    // Small delay to avoid running during initial render
    const timer = setTimeout(() => {
      setupAutomatically();
    }, 1000);

    return () => clearTimeout(timer);
  }, [userId, encryption, autoSetupComplete, autoSetupInProgress]);

  return {
    isReady: autoSetupComplete,
    isSetup: encryption.isSetup,
    isUnlocked: encryption.isUnlocked,
  };
}
