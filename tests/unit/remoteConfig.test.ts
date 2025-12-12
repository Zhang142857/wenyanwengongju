import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('RemoteConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateConfig', () => {
    it('should validate a correct config', async () => {
      const { fetchRemoteConfig } = await import('../../src/services/remoteConfig');
      
      const validConfig = {
        schemaVersion: 1,
        version: '1.0.0',
        ai: {
          apiConfigs: [
            { provider: 'test', baseUrl: 'https://api.test.com' }
          ]
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(validConfig),
        headers: new Headers()
      });

      const result = await fetchRemoteConfig({ url: 'https://test.com/config' });
      expect(result.config).toEqual(validConfig);
      expect(result.fromCache).toBe(false);
    });

    it('should reject invalid config', async () => {
      const { fetchRemoteConfig } = await import('../../src/services/remoteConfig');
      
      const invalidConfig = {
        // missing schemaVersion and version
        ai: {}
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(invalidConfig),
        headers: new Headers()
      });

      await expect(fetchRemoteConfig({ url: 'https://test.com/config' }))
        .rejects.toThrow('配置校验失败');
    });
  });

  describe('caching', () => {
    it('should cache config after successful fetch', async () => {
      const { fetchRemoteConfig } = await import('../../src/services/remoteConfig');
      
      const config = {
        schemaVersion: 1,
        version: '1.0.0'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(config),
        headers: new Headers({ 'ETag': '"abc123"' })
      });

      await fetchRemoteConfig({ url: 'https://test.com/config' });
      
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should use cached config when not expired', async () => {
      const { fetchRemoteConfig } = await import('../../src/services/remoteConfig');
      
      const cachedConfig = {
        data: { schemaVersion: 1, version: '1.0.0' },
        timestamp: Date.now(),
        etag: '"abc123"'
      };

      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(cachedConfig));

      const result = await fetchRemoteConfig({ 
        url: 'https://test.com/config',
        refreshInterval: 3600000 
      });
      
      expect(result.fromCache).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should fallback to cache on network error', async () => {
      const { fetchRemoteConfig } = await import('../../src/services/remoteConfig');
      
      const cachedConfig = {
        data: { schemaVersion: 1, version: '1.0.0' },
        timestamp: Date.now() - 7200000, // 2 hours ago (expired)
        etag: '"abc123"'
      };

      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(cachedConfig));
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await fetchRemoteConfig({ 
        url: 'https://test.com/config',
        fallbackToLocal: true 
      });
      
      expect(result.fromCache).toBe(true);
      expect(result.error).toBe('Network error');
    });

    it('should throw when no cache and network fails', async () => {
      const { fetchRemoteConfig } = await import('../../src/services/remoteConfig');
      
      localStorageMock.getItem.mockReturnValueOnce(null);
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(fetchRemoteConfig({ 
        url: 'https://test.com/config',
        fallbackToLocal: true 
      })).rejects.toThrow('Network error');
    });
  });
});
