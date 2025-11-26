// File System Access API utilities for backup/restore

export interface BackupData {
  version: string;
  timestamp: number;
  data: {
    tasks?: any[];
    shopping?: any[];
    calendar?: any[];
    recipes?: any[];
    budget?: any[];
    settings?: any;
  };
}

// Check if File System Access API is supported
export function isFileSystemAccessSupported(): boolean {
  return 'showSaveFilePicker' in window && 'showOpenFilePicker' in window;
}

// Export data as JSON file
export async function exportBackup(data: BackupData): Promise<boolean> {
  if (!isFileSystemAccessSupported()) {
    // Fallback to download
    return exportBackupFallback(data);
  }

  try {
    const options = {
      types: [
        {
          description: 'FamilyList Backup',
          accept: {
            'application/json': ['.json'],
          },
        },
      ],
      suggestedName: `familylist-backup-${new Date().toISOString().split('T')[0]}.json`,
    };

    const handle = await (window as any).showSaveFilePicker(options);
    const writable = await handle.createWritable();

    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();

    console.log('Backup exported successfully');
    return true;
  } catch (error) {
    console.error('Failed to export backup:', error);
    return false;
  }
}

// Fallback export using download
function exportBackupFallback(data: BackupData): boolean {
  try {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `familylist-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);

    console.log('Backup exported successfully (fallback)');
    return true;
  } catch (error) {
    console.error('Failed to export backup (fallback):', error);
    return false;
  }
}

// Import data from JSON file
export async function importBackup(): Promise<BackupData | null> {
  if (!isFileSystemAccessSupported()) {
    // Fallback to file input
    return importBackupFallback();
  }

  try {
    const options = {
      types: [
        {
          description: 'FamilyList Backup',
          accept: {
            'application/json': ['.json'],
          },
        },
      ],
      multiple: false,
    };

    const [handle] = await (window as any).showOpenFilePicker(options);
    const file = await handle.getFile();
    const contents = await file.text();

    const data: BackupData = JSON.parse(contents);

    console.log('Backup imported successfully');
    return data;
  } catch (error) {
    console.error('Failed to import backup:', error);
    return null;
  }
}

// Fallback import using file input
function importBackupFallback(): Promise<BackupData | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        resolve(null);
        return;
      }

      try {
        const contents = await file.text();
        const data: BackupData = JSON.parse(contents);
        console.log('Backup imported successfully (fallback)');
        resolve(data);
      } catch (error) {
        console.error('Failed to import backup (fallback):', error);
        resolve(null);
      }
    };

    input.click();
  });
}

// Validate backup data structure
export function validateBackupData(data: any): data is BackupData {
  return (
    data &&
    typeof data === 'object' &&
    typeof data.version === 'string' &&
    typeof data.timestamp === 'number' &&
    typeof data.data === 'object'
  );
}

// Create backup data from current app state
export function createBackupData(appData: {
  tasks?: any[];
  shopping?: any[];
  calendar?: any[];
  recipes?: any[];
  budget?: any[];
  settings?: any;
}): BackupData {
  return {
    version: '1.0.0',
    timestamp: Date.now(),
    data: appData,
  };
}

// Export specific category
export async function exportCategory(
  category: string,
  data: any[]
): Promise<boolean> {
  const backup = createBackupData({ [category]: data });
  return exportBackup(backup);
}

// Helper to get file size estimate
export function getBackupSize(data: BackupData): string {
  const json = JSON.stringify(data);
  const bytes = new Blob([json]).size;

  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// Export as CSV (for specific data types)
export async function exportAsCSV(
  data: any[],
  filename: string
): Promise<boolean> {
  try {
    if (data.length === 0) {
      console.warn('No data to export');
      return false;
    }

    // Get headers from first object
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map((row) =>
        headers.map((header) => JSON.stringify(row[header] || '')).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);

    console.log('CSV exported successfully');
    return true;
  } catch (error) {
    console.error('Failed to export CSV:', error);
    return false;
  }
}
