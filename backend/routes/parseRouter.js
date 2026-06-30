/**
 * Parse Request Router
 * 
 * Routes incoming parse requests to appropriate adapters.
 * Handles URL detection, adapter delegation, normalization, and fallback logic.
 */

const { AdapterError } = require('./BaseAdapter');
const URLDetector = require('./detector');

class ParseRouter {
  constructor(adapterRegistry, logger = console) {
    this.registry = adapterRegistry;
    this.logger = logger;
    this.detector = new URLDetector(logger);
    this._configureDetector();
  }

  /**
   * Configure detector with custom functions for each adapter
   * @private
   */
  _configureDetector() {
    // Register custom detectors for adapters that have them
    for (const adapter of this.registry.adapters.values()) {
      if (typeof adapter.detectURL === 'function') {
        this.detector.registerDetector(adapter.name, async (url) => {
          try {
            const result = await adapter.detectURL(url);
            return {
              canHandle: result.canHandle,
              confidence: result.confidence,
              sourceType: result.sourceType
            };
          } catch (error) {
            return null;
          }
        });
      }
    }
  }

  /**
   * Parse single URL
   */
  async parseSingle(url) {
    try {
      // Detect adapter
      const detection = await this.detector.detect(url);

      if (!detection.success) {
        return this._errorResponse(
          `No adapter found for URL: ${url}`,
          'NO_ADAPTER_FOUND',
          404
        );
      }

      const { adapterName, sourceType, confidence } = detection.primary;

      // Get adapter
      let adapter;
      try {
        adapter = this.registry.getAdapterByName(adapterName);
      } catch (error) {
        return this._errorResponse(
          `Adapter not available: ${adapterName}`,
          'ADAPTER_NOT_AVAILABLE',
          503
        );
      }

      // Parse URL
      const result = await adapter.parseURL(url);

      if (result.error) {
        // Try fallback to generic HTML adapter if primary fails
        if (adapterName !== 'html') {
          this.logger.warn(
            `Primary adapter ${adapterName} failed, trying HTML fallback`
          );
          return await this._parseSingleWithFallback(url);
        }

        return this._errorResponse(
          result.error.message,
          result.error.code || 'PARSE_FAILED',
          400
        );
      }

      // Normalize metadata if not already normalized
      const metadata = this._ensureNormalized(result.metadata, adapter);

      return this._successResponse(
        {
          metadata,
          detection: {
            adapter: adapterName,
            sourceType,
            confidence
          }
        },
        200
      );
    } catch (error) {
      this.logger.error(`Parse single error: ${error.message}`);
      return this._errorResponse(
        error.message,
        'PARSE_ERROR',
        500
      );
    }
  }

  /**
   * Parse single URL with fallback to generic HTML adapter
   * @private
   */
  async _parseSingleWithFallback(url) {
    try {
      const adapter = this.registry.getAdapterByName('html');
      const result = await adapter.parseURL(url);

      if (result.error) {
        return this._errorResponse(
          `Failed to parse URL with HTML adapter: ${result.error.message}`,
          'PARSE_FAILED',
          400
        );
      }

      const metadata = this._ensureNormalized(result.metadata, adapter);

      return this._successResponse(
        {
          metadata,
          detection: {
            adapter: 'html',
            sourceType: 'unknown',
            confidence: 0.5,
            fallback: true
          }
        },
        200
      );
    } catch (error) {
      this.logger.error(`HTML adapter fallback failed: ${error.message}`);
      return this._errorResponse(
        'Failed to parse URL with any available adapter',
        'PARSE_FAILED',
        400
      );
    }
  }

  /**
   * Parse creator/channel reference
   */
  async parseCreator(creatorInput) {
    try {
      // Try to detect as URL first
      const detection = await this.detector.detect(creatorInput);

      let adapter;
      let detectedUrl = creatorInput;

      if (detection.success) {
        const { adapterName } = detection.primary;
        adapter = this.registry.getAdapterByName(adapterName);
        detectedUrl = detection.url;
      } else {
        // If not a valid URL, treat as search term or identifier
        // Try YouTube first (most common creator platform)
        adapter = this.registry.getAdapterByName('youtube');
      }

      // Parse as creator/channel
      const result = await adapter.parseURL(detectedUrl);

      if (result.error) {
        return this._errorResponse(
          result.error.message,
          result.error.code || 'PARSE_FAILED',
          400
        );
      }

      // Ensure it returns an array (multiple videos from creator)
      const metadata = Array.isArray(result.metadata)
        ? result.metadata.map(m => this._ensureNormalized(m, adapter))
        : [this._ensureNormalized(result.metadata, adapter)];

      return this._successResponse(
        {
          metadata,
          type: 'creator',
          itemCount: metadata.length
        },
        200
      );
    } catch (error) {
      this.logger.error(`Parse creator error: ${error.message}`);
      return this._errorResponse(
        error.message,
        'PARSE_ERROR',
        500
      );
    }
  }

  /**
   * Parse batch of URLs
   */
  async parseBatch(urls) {
    if (!Array.isArray(urls) || urls.length === 0) {
      return this._errorResponse(
        'Batch must contain at least one URL',
        'INVALID_BATCH',
        400
      );
    }

    if (urls.length > 100) {
      return this._errorResponse(
        'Batch size limited to 100 URLs',
        'BATCH_TOO_LARGE',
        400
      );
    }

    // Parse each URL
    const results = [];
    const errors = [];

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];

      try {
        const result = await this.parseSingle(url);

        if (result.success) {
          results.push({
            index: i,
            url,
            metadata: result.data.metadata,
            detection: result.data.detection
          });
        } else {
          errors.push({
            index: i,
            url,
            error: result.error
          });
        }
      } catch (error) {
        errors.push({
          index: i,
          url,
          error: {
            message: error.message,
            code: 'PARSE_ERROR'
          }
        });
      }
    }

    return this._successResponse(
      {
        metadata: results.map(r => r.metadata),
        results: {
          successful: results.length,
          failed: errors.length,
          total: urls.length,
          items: results,
          errors
        },
        type: 'batch'
      },
      errors.length > 0 ? 206 : 200 // 206 Partial Content if some failed
    );
  }

  /**
   * Get resolutions for URL
   */
  async getResolutions(url) {
    try {
      // Detect adapter
      const detection = await this.detector.detect(url);

      if (!detection.success) {
        return this._errorResponse(
          `No adapter found for URL: ${url}`,
          'NO_ADAPTER_FOUND',
          404
        );
      }

      const { adapterName } = detection.primary;

      // Get adapter
      const adapter = this.registry.getAdapterByName(adapterName);

      // Get resolutions
      const result = await adapter.getResolutions(url);

      if (result.error) {
        return this._errorResponse(
          result.error.message,
          result.error.code || 'RESOLUTION_FETCH_FAILED',
          400
        );
      }

      // Ensure resolutions are normalized
      const resolutions = Array.isArray(result.resolutions)
        ? result.resolutions.map(r => this._normalizeResolution(r))
        : [];

      // Sort by quality (highest first)
      resolutions.sort((a, b) => {
        const qualityA = (b.width || 0) * (b.fps || 1);
        const qualityB = (a.width || 0) * (a.fps || 1);
        return qualityA - qualityB;
      });

      // Mark best as recommended
      if (resolutions.length > 0) {
        resolutions[0].isRecommended = true;
      }

      return this._successResponse(
        {
          resolutions,
          adapter: adapterName,
          count: resolutions.length
        },
        200
      );
    } catch (error) {
      this.logger.error(`Get resolutions error: ${error.message}`);
      return this._errorResponse(
        error.message,
        'RESOLUTION_FETCH_FAILED',
        500
      );
    }
  }

  /**
   * Ensure metadata is in normalized format
   * @private
   */
  _ensureNormalized(metadata, adapter) {
    if (!metadata) {
      return null;
    }

    // If already normalized (has normalizedKey), return as-is
    if (metadata.normalizedKey) {
      return metadata;
    }

    // Otherwise normalize using adapter's method
    if (typeof adapter.normalizeMetadata === 'function') {
      return adapter.normalizeMetadata(metadata);
    }

    // Fallback normalization
    return {
      ...metadata,
      adapterName: adapter.name,
      normalizedKey: metadata.id || 'unknown'
    };
  }

  /**
   * Normalize resolution object
   * @private
   */
  _normalizeResolution(resolution) {
    return {
      format: resolution.format || 'mp4',
      codec: resolution.codec || 'unknown',
      width: resolution.width || 0,
      height: resolution.height || 0,
      bitrate: resolution.bitrate || 'unknown',
      fps: resolution.fps || 0,
      fileSize: resolution.fileSize || 0,
      isRecommended: resolution.isRecommended || false
    };
  }

  /**
   * Format success response
   * @private
   */
  _successResponse(data, statusCode = 200) {
    return {
      success: true,
      statusCode,
      data,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Format error response
   * @private
   */
  _errorResponse(message, code = 'UNKNOWN_ERROR', statusCode = 500) {
    return {
      success: false,
      statusCode,
      error: {
        message,
        code
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get router stats
   */
  getStats() {
    return {
      detector: this.detector.getStats(),
      adapters: this.registry.getStats()
    };
  }
}

module.exports = ParseRouter;
