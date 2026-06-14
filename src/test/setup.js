import { beforeEach } from 'vitest';

if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = {
    randomUUID: () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2025-06-15T10:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
});
