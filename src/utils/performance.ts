const DATA_SAVER_STORAGE_KEY = 'ddu_data_saver_mode';

type NavigatorConnection = {
  saveData?: boolean;
  effectiveType?: string;
};

function getConnection(): NavigatorConnection | null {
  if (typeof navigator === 'undefined') return null;

  return (
    (navigator as Navigator & {
      connection?: NavigatorConnection;
      mozConnection?: NavigatorConnection;
      webkitConnection?: NavigatorConnection;
    }).connection ||
    (navigator as Navigator & { mozConnection?: NavigatorConnection }).mozConnection ||
    (navigator as Navigator & { webkitConnection?: NavigatorConnection }).webkitConnection ||
    null
  );
}

export function getStoredDataSaverMode(): boolean | null {
  if (typeof window === 'undefined') return null;

  const rawValue = window.localStorage.getItem(DATA_SAVER_STORAGE_KEY);
  if (rawValue === null) return null;
  return rawValue === 'true';
}

export function setStoredDataSaverMode(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DATA_SAVER_STORAGE_KEY, String(enabled));
}

export function shouldEnableDataSaverByDefault(): boolean {
  const connection = getConnection();
  if (!connection) return false;

  if (connection.saveData) return true;

  return connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g';
}
