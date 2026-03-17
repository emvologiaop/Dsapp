import { afterEach, describe, expect, it, vi } from 'vitest';
import { getStoredDataSaverMode, setStoredDataSaverMode, shouldEnableDataSaverByDefault } from '../src/utils/performance';

const originalNavigator = globalThis.navigator;
const originalWindow = globalThis.window;

function createStorage() {
  const values = new Map<string, string>();

  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    clear: () => values.clear(),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalWindow) {
    vi.stubGlobal('window', originalWindow);
  }
  if (originalNavigator) {
    vi.stubGlobal('navigator', originalNavigator);
  }
});

describe('performance utils', () => {
  it('persists data saver mode in local storage', () => {
    const storage = createStorage();
    vi.stubGlobal('window', { localStorage: storage });

    expect(getStoredDataSaverMode()).toBe(null);

    setStoredDataSaverMode(true);
    expect(getStoredDataSaverMode()).toBe(true);

    setStoredDataSaverMode(false);
    expect(getStoredDataSaverMode()).toBe(false);
  });

  it('enables data saver by default when the browser requests reduced data usage', () => {
    vi.stubGlobal('window', { localStorage: createStorage() });
    vi.stubGlobal('navigator', {
      ...originalNavigator,
      connection: { saveData: true, effectiveType: '4g' },
    });

    expect(shouldEnableDataSaverByDefault()).toBe(true);
  });

  it('enables data saver by default on very slow connections', () => {
    vi.stubGlobal('window', { localStorage: createStorage() });
    vi.stubGlobal('navigator', {
      ...originalNavigator,
      connection: { saveData: false, effectiveType: '2g' },
    });

    expect(shouldEnableDataSaverByDefault()).toBe(true);
  });
});
