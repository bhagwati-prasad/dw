/**
 * BaseAdapter
 * 
 * Abstract base class for all adapters.
 * Provides common utilities, error handling, logging, and response formatting.
 */

class AdapterError extends Error {
  constructor(message, code = 'ADAPTER_ERROR', details = {}) {
    super(message);
    this.name = 'AdapterError';
    this.code = code;
    this.details = details;
  }
}

class BaseAdapter {
  /**
   * Static properties that subclasses must override
   */
  static adapterName = 'base-adapter';
  static priority = 999; // Lower = higher priority

  constructor(config = {}) {
    this.config = config;
    this.name = this.constructor.adapterName;
    this.priority = this.constructor.priority;
    this.logger = config.logger || console;
    this.progressCallback = null;
    this.initialized = false;
  }

  /**
   * Initialize adapter with configuration
   * Called during adapter registration
   */
  async init(config) {
    this.config = config;
    this.initialized = true;
    this.logger.info(`[${this.name}] Initialized`);
  }

  /**
   * Shutdown adapter
   * Called when adapter is unloaded
   */
  async shutdown() {
    this.initialized = false;
    this.logger.info(`[${this.name}] Shutdown`);
  }

  /**
   * Detect if this adapter can handle a URL
   * Must be implemented by subclass
   */
  async detectURL(url) {
    throw new Error(`${this.name} must implement detectURL()`);
  }

  /**
   * Parse URL and return metadata
   * Must be implemented by subclass
   */
  async parseURL(url) {
    throw new Error(`${this.name} must implement parseURL()`);
  }

  /**
   * Get available resolutions for URL
   * Must be implemented by subclass
   */
  async getResolutions(url) {
    throw new Error(`${this.name} must implement getResolutions()`);
  }

  /**
   * Download media from URL
   * Must be implemented by subclass
   */
  async download(sourceUrl, resolution, format, outputPath) {
    throw new Error(`${this.name} must implement download()`);
  }

  /**
   * Execute async function with exponential backoff retry
   */
  async retryWithBackoff(asyncFn, maxRetries = 3, baseDelay = 1000) {
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await asyncFn();
      } catch (error) {
        lastError = error;

        // Don't retry on non-transient errors
        if (!this._isTransientError(error)) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === maxRetries - 1) {
          throw error;
        }

        // Exponential backoff
        const delay = baseDelay * Math.pow(2, attempt);
        this.logger.warn(
          `[${this.name}] Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${delay}ms: ${error.message}`
        );
        await this._delay(delay);
      }
    }

    throw lastError;
  }

  /**
   * Normalize adapter output to standard schema
   */
  normalizeMetadata(adapterData) {
    return {
      id: adapterData.id || null,
      sourceUrl: adapterData.sourceUrl || null,
      normalizedKey: adapterData.normalizedKey || null,
      adapterName: this.name,
      sourceType: adapterData.sourceType || 'video',
      title: adapterData.title || 'Unknown',
      duration: adapterData.duration || 0,
      description: adapterData.description || null,
      thumbnailUrl: adapterData.thumbnailUrl || null,
      authorName: adapterData.authorName || null,
      authorUrl: adapterData.authorUrl || null,
      uploadDate: adapterData.uploadDate || new Date().toISOString(),
      resolutions: adapterData.resolutions || [],
      formatOptions: adapterData.formatOptions || [],
      adapterMetadata: adapterData.adapterMetadata || {},
      parsedAt: new Date().toISOString(),
      expiresAt: this._calculateExpiry()
    };
  }

  /**
   * Format error response
   */
  errorResponse(error, code = 'ADAPTER_ERROR') {
    const err = error instanceof AdapterError
      ? error
      : new AdapterError(error.message, code);

    this.logger.error(`[${this.name}] Error: ${err.message} (${err.code})`);

    return {
      error: {
        name: err.name,
        message: err.message,
        code: err.code,
        details: err.details,
        adapter: this.name
      }
    };
  }

  /**
   * Format success response
   */
  successResponse(data) {
    return {
      adapter: this.name,
      ...data
    };
  }

  /**
   * Validate configuration
   */
  validateConfig(requiredFields = []) {
    const missing = requiredFields.filter(field => !this.config[field]);
    if (missing.length > 0) {
      throw new AdapterError(
        `Missing required config: ${missing.join(', ')}`,
        'INVALID_CONFIG',
        { missing }
      );
    }
  }

  /**
   * Get config value with environment variable expansion
   */
  getConfigValue(key, defaultValue = null) {
    let value = this.config[key];

    if (value && typeof value === 'string' && value.startsWith('${')) {
      // Expand environment variable: ${ENV_VAR}
      const envVar = value.slice(2, -1);
      value = process.env[envVar] || defaultValue;
    }

    return value !== undefined ? value : defaultValue;
  }

  /**
   * Emit progress event for long-running operations
   */
  emitProgress(event) {
    if (this.progressCallback) {
      this.progressCallback({
        adapter: this.name,
        timestamp: Date.now(),
        ...event
      });
    }
  }

  /**
   * Set progress callback
   */
  setProgressCallback(callback) {
    this.progressCallback = callback;
  }

  /**
   * Check if error is transient and should be retried
   * @private
   */
  _isTransientError(error) {
    // Network errors
    if (error.code === 'ECONNREFUSED' ||
        error.code === 'ECONNRESET' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ENOTFOUND') {
      return true;
    }

    // HTTP status codes that indicate transient errors
    if (error.statusCode) {
      const statusCode = error.statusCode;
      // 429 = Too Many Requests
      // 500 = Internal Server Error
      // 503 = Service Unavailable
      // 504 = Gateway Timeout
      return [429, 500, 502, 503, 504].includes(statusCode);
    }

    // AdapterError with rate limit code
    if (error instanceof AdapterError && error.code === 'RATE_LIMITED') {
      return true;
    }

    return false;
  }

  /**
   * Delay for specified milliseconds
   * @private
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Calculate cache expiry (default: 7 days)
   * @private
   */
  _calculateExpiry(days = 7) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString();
  }

  /**
   * Log message
   */
  log(level, message, data = {}) {
    const logEntry = `[${this.name}] ${message}`;
    if (this.logger[level]) {
      this.logger[level](logEntry, data);
    }
  }
}

module.exports = {
  BaseAdapter,
  AdapterError
};
