/**
 * Metadata Normalizer Tests
 */

const MetadataNormalizer = require('./normalizer');
const schema = require('./schemas/normalizedMetadata.schema.json');

describe('MetadataNormalizer', () => {
  let normalizer;

  beforeEach(() => {
    normalizer = new MetadataNormalizer();
  });

  describe('normalize', () => {
    describe('YouTube adapter', () => {
      test('normalizes YouTube single video metadata', () => {
        const youtubeData = {
          videoId: 'dQw4w9WgXcQ',
          title: 'Never Gonna Give You Up',
          duration: 213,
          thumbnail_url: 'https://example.com/thumb.jpg',
          channel_name: 'Official Channel',
          channel_url: 'https://youtube.com/@channel',
          upload_date: '2009-10-25T06:57:33Z',
          view_count: 1000000000,
          like_count: 5000000,
          description: 'The official video',
          sourceUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          sourceType: 'video',
          resolutions: [
            { format: 'mp4', codec: 'h264', width: 1920, height: 1080, fps: 30, fileSize: 100000 }
          ]
        };

        const normalized = normalizer.normalize(youtubeData, 'youtube');

        expect(normalized.id).toBe('dQw4w9WgXcQ');
        expect(normalized.title).toBe('Never Gonna Give You Up');
        expect(normalized.duration).toBe(213);
        expect(normalized.thumbnailUrl).toBe('https://example.com/thumb.jpg');
        expect(normalized.authorName).toBe('Official Channel');
        expect(normalized.adapterName).toBe('youtube');
        expect(normalized.sourceType).toBe('video');
        expect(normalized.viewCount).toBe(1000000000);
        expect(normalized.likeCount).toBe(5000000);
        expect(normalized.resolutions.length).toBe(1);
        expect(normalized.normalizedKey).toContain('youtube');
        expect(normalized.normalizedKey).toContain('dQw4w9WgXcQ');
      });

      test('normalizes YouTube playlist metadata', () => {
        const playlistData = {
          id: 'PLxxx',
          title: 'My Playlist',
          sourceType: 'playlist',
          sourceUrl: 'https://www.youtube.com/playlist?list=PLxxx'
        };

        const normalized = normalizer.normalize(playlistData, 'youtube');

        expect(normalized.sourceType).toBe('playlist');
        expect(normalized.title).toBe('My Playlist');
      });
    });

    describe('Vimeo adapter', () => {
      test('normalizes Vimeo video metadata', () => {
        const vimeoData = {
          id: '123456789',
          name: 'Test Video',
          duration: 300,
          pictures: 'https://example.com/vimeo.jpg',
          user_name: 'John Doe',
          user_url: 'https://vimeo.com/user123',
          created_time: '2023-01-15T10:30:00Z',
          description: 'A test video',
          sourceUrl: 'https://vimeo.com/123456789'
        };

        const normalized = normalizer.normalize(vimeoData, 'vimeo');

        expect(normalized.id).toBe('123456789');
        expect(normalized.title).toBe('Test Video');
        expect(normalized.duration).toBe(300);
        expect(normalized.adapterName).toBe('vimeo');
        expect(normalized.authorName).toBe('John Doe');
      });
    });

    describe('HTML adapter', () => {
      test('normalizes HTML page metadata', () => {
        const htmlData = {
          url: 'https://example.com/video',
          title: 'Web Page Video',
          'og:image': 'https://example.com/og.jpg',
          description: 'A video on a web page',
          sourceUrl: 'https://example.com/video'
        };

        const normalized = normalizer.normalize(htmlData, 'html');

        expect(normalized.title).toBe('Web Page Video');
        expect(normalized.thumbnailUrl).toBe('https://example.com/og.jpg');
        expect(normalized.adapterName).toBe('html');
      });
    });

    describe('field extraction', () => {
      test('extracts values using field mappings', () => {
        const data = {
          videoId: 'test123',
          title: 'Test Title'
        };

        const normalized = normalizer.normalize(data, 'youtube');

        expect(normalized.id).toBe('test123');
        expect(normalized.title).toBe('Test Title');
      });

      test('uses fallback field names', () => {
        const data = {
          id: 'alt-id', // Alternative field name
          title: 'Test'
        };

        const normalized = normalizer.normalize(data, 'youtube');

        // Should find id as fallback
        expect(normalized.id).toBe('alt-id');
      });

      test('handles missing fields gracefully', () => {
        const data = {
          title: 'Test'
        };

        const normalized = normalizer.normalize(data, 'youtube');

        expect(normalized.id).toBeNull();
        expect(normalized.title).toBe('Test');
      });
    });

    describe('date normalization', () => {
      test('normalizes ISO date strings', () => {
        const data = {
          title: 'Test',
          uploadDate: '2023-01-15T10:30:00Z'
        };

        normalizer.registerMapping('test', {
          uploadDate: ['uploadDate']
        });
        const normalized = normalizer.normalize(data, 'test');

        expect(normalized.uploadDate).toBe('2023-01-15T10:30:00Z');
      });

      test('converts Date objects to ISO format', () => {
        const data = {
          title: 'Test',
          publishDate: new Date('2023-01-15')
        };

        normalizer.registerMapping('test', {
          uploadDate: ['publishDate']
        });
        const normalized = normalizer.normalize(data, 'test');

        expect(normalized.uploadDate).toContain('2023-01-15');
      });

      test('handles invalid dates gracefully', () => {
        const data = {
          title: 'Test',
          uploadDate: 'invalid-date'
        };

        normalizer.registerMapping('test', {
          uploadDate: ['uploadDate']
        });
        const normalized = normalizer.normalize(data, 'test');

        expect(normalized.uploadDate).toBeNull();
      });
    });

    describe('resolution normalization', () => {
      test('normalizes resolution objects', () => {
        const data = {
          title: 'Test',
          resolutions: [
            {
              format: 'mp4',
              codec: 'h264',
              width: 1920,
              height: 1080,
              fps: 30,
              fileSize: 100000
            }
          ]
        };

        const normalized = normalizer.normalize(data, 'test');

        expect(normalized.resolutions.length).toBe(1);
        const res = normalized.resolutions[0];
        expect(res.format).toBe('mp4');
        expect(res.codec).toBe('h264');
        expect(res.width).toBe(1920);
        expect(res.height).toBe(1080);
      });

      test('handles audio-only resolutions', () => {
        const data = {
          title: 'Test',
          resolutions: [
            {
              format: 'mp3',
              codec: 'mp3',
              bitrate: '128k',
              fileSize: 5000
            }
          ]
        };

        const normalized = normalizer.normalize(data, 'test');

        const res = normalized.resolutions[0];
        expect(res.width).toBe(0);
        expect(res.height).toBe(0);
        expect(res.fps).toBe(0);
      });
    });

    describe('normalized key generation', () => {
      test('generates YouTube normalized key', () => {
        const data = {
          videoId: 'dQw4w9WgXcQ',
          title: 'Test'
        };

        const normalized = normalizer.normalize(data, 'youtube');

        expect(normalized.normalizedKey).toBe('youtube:dQw4w9WgXcQ');
      });

      test('generates HTML normalized key with URL hash', () => {
        const data = {
          url: 'https://example.com/video',
          title: 'Test'
        };

        const normalized = normalizer.normalize(data, 'html');

        expect(normalized.normalizedKey).toContain('html:');
      });

      test('appends resolution to key if present', () => {
        const data = {
          videoId: 'test123',
          selectedResolution: '1080p',
          title: 'Test'
        };

        const normalized = normalizer.normalize(data, 'youtube');

        expect(normalized.normalizedKey).toContain('@1080p');
      });
    });

    describe('expiry calculation', () => {
      test('calculates expiry time (7 days default)', () => {
        const data = { title: 'Test' };
        const normalized = normalizer.normalize(data, 'youtube');

        const expiryDate = new Date(normalized.expiresAt);
        const today = new Date();
        const daysDiff = (expiryDate - today) / (1000 * 60 * 60 * 24);

        expect(daysDiff).toBeGreaterThan(6.9);
        expect(daysDiff).toBeLessThan(7.1);
      });

      test('respects provided expiry', () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);

        const data = {
          title: 'Test',
          expiresAt: futureDate.toISOString()
        };

        const normalized = normalizer.normalize(data, 'youtube');

        expect(normalized.expiresAt).toBe(futureDate.toISOString());
      });
    });

    describe('array normalization', () => {
      test('normalizes array of metadata', () => {
        const dataArray = [
          { videoId: 'test1', title: 'Video 1' },
          { videoId: 'test2', title: 'Video 2' }
        ];

        const normalized = normalizer.normalizeArray(dataArray, 'youtube');

        expect(Array.isArray(normalized)).toBe(true);
        expect(normalized.length).toBe(2);
        expect(normalized[0].id).toBe('test1');
        expect(normalized[1].id).toBe('test2');
      });

      test('handles non-array input gracefully', () => {
        const normalized = normalizer.normalizeArray('not-an-array', 'youtube');

        expect(Array.isArray(normalized)).toBe(true);
        expect(normalized.length).toBe(0);
      });
    });

    describe('adapter metadata preservation', () => {
      test('preserves adapter-specific metadata', () => {
        const data = {
          videoId: 'test123',
          title: 'Test',
          adapterMetadata: {
            customField: 'customValue',
            channelId: 'UC_xyz'
          }
        };

        const normalized = normalizer.normalize(data, 'youtube');

        expect(normalized.adapterMetadata.customField).toBe('customValue');
        expect(normalized.adapterMetadata.channelId).toBe('UC_xyz');
      });
    });

    describe('schema compliance', () => {
      test('normalized output passes schema validation', () => {
        const data = {
          videoId: 'test123',
          title: 'Test Video',
          duration: 300,
          sourceUrl: 'https://youtube.com/watch?v=test123'
        };

        const normalized = normalizer.normalize(data, 'youtube');

        // Should have no validation errors
        expect(normalized.validationErrors).toBeUndefined();
      });

      test('includes required fields', () => {
        const data = { title: 'Test' };
        const normalized = normalizer.normalize(data, 'youtube');

        expect(normalized.id).toBeDefined();
        expect(normalized.title).toBeDefined();
        expect(normalized.adapterName).toBeDefined();
        expect(normalized.sourceType).toBeDefined();
        expect(normalized.duration).toBeDefined();
        expect(normalized.normalizedKey).toBeDefined();
      });
    });

    describe('denormalization', () => {
      test('denormalizes back to adapter format', () => {
        const normalized = {
          id: 'test123',
          title: 'Test Video',
          duration: 300,
          adapterMetadata: { videoId: 'test123' }
        };

        const denormalized = normalizer.denormalize(normalized, 'youtube');

        expect(denormalized.videoId).toBe('test123');
      });
    });

    describe('error handling', () => {
      test('handles null data gracefully', () => {
        const normalized = normalizer.normalize(null, 'youtube');

        expect(normalized.error).toBeDefined();
        expect(normalized.error.code).toBe('INVALID_DATA');
      });

      test('handles undefined data gracefully', () => {
        const normalized = normalizer.normalize(undefined, 'youtube');

        expect(normalized.error).toBeDefined();
      });
    });

    describe('custom field mappings', () => {
      test('registers custom adapter mappings', () => {
        normalizer.registerMapping('custom', {
          id: ['customId'],
          title: ['customTitle']
        });

        const data = {
          customId: 'id123',
          customTitle: 'Title'
        };

        const normalized = normalizer.normalize(data, 'custom');

        expect(normalized.id).toBe('id123');
        expect(normalized.title).toBe('Title');
      });

      test('supports multiple field name options', () => {
        const mapping = normalizer.getMapping('youtube');

        expect(Array.isArray(mapping.thumbnailUrl)).toBe(true);
        expect(mapping.thumbnailUrl.length).toBeGreaterThan(1);
      });
    });
  });

  describe('schema management', () => {
    test('returns schema version', () => {
      const version = normalizer.getSchemaVersion();

      expect(version).toBe(schema.version);
    });

    test('returns full schema', () => {
      const s = normalizer.getSchema();

      expect(s.$schema).toBeDefined();
      expect(s.properties).toBeDefined();
      expect(s.properties.id).toBeDefined();
      expect(s.properties.title).toBeDefined();
    });
  });

  describe('type coercion', () => {
    test('coerces string numbers to numbers', () => {
      const data = {
        title: 'Test',
        duration: '300'
      };

      const normalized = normalizer.normalize(data, 'youtube');

      expect(typeof normalized.duration).toBe('number');
      expect(normalized.duration).toBe(300);
    });

    test('handles invalid numbers gracefully', () => {
      const data = {
        title: 'Test',
        viewCount: 'not-a-number'
      };

      const normalized = normalizer.normalize(data, 'youtube');

      expect(normalized.viewCount).toBe(0); // Default value
    });
  });

  describe('confidence scoring', () => {
    test('sets default confidence', () => {
      const data = { title: 'Test' };
      const normalized = normalizer.normalize(data, 'youtube');

      expect(normalized.confidence).toBe(0.95);
    });

    test('preserves provided confidence', () => {
      const data = { title: 'Test', confidence: 0.75 };
      const normalized = normalizer.normalize(data, 'youtube');

      expect(normalized.confidence).toBe(0.75);
    });
  });
});
