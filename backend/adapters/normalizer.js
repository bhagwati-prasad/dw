/**
 * Metadata Normalizer
 * 
 * Converts adapter-specific metadata to standard normalized format.
 * Provides validation and mapping utilities.
 */

const Ajv = require('ajv');
const schema = require('./schemas/normalizedMetadata.schema.json');

class MetadataNormalizer {
  constructor(logger = console) {
    this.logger = logger;
    this.ajv = new Ajv({ useDefaults: true, coerceTypes: true });
    this.validate = this.ajv.compile(schema);
    this.fieldMappings = new Map();
    this._registerDefaultMappings();
  }

  /**
   * Register default field mappings for common adapters
   * @private
   */
  _registerDefaultMappings() {
    // YouTube
    this.registerMapping('youtube', {
      id: ['videoId', 'id'],
      title: ['title'],
      duration: ['duration'],
      thumbnailUrl: ['thumbnail_url', 'thumbnail', 'thumbnailUrl'],
      authorName: ['channel_name', 'channelName', 'author'],
      authorUrl: ['channel_url', 'channelUrl'],
      uploadDate: ['upload_date', 'uploadDate', 'published_at'],
      viewCount: ['view_count', 'viewCount', 'views'],
      likeCount: ['like_count', 'likeCount', 'likes'],
      description: ['description'],
      tags: ['tags', 'keywords']
    });

    // Vimeo
    this.registerMapping('vimeo', {
      id: ['id', 'videoId'],
      title: ['name', 'title'],
      duration: ['duration'],
      thumbnailUrl: ['pictures', 'thumbnail_url', 'posterUrl'],
      authorName: ['user_name', 'userName', 'author'],
      authorUrl: ['user_url', 'userUrl'],
      uploadDate: ['created_time', 'createdTime'],
      viewCount: ['stats_number_of_plays', 'views'],
      likeCount: ['stats_number_of_likes', 'likes'],
      description: ['description']
    });

    // Dailymotion
    this.registerMapping('dailymotion', {
      id: ['id', 'videoId'],
      title: ['title'],
      duration: ['duration'],
      thumbnailUrl: ['thumbnail_url', 'poster_url'],
      authorName: ['owner_screenname', 'author'],
      authorUrl: ['owner_url', 'owner_screenname'],
      uploadDate: ['created_time', 'createdTime'],
      viewCount: ['views_total', 'views'],
      description: ['description'],
      tags: ['tags']
    });

    // Generic HTML
    this.registerMapping('html', {
      id: ['hash', 'url'],
      title: ['title', 'og:title', 'twitter:title'],
      thumbnailUrl: ['og:image', 'twitter:image', 'thumbnail'],
      description: ['description', 'og:description', 'twitter:description'],
      authorName: ['author', 'site_name'],
      uploadDate: ['publish_date', 'datePublished']
    });
  }

  /**
   * Register custom field mappings for an adapter
   */
  registerMapping(adapterName, mappings) {
    this.fieldMappings.set(adapterName, mappings);
  }

  /**
   * Get field mappings for an adapter
   */
  getMapping(adapterName) {
    return this.fieldMappings.get(adapterName) || {};
  }

  /**
   * Extract value from object using multiple possible field names
   * @private
   */
  _extractValue(obj, fieldPaths, defaultValue = null) {
    if (!obj || typeof obj !== 'object') {
      return defaultValue;
    }

    const paths = Array.isArray(fieldPaths) ? fieldPaths : [fieldPaths];

    for (const path of paths) {
      const value = this._getNestedValue(obj, path);
      if (value !== null && value !== undefined) {
        return value;
      }
    }

    return defaultValue;
  }

  /**
   * Get nested value from object using dot notation
   * @private
   */
  _getNestedValue(obj, path) {
    try {
      return path
        .split('.')
        .reduce((current, prop) => current?.[prop], obj);
    } catch (error) {
      return null;
    }
  }

  /**
   * Normalize adapter output to standard schema
   */
  normalize(adapterData, adapterName) {
    if (!adapterData) {
      return {
        error: {
          message: 'No data to normalize',
          code: 'INVALID_DATA'
        }
      };
    }

    const mapping = this.getMapping(adapterName);

    try {
      // Extract values using mappings
      const normalized = {
        id: this._extractValue(adapterData, mapping.id),
        sourceUrl: adapterData.sourceUrl || adapterData.url || null,
        normalizedKey: this._buildNormalizedKey(adapterName, adapterData),
        adapterName,
        sourceType: adapterData.sourceType || 'video',
        title: this._extractValue(adapterData, mapping.title),
        description: this._extractValue(adapterData, mapping.description),
        duration: this._extractValue(adapterData, mapping.duration, 0),
        thumbnailUrl: this._extractValue(adapterData, mapping.thumbnailUrl),
        previewUrl: adapterData.previewUrl || null,
        authorName: this._extractValue(adapterData, mapping.authorName),
        authorUrl: this._extractValue(adapterData, mapping.authorUrl),
        uploadDate: this._normalizeDate(
          this._extractValue(adapterData, mapping.uploadDate)
        ),
        viewCount: this._normalizeNumber(
          this._extractValue(adapterData, mapping.viewCount)
        ),
        likeCount: this._normalizeNumber(
          this._extractValue(adapterData, mapping.likeCount)
        ),
        tags: Array.isArray(this._extractValue(adapterData, mapping.tags))
          ? this._extractValue(adapterData, mapping.tags)
          : [],
        resolutions: Array.isArray(adapterData.resolutions)
          ? adapterData.resolutions.map(r => this._normalizeResolution(r))
          : [],
        formatOptions: Array.isArray(adapterData.formatOptions)
          ? adapterData.formatOptions
          : [],
        subtitles: Array.isArray(adapterData.subtitles)
          ? adapterData.subtitles
          : [],
        adapterMetadata: adapterData.adapterMetadata || {},
        parsedAt: adapterData.parsedAt || new Date().toISOString(),
        expiresAt: adapterData.expiresAt || this._calculateExpiry(),
        confidence: adapterData.confidence || 0.95
      };

      // Validate against schema
      const valid = this.validate(normalized);

      if (!valid) {
        this.logger.warn(
          `Normalized metadata validation failed: ${JSON.stringify(this.validate.errors)}`
        );
        // Don't fail, just warn - add errors field
        normalized.validationErrors = this.validate.errors;
      }

      return normalized;
    } catch (error) {
      this.logger.error(`Normalization error: ${error.message}`);
      return {
        error: {
          message: error.message,
          code: 'NORMALIZATION_ERROR'
        }
      };
    }
  }

  /**
   * Normalize array of metadata items
   */
  normalizeArray(adapterDataArray, adapterName) {
    if (!Array.isArray(adapterDataArray)) {
      return [];
    }

    return adapterDataArray.map(item => this.normalize(item, adapterName));
  }

  /**
   * Denormalize from standard format back to adapter-specific format (if needed)
   */
  denormalize(normalizedData, adapterName) {
    // This is mainly for internal use - converting back to adapter format for re-processing
    // Most adapters don't need this, but it's available if needed

    const mapping = this.getMapping(adapterName);
    const reverseMapping = {};

    // Create reverse mapping
    for (const [standardField, adapterFields] of Object.entries(mapping)) {
      if (Array.isArray(adapterFields) && adapterFields.length > 0) {
        reverseMapping[standardField] = adapterFields[0]; // Use first adapter field
      }
    }

    const denormalized = {
      ...normalizedData.adapterMetadata
    };

    // Map standard fields back to adapter fields
    if (reverseMapping.id && normalizedData.id) {
      denormalized[reverseMapping.id] = normalizedData.id;
    }
    if (reverseMapping.title && normalizedData.title) {
      denormalized[reverseMapping.title] = normalizedData.title;
    }
    if (reverseMapping.duration && normalizedData.duration) {
      denormalized[reverseMapping.duration] = normalizedData.duration;
    }
    // ... add more as needed

    return denormalized;
  }

  /**
   * Validate metadata against schema
   */
  validate(metadata) {
    const valid = this.validate(metadata);

    return {
      valid,
      errors: valid ? [] : this.validate.errors
    };
  }

  /**
   * Normalize resolution object
   * @private
   */
  _normalizeResolution(resolution) {
    if (!resolution || typeof resolution !== 'object') {
      return null;
    }

    return {
      format: resolution.format || resolution.container || 'unknown',
      codec: resolution.codec || resolution.vcodec || 'unknown',
      width: this._normalizeNumber(resolution.width, 0),
      height: this._normalizeNumber(resolution.height, 0),
      bitrate: resolution.bitrate || resolution.abr || 'unknown',
      fps: this._normalizeNumber(resolution.fps || resolution.fps, 0),
      fileSize: this._normalizeNumber(resolution.fileSize || resolution.size, 0),
      isRecommended: resolution.isRecommended || false
    };
  }

  /**
   * Normalize date to ISO format
   * @private
   */
  _normalizeDate(dateValue) {
    if (!dateValue) {
      return null;
    }

    try {
      // If already a date string in ISO format
      if (typeof dateValue === 'string' && dateValue.includes('T')) {
        return dateValue;
      }

      // Try to parse
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    } catch (error) {
      // Ignore parse errors
    }

    return null;
  }

  /**
   * Normalize number values
   * @private
   */
  _normalizeNumber(value, defaultValue = 0) {
    if (value === null || value === undefined) {
      return defaultValue;
    }

    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  }

  /**
   * Build normalized cache key
   * @private
   */
  _buildNormalizedKey(adapterName, adapterData) {
    let key = adapterName;

    // Use adapter-specific ID field
    if (adapterData.id) {
      key += `:${adapterData.id}`;
    } else if (adapterData.videoId) {
      key += `:${adapterData.videoId}`;
    } else if (adapterData.url) {
      // For HTML sources, use URL hash
      key += `:${this._hashString(adapterData.url)}`;
    } else {
      key += ':unknown';
    }

    // Append resolution if present (for cache variation)
    if (adapterData.selectedResolution) {
      key += `@${adapterData.selectedResolution}`;
    }

    return key;
  }

  /**
   * Simple hash function for URLs
   * @private
   */
  _hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Calculate cache expiry time (default 7 days)
   * @private
   */
  _calculateExpiry(days = 7) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString();
  }

  /**
   * Get schema version
   */
  getSchemaVersion() {
    return schema.version;
  }

  /**
   * Get schema
   */
  getSchema() {
    return schema;
  }
}

module.exports = MetadataNormalizer;
