/**
 * URL Detection System
 * 
 * Provides URL pattern matching and detection for different adapter types.
 * Supports multiple detection strategies: regex, domain-based, and API probing.
 */

const url = require('url');

class URLDetector {
  constructor(logger = console) {
    this.logger = logger;
    this.patterns = new Map();
    this.detectors = new Map();
    this._initializeDefaultPatterns();
  }

  /**
   * Initialize default URL patterns for common platforms
   * @private
   */
  _initializeDefaultPatterns() {
    // YouTube patterns
    this.registerPattern('youtube', {
      regex: [
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=[\w-]+/i,
        /(?:https?:\/\/)?(?:www\.)?youtu\.be\/[\w-]+/i,
        /(?:https?:\/\/)?(?:m\.)?youtube\.com\/watch\?v=[\w-]+/i,
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/playlist\?list=[\w-]+/i,
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/@[\w-]+/i,
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/channel\/[\w-]+/i,
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/c\/[\w-]+/i,
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/[\w-]+/i
      ],
      domain: ['youtube.com', 'youtu.be', 'm.youtube.com'],
      priority: 1
    });

    // Vimeo patterns
    this.registerPattern('vimeo', {
      regex: [
        /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/[\d]+/i,
        /(?:https?:\/\/)?vimeo\.com\/channels\/[\w-]+\/([\d]+)/i,
        /(?:https?:\/\/)?vimeo\.com\/groups\/[\w-]+\/videos\/([\d]+)/i,
        /(?:https?:\/\/)?player\.vimeo\.com\/video\/[\d]+/i
      ],
      domain: ['vimeo.com', 'player.vimeo.com'],
      priority: 2
    });

    // Dailymotion patterns
    this.registerPattern('dailymotion', {
      regex: [
        /(?:https?:\/\/)?(?:www\.)?dailymotion\.com\/video\/([\w-]+)/i,
        /(?:https?:\/\/)?dai\.ly\/([\w-]+)/i
      ],
      domain: ['dailymotion.com', 'dai.ly'],
      priority: 3
    });

    // Generic HTTP(S) URL (fallback)
    this.registerPattern('html', {
      regex: [
        /^https?:\/\//i
      ],
      domain: [],
      priority: 999 // Lowest priority - catch-all
    });
  }

  /**
   * Register a URL pattern for an adapter
   */
  registerPattern(adapterName, patternConfig) {
    const { regex = [], domain = [], priority = 100 } = patternConfig;

    this.patterns.set(adapterName, {
      adapterName,
      regex: Array.isArray(regex) ? regex : [regex],
      domain: Array.isArray(domain) ? domain : [domain],
      priority
    });
  }

  /**
   * Register a custom detection function for an adapter
   * Useful for complex detection logic beyond regex patterns
   */
  registerDetector(adapterName, detectorFn) {
    this.detectors.set(adapterName, detectorFn);
  }

  /**
   * Detect URL using regex and domain patterns
   */
  detectByPattern(inputUrl) {
    const results = [];

    for (const [adapterName, pattern] of this.patterns) {
      // Check regex patterns
      for (const regexPattern of pattern.regex) {
        if (regexPattern.test(inputUrl)) {
          const sourceType = this._classifyURL(inputUrl, adapterName);
          results.push({
            adapterName,
            confidence: 0.95,
            sourceType,
            method: 'regex'
          });
          break; // Move to next adapter
        }
      }

      // Check domain patterns
      if (results.length === 0 || results[results.length - 1].adapterName !== adapterName) {
        try {
          const parsedUrl = new url.URL(inputUrl);
          for (const domain of pattern.domain) {
            if (parsedUrl.hostname === domain || parsedUrl.hostname === `www.${domain}`) {
              const sourceType = this._classifyURL(inputUrl, adapterName);
              results.push({
                adapterName,
                confidence: 0.90,
                sourceType,
                method: 'domain'
              });
              break;
            }
          }
        } catch (error) {
          // Invalid URL format, skip domain check
        }
      }
    }

    // Sort by priority (lower priority number = higher priority)
    results.sort((a, b) => {
      const priorityA = this.patterns.get(a.adapterName)?.priority || 100;
      const priorityB = this.patterns.get(b.adapterName)?.priority || 100;
      return priorityA - priorityB;
    });

    return results;
  }

  /**
   * Detect URL using custom detector functions
   * Can perform async checks like API probing
   */
  async detectByCustomDetector(inputUrl) {
    const results = [];

    for (const [adapterName, detectorFn] of this.detectors) {
      try {
        const detection = await detectorFn(inputUrl);
        if (detection && detection.canHandle) {
          results.push({
            adapterName,
            confidence: detection.confidence || 0.8,
            sourceType: detection.sourceType || 'video',
            method: 'custom'
          });
        }
      } catch (error) {
        this.logger.debug(`Custom detector ${adapterName} failed: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Classify URL type (video, playlist, channel, etc.)
   * @private
   */
  _classifyURL(inputUrl, adapterName) {
    try {
      // YouTube
      if (adapterName === 'youtube') {
        if (/playlist\?list=/i.test(inputUrl)) return 'playlist';
        if (/\/channel\//i.test(inputUrl) || /\/@/i.test(inputUrl)) return 'channel';
        if (/\/shorts\//i.test(inputUrl)) return 'short';
        return 'video';
      }

      // Vimeo
      if (adapterName === 'vimeo') {
        if (/\/channels\//i.test(inputUrl)) return 'channel';
        if (/\/groups\//i.test(inputUrl)) return 'group';
        return 'video';
      }

      // Dailymotion
      if (adapterName === 'dailymotion') {
        if (/\/playlist\//i.test(inputUrl)) return 'playlist';
        return 'video';
      }

      // Default
      return 'video';
    } catch (error) {
      this.logger.debug(`Error classifying URL: ${error.message}`);
      return 'video';
    }
  }

  /**
   * Detect adapter for URL using all available methods
   * Returns best match or null if no adapter found
   */
  async detect(inputUrl, options = {}) {
    const { useCustomDetectors = true, maxResults = 5 } = options;

    // Validate URL format
    if (!inputUrl || typeof inputUrl !== 'string') {
      return {
        success: false,
        error: 'Invalid URL format',
        results: []
      };
    }

    // Normalize URL
    const normalizedUrl = this._normalizeURL(inputUrl);

    // Try pattern-based detection first (fast)
    let results = this.detectByPattern(normalizedUrl);

    // Try custom detectors if enabled (can be slower)
    if (useCustomDetectors && results.length === 0) {
      const customResults = await this.detectByCustomDetector(normalizedUrl);
      results = results.concat(customResults);
    }

    // Sort by confidence (highest first)
    results.sort((a, b) => b.confidence - a.confidence);

    // Limit results
    results = results.slice(0, maxResults);

    if (results.length === 0) {
      return {
        success: false,
        error: 'No adapter found for URL',
        results: [],
        url: normalizedUrl
      };
    }

    return {
      success: true,
      primary: results[0],
      alternates: results.slice(1),
      url: normalizedUrl
    };
  }

  /**
   * Normalize URL for consistent detection
   * @private
   */
  _normalizeURL(inputUrl) {
    let normalized = inputUrl.trim();

    // Add protocol if missing
    if (!/^https?:\/\//.test(normalized)) {
      normalized = 'https://' + normalized;
    }

    // Remove fragment and query parameters for matching (keep for YouTube watch?v=)
    try {
      const parsedUrl = new url.URL(normalized);
      // Keep query params and fragments as they may contain important info
      return normalized;
    } catch (error) {
      return normalized;
    }
  }

  /**
   * Handle shortened URLs (like bit.ly, tinyurl, etc.)
   * Returns the expanded URL or original if expansion fails
   */
  async expandShortenedURL(shortUrl) {
    try {
      // This would require following HTTP redirects
      // For now, just return the original URL
      // In production, use a library like 'unshorten' or 'expand-url'
      this.logger.warn('URL shortening expansion not yet implemented');
      return shortUrl;
    } catch (error) {
      this.logger.error(`Error expanding URL: ${error.message}`);
      return shortUrl;
    }
  }

  /**
   * Get all registered patterns
   */
  getPatterns() {
    return Array.from(this.patterns.entries()).map(([name, config]) => ({
      adapterName: name,
      priority: config.priority,
      regexCount: config.regex.length,
      domainCount: config.domain.length
    }));
  }

  /**
   * Get detection stats
   */
  getStats() {
    return {
      totalPatterns: this.patterns.size,
      totalDetectors: this.detectors.size,
      patterns: this.getPatterns()
    };
  }
}

module.exports = URLDetector;
