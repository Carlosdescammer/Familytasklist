// Screen Wake Lock API utilities
// Prevents the screen from dimming or locking during important tasks

export type WakeLockType = 'screen';

// Check if Wake Lock API is supported
export function isWakeLockSupported(): boolean {
  return 'wakeLock' in navigator;
}

// Wake Lock manager class
export class WakeLockManager {
  private wakeLock: any = null;
  private isActive: boolean = false;

  // Request a wake lock
  async request(type: WakeLockType = 'screen'): Promise<boolean> {
    if (!isWakeLockSupported()) {
      console.warn('Wake Lock API is not supported in this browser');
      return false;
    }

    try {
      // Release existing wake lock if any
      if (this.wakeLock) {
        await this.release();
      }

      this.wakeLock = await (navigator as any).wakeLock.request(type);
      this.isActive = true;

      console.log('Wake lock acquired');

      // Add event listener for wake lock release
      this.wakeLock.addEventListener('release', () => {
        console.log('Wake lock released');
        this.isActive = false;
      });

      return true;
    } catch (error) {
      console.error('Failed to request wake lock:', error);
      this.isActive = false;
      return false;
    }
  }

  // Release the wake lock
  async release(): Promise<boolean> {
    if (!this.wakeLock) {
      return false;
    }

    try {
      await this.wakeLock.release();
      this.wakeLock = null;
      this.isActive = false;
      console.log('Wake lock manually released');
      return true;
    } catch (error) {
      console.error('Failed to release wake lock:', error);
      return false;
    }
  }

  // Check if wake lock is currently active
  isLocked(): boolean {
    return this.isActive && this.wakeLock !== null;
  }

  // Re-acquire wake lock when page becomes visible
  handleVisibilityChange = async () => {
    if (this.wakeLock !== null && document.visibilityState === 'visible') {
      await this.request();
    }
  };

  // Setup automatic re-acquisition on visibility change
  setupAutoReacquire(): void {
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  // Remove automatic re-acquisition
  removeAutoReacquire(): void {
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }
}

// Global wake lock manager instance
export const wakeLockManager = new WakeLockManager();

// Helper functions for common wake lock operations
export async function requestWakeLock(): Promise<boolean> {
  return wakeLockManager.request();
}

export async function releaseWakeLock(): Promise<boolean> {
  return wakeLockManager.release();
}

export function isWakeLockActive(): boolean {
  return wakeLockManager.isLocked();
}

// Setup automatic wake lock for specific scenarios
export async function requestWakeLockForTimer(): Promise<boolean> {
  const acquired = await wakeLockManager.request();
  if (acquired) {
    wakeLockManager.setupAutoReacquire();
  }
  return acquired;
}

export async function requestWakeLockForVideo(): Promise<boolean> {
  const acquired = await wakeLockManager.request();
  if (acquired) {
    wakeLockManager.setupAutoReacquire();
  }
  return acquired;
}

export async function requestWakeLockForTask(): Promise<boolean> {
  const acquired = await wakeLockManager.request();
  if (acquired) {
    wakeLockManager.setupAutoReacquire();
  }
  return acquired;
}

export async function releaseWakeLockAndCleanup(): Promise<boolean> {
  wakeLockManager.removeAutoReacquire();
  return wakeLockManager.release();
}
