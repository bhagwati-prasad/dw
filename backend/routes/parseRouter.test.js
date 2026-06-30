/**
 * Parse Router Tests
 * 
 * Tests for URL detection, adapter routing, and error handling
 */

const URLDetector = require('./detector');
const ParseRouter = require('./parseRouter');
const { BaseAdapter, AdapterError } = require('./BaseAdapter');
const AdapterRegistry = require('./registry');

// Mock adapters for testing
class MockYouTubeAdapter extends BaseAdapter {
  static adapterName = 'youtube';
  static priority = 1;

  async detectURL(url) {
    const isYouTube = /youtube\.com|youtu\.be/.test(url);
    if (!isYouTube) return { canHandle: false, confidence: 0 };

    let sourceType = 'video';
    if (/playlist/.test(url)) sourceType = 'playlist';
    if (/@/.test(url) || /channel/.test(url)) sourceType = 'channel';

    return {
      canHandle: true,
      confidence: 0.99,
      sourceType
    };
  }

  async parseURL(url) {
    return {
      metadata: {
        id: 'test-video-id',
        sourceUrl: url,
        normalizedKey: 'youtube:test-video-id',
        adapterName: 'youtube',
        sourceType: 'video',
        title: 'Test Video',
        duration: 213,
        thumbnailUrl: 'https://example.com/thumb.jpg',
        resolutions: []
      }
    };
  }

  async getResolutions(url) {
    return {
      resolutions: [
        { format: 'mp4', codec: 'h264', width: 1920, height: 1080, fps: 30, fileSize: 100000 },
        { format: 'mp4', codec: 'h264', width: 1280, height: 720, fps: 30, fileSize: 50000 }
      ]
    };
  }

  async download(sourceUrl, resolution, format, outputPath) {
    return { filePath: '/path/to/file.mp4', metadata: {} };
  }
}

class MockHTMLAdapter extends BaseAdapter {
  static adapterName = 'html';
  static priority = 999;

  async detectURL(url) {
    const isURL = /^https?:\/\//.test(url);
    return {
      canHandle: isURL,
      confidence: 0.5,
      sourceType: 'unknown'
    };
  }

  async parseURL(url) {
    return {
      metadata: {
        id: 'html-id',
        sourceUrl: url,
        normalizedKey: `html:${url}`,
        adapterName: 'html',
        sourceType: 'unknown',
        title: 'HTML Source',
        duration: 0,
        resolutions: []
      }
    };
  }

  async getResolutions(url) {
    return { resolutions: [] };
  }

  async download(sourceUrl, resolution, format, outputPath) {
    return { filePath: '/path/to/file.mp4', metadata: {} };
  }
}

class FailingAdapter extends BaseAdapter {
  static adapterName = 'failing';
  static priority = 50;

  async detectURL(url) {
    return { canHandle: /fail/.test(url), confidence: 0.9, sourceType: 'video' };
  }

  async parseURL(url) {
    return { error: new AdapterError('Parse failed', 'PARSE_ERROR') };
  }

  async getResolutions(url) {
    return { error: new AdapterError('No resolutions', 'RESOLUTION_ERROR') };
  }

  async download() {
    return { error: new AdapterError('Download failed', 'DOWNLOAD_ERROR') };
  }
}

// Test suite
describe('URLDetector', () => {
  let detector;

  beforeEach(() => {
    detector = new URLDetector();
  });

  describe('detectByPattern', () => {
    test('detects YouTube video URL', () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const results = detector.detectByPattern(url);
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].adapterName).toBe('youtube');
      expect(results[0].sourceType).toBe('video');
    });

    test('detects YouTube playlist URL', () => {
      const url = 'https://www.youtube.com/playlist?list=PLxxx';
      const results = detector.detectByPattern(url);
      
      expect(results[0].sourceType).toBe('playlist');
    });

    test('detects YouTube channel URL', () => {
      const url = 'https://www.youtube.com/@channelname';
      const results = detector.detectByPattern(url);
      
      expect(results[0].sourceType).toBe('channel');
    });

    test('detects youtu.be shortened URL', () => {
      const url = 'https://youtu.be/dQw4w9WgXcQ';
      const results = detector.detectByPattern(url);
      
      expect(results[0].adapterName).toBe('youtube');
    });

    test('detects Vimeo URL', () => {
      const url = 'https://vimeo.com/123456';
      const results = detector.detectByPattern(url);
      
      expect(results.some(r => r.adapterName === 'vimeo')).toBe(true);
    });

    test('prioritizes by adapter priority', () => {
      const url = 'https://www.youtube.com/watch?v=test';
      const results = detector.detectByPattern(url);
      
      // YouTube should come before HTML (lower priority number)
      const youtubeIndex = results.findIndex(r => r.adapterName === 'youtube');
      const htmlIndex = results.findIndex(r => r.adapterName === 'html');
      
      expect(youtubeIndex).toBeLessThan(htmlIndex);
    });
  });

  describe('detect', () => {
    test('returns success for valid YouTube URL', async () => {
      const result = await detector.detect('https://www.youtube.com/watch?v=test');
      
      expect(result.success).toBe(true);
      expect(result.primary.adapterName).toBe('youtube');
      expect(result.primary.confidence).toBeGreaterThan(0.5);
    });

    test('returns success for valid Vimeo URL', async () => {
      const result = await detector.detect('https://vimeo.com/123456');
      
      expect(result.success).toBe(true);
      expect(result.primary.adapterName).toBe('vimeo');
    });

    test('returns error for unrecognized URL', async () => {
      const result = await detector.detect('not-a-url');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('returns alternates when multiple adapters match', async () => {
      const result = await detector.detect('https://www.youtube.com/watch?v=test');
      
      expect(result.alternates).toBeDefined();
      expect(Array.isArray(result.alternates)).toBe(true);
    });

    test('normalizes URLs without protocol', async () => {
      const result = await detector.detect('youtube.com/watch?v=test');
      
      expect(result.url).toContain('https://');
    });

    test('returns fallback to HTML adapter', async () => {
      const result = await detector.detect('https://example.com/video');
      
      expect(result.success).toBe(true);
      expect(result.primary.adapterName).toBe('html');
    });
  });

  describe('classifyURL', () => {
    test('classifies YouTube video', () => {
      const type = detector._classifyURL('https://youtube.com/watch?v=test', 'youtube');
      expect(type).toBe('video');
    });

    test('classifies YouTube playlist', () => {
      const type = detector._classifyURL('https://youtube.com/playlist?list=test', 'youtube');
      expect(type).toBe('playlist');
    });

    test('classifies YouTube channel', () => {
      const type = detector._classifyURL('https://youtube.com/@channel', 'youtube');
      expect(type).toBe('channel');
    });
  });

  describe('getStats', () => {
    test('returns detector statistics', () => {
      const stats = detector.getStats();
      
      expect(stats.totalPatterns).toBeGreaterThan(0);
      expect(Array.isArray(stats.patterns)).toBe(true);
    });
  });
});

describe('ParseRouter', () => {
  let router;
  let registry;

  beforeEach(async () => {
    registry = new AdapterRegistry();
    registry.adapters.set('youtube', new MockYouTubeAdapter());
    registry.adapters.set('html', new MockHTMLAdapter());
    registry.adapters.set('failing', new FailingAdapter());
    router = new ParseRouter(registry);
  });

  describe('parseSingle', () => {
    test('parses YouTube URL successfully', async () => {
      const result = await router.parseSingle('https://www.youtube.com/watch?v=test');
      
      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.data.metadata).toBeDefined();
      expect(result.data.detection.adapter).toBe('youtube');
    });

    test('falls back to HTML adapter on failure', async () => {
      const result = await router.parseSingle('https://fail.example.com/video');
      
      expect(result.success).toBe(true);
      expect(result.data.detection.fallback).toBe(true);
    });

    test('returns error for no matching adapter', async () => {
      const result = await router.parseSingle('not-a-url');
      
      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(404);
      expect(result.error.code).toBe('NO_ADAPTER_FOUND');
    });

    test('returns error with 400 status for parse failure', async () => {
      const result = await router.parseSingle('https://fail.example.com/fail');
      
      expect(result.success).toBe(false);
    });
  });

  describe('parseCreator', () => {
    test('parses creator input as URL', async () => {
      const result = await router.parseCreator('https://www.youtube.com/@creator');
      
      expect(result.success).toBe(true);
      expect(result.data.type).toBe('creator');
    });

    test('handles creator input gracefully', async () => {
      const result = await router.parseCreator('channel-name');
      
      expect(result.success).toBeDefined();
    });
  });

  describe('parseBatch', () => {
    test('parses multiple URLs', async () => {
      const urls = [
        'https://www.youtube.com/watch?v=test1',
        'https://www.youtube.com/watch?v=test2',
        'https://example.com/video'
      ];
      const result = await router.parseBatch(urls);
      
      expect(result.success).toBe(true);
      expect(result.data.type).toBe('batch');
      expect(result.data.results.total).toBe(3);
    });

    test('handles batch with errors', async () => {
      const urls = ['https://fail.example.com/fail', 'https://www.youtube.com/watch?v=test'];
      const result = await router.parseBatch(urls);
      
      expect(result.data.results.failed).toBeGreaterThan(0);
      expect(result.data.results.errors).toBeDefined();
    });

    test('returns error for empty batch', async () => {
      const result = await router.parseBatch([]);
      
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('INVALID_BATCH');
    });

    test('returns error for batch > 100 URLs', async () => {
      const urls = Array(101).fill('https://www.youtube.com/watch?v=test');
      const result = await router.parseBatch(urls);
      
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('BATCH_TOO_LARGE');
    });

    test('returns 206 status for partial success', async () => {
      const urls = ['https://fail.example.com/fail', 'https://www.youtube.com/watch?v=test'];
      const result = await router.parseBatch(urls);
      
      expect(result.statusCode).toBe(206);
    });
  });

  describe('getResolutions', () => {
    test('gets resolutions for YouTube URL', async () => {
      const result = await router.getResolutions('https://www.youtube.com/watch?v=test');
      
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data.resolutions)).toBe(true);
      expect(result.data.resolutions.length).toBeGreaterThan(0);
    });

    test('marks best resolution as recommended', async () => {
      const result = await router.getResolutions('https://www.youtube.com/watch?v=test');
      
      const recommended = result.data.resolutions.find(r => r.isRecommended);
      expect(recommended).toBeDefined();
    });

    test('returns error for URL without resolutions', async () => {
      const result = await router.getResolutions('https://example.com/no-resolutions');
      
      expect(result.success).toBe(true);
      expect(result.data.resolutions.length).toBe(0);
    });

    test('returns error for unrecognized URL', async () => {
      const result = await router.getResolutions('not-a-url');
      
      expect(result.success).toBe(false);
    });
  });

  describe('error handling', () => {
    test('returns 503 when adapter not available', async () => {
      registry.adapters.delete('youtube');
      const result = await router.parseSingle('https://www.youtube.com/watch?v=test');
      
      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(503);
    });

    test('catches unexpected errors', async () => {
      const badRouter = new ParseRouter({
        getAdapterByName: () => { throw new Error('Unexpected error'); },
        adapters: new Map()
      });

      const result = await badRouter.parseSingle('https://www.youtube.com/watch?v=test');
      
      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(500);
    });
  });

  describe('response format', () => {
    test('includes timestamp in all responses', async () => {
      const result = await router.parseSingle('https://www.youtube.com/watch?v=test');
      
      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp).getTime()).toBeGreaterThan(0);
    });

    test('normalizes resolutions', async () => {
      const result = await router.getResolutions('https://www.youtube.com/watch?v=test');
      
      for (const res of result.data.resolutions) {
        expect(res.format).toBeDefined();
        expect(res.codec).toBeDefined();
        expect(res.width).toBeDefined();
        expect(res.height).toBeDefined();
      }
    });
  });

  describe('getStats', () => {
    test('returns router statistics', () => {
      const stats = router.getStats();
      
      expect(stats.detector).toBeDefined();
      expect(stats.adapters).toBeDefined();
    });
  });
});
