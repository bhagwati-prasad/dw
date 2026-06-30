/**
 * Normalized Cache Storage
 * 
 * Wraps cache storage to ensure all metadata is stored in normalized format.
 * Provides migration support for existing cache entries.
 */

const fs = require('fs');
const path = require('path');
const storage = require('./storage');
const MetadataNormalizer = require('./adapters/normalizer');

class NormalizedCacheStorage {
  constructor(logger = console) {
    this.logger = logger;
    this.normalizer = new MetadataNormalizer(logger);
  }

  /**
   * Get cached metadata, ensuring it's in normalized format
   */
  getMetadata(normalizedKey) {
    try {
      const cached = storage.getCachedEntry(normalizedKey);

      if (!cached) {
        return null;
      }

      // Check if already normalized
      if (this._isNormalized(cached)) {
        return cached;
      }

      // Migrate old format to normalized
      this.logger.info(`Migrating cache entry ${normalizedKey} to normalized format`);
      const normalized = this._migrateOldFormat(cached);
      
      // Save migrated version
      storage.saveCachedEntry(normalizedKey, normalized);
      
      return normalized;
    } catch (error) {
      this.logger.error(`Error retrieving cached metadata: ${error.message}`);
      return null;
    }
  }

  /**
   * Save metadata in normalized format
   */
  saveMetadata(normalizedKey, metadata, adapterName) {
    try {
      // Normalize if not already normalized
      let normalized;
      if (this._isNormalized(metadata)) {
        normalized = metadata;
      } else {
        normalized = this.normalizer.normalize(metadata, adapterName);
        if (normalized.error) {
          throw new Error(`Normalization failed: ${normalized.error.message}`);
        }
      }

      // Ensure normalized key matches
      normalized.normalizedKey = normalizedKey;

      // Save to cache
      const cachePath = storage.saveCachedEntry(normalizedKey, normalized);
      
      this.logger.debug(`Cached metadata: ${normalizedKey}`);
      return normalized;
    } catch (error) {
      this.logger.error(`Error saving metadata to cache: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get cached batch of metadata
   */
  getMetadataBatch(normalizedKeys) {
    const results = [];

    for (const key of normalizedKeys) {
      const metadata = this.getMetadata(key);
      if (metadata) {
        results.push(metadata);
      }
    }

    return results;
  }

  /**
   * Clear expired cache entries
   */
  clearExpired() {
    const cacheDir = path.join(__dirname, '..', 'data', 'cache');
    
    if (!fs.existsSync(cacheDir)) {
      return 0;
    }

    let clearedCount = 0;
    const files = fs.readdirSync(cacheDir);

    for (const file of files) {
      try {
        const filePath = path.join(cacheDir, file);
        const metadata = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        if (this._isExpired(metadata)) {
          fs.unlinkSync(filePath);
          clearedCount++;
          this.logger.debug(`Removed expired cache entry: ${file}`);
        }
      } catch (error) {
        this.logger.warn(`Error checking cache entry ${file}: ${error.message}`);
      }
    }

    return clearedCount;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const cacheDir = path.join(__dirname, '..', 'data', 'cache');
    
    if (!fs.existsSync(cacheDir)) {
      return {
        total: 0,
        expired: 0,
        size: 0
      };
    }

    let total = 0;
    let expired = 0;
    let size = 0;

    const files = fs.readdirSync(cacheDir);

    for (const file of files) {
      try {
        const filePath = path.join(cacheDir, file);
        const stats = fs.statSync(filePath);
        size += stats.size;
        total++;

        const metadata = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (this._isExpired(metadata)) {
          expired++;
        }
      } catch (error) {
        // Ignore stat errors
      }
    }

    return {
      total,
      expired,
      size,
      sizeInMB: (size / (1024 * 1024)).toFixed(2)
    };
  }

  /**
   * Update history entry to use normalized format
   */
  appendHistoryEntry(entry, adapterName) {
    try {
      // Normalize history entry
      const normalized = {
        id: entry.id || this._generateId(),
        sourceUrl: entry.sourceUrl,
        adapterName,
        sourceType: entry.sourceType || 'video',
        title: entry.title,
        selectedResolution: entry.selectedResolution,
        selectedFormat: entry.selectedFormat,
        status: entry.status,
        startedAt: entry.startedAt || new Date().toISOString(),
        completedAt: entry.completedAt || null,
        outputPath: entry.outputPath,
        adapterMetadata: entry.adapterMetadata || {},
        errorMessage: entry.errorMessage || null,
        fileSize: entry.fileSize || 0,
        downloadDuration: entry.downloadDuration || 0
      };

      return storage.appendHistory(normalized);
    } catch (error) {
      this.logger.error(`Error appending history: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update queue entry to use normalized format
   */
  updateQueueEntry(queueItem, adapterName) {
    try {
      const normalized = {
        id: queueItem.id || this._generateId(),
        sourceUrl: queueItem.sourceUrl,
        adapterName,
        sourceType: queueItem.sourceType || 'video',
        title: queueItem.title,
        selectedResolution: queueItem.selectedResolution,
        selectedFormat: queueItem.selectedFormat,
        status: queueItem.status || 'queued',
        createdAt: queueItem.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        attempts: queueItem.attempts || 0,
        adapterMetadata: queueItem.adapterMetadata || {},
        errorMessage: queueItem.errorMessage || null
      };

      return normalized;
    } catch (error) {
      this.logger.error(`Error updating queue entry: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if metadata is in normalized format
   * @private
   */
  _isNormalized(metadata) {
    if (!metadata || typeof metadata !== 'object') {
      return false;
    }

    // Check for required normalized fields
    const requiredFields = ['id', 'sourceUrl', 'normalizedKey', 'adapterName', 'sourceType', 'title'];
    return requiredFields.every(field => field in metadata);
  }

  /**
   * Migrate old cache format to normalized format
   * @private
   */
  _migrateOldFormat(oldData) {
    // Old format detection
    if (!this._isNormalized(oldData)) {
      // Try to infer adapter from data structure
      let adapterName = 'unknown';
      
      if (oldData.videoId) adapterName = 'youtube';
      if (oldData.user_name) adapterName = 'vimeo';
      if (oldData.owner_screenname) adapterName = 'dailymotion';

      // Normalize using inferred adapter
      const normalized = this.normalizer.normalize(oldData, adapterName);
      
      if (!normalized.error) {
        this.logger.info(`Successfully migrated cache entry to normalized format (adapter: ${adapterName})`);
        return normalized;
      }
    }

    return oldData;
  }

  /**
   * Check if metadata has expired
   * @private
   */
  _isExpired(metadata) {
    if (!metadata || !metadata.expiresAt) {
      return false;
    }

    try {
      const expiryDate = new Date(metadata.expiresAt);
      return expiryDate < new Date();
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate unique ID
   * @private
   */
  _generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Run migration on existing cache
   */
  runMigration() {
    const cacheDir = path.join(__dirname, '..', 'data', 'cache');
    
    if (!fs.existsSync(cacheDir)) {
      this.logger.info('No cache directory found, skipping migration');
      return { migrated: 0, failed: 0 };
    }

    let migrated = 0;
    let failed = 0;
    const files = fs.readdirSync(cacheDir);

    this.logger.info(`Starting cache migration for ${files.length} entries...`);

    for (const file of files) {
      try {
        const filePath = path.join(cacheDir, file);
        const oldData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        if (!this._isNormalized(oldData)) {
          const normalized = this._migrateOldFormat(oldData);
          fs.writeFileSync(filePath, JSON.stringify(normalized, null, 2));
          migrated++;
          this.logger.debug(`Migrated cache entry: ${file}`);
        }
      } catch (error) {
        failed++;
        this.logger.error(`Failed to migrate cache entry ${file}: ${error.message}`);
      }
    }

    this.logger.info(`Cache migration complete: ${migrated} migrated, ${failed} failed`);

    return { migrated, failed, total: files.length };
  }

  /**
   * Validate all cache entries against schema
   */
  validateCache() {
    const cacheDir = path.join(__dirname, '..', 'data', 'cache');
    
    if (!fs.existsSync(cacheDir)) {
      return { total: 0, valid: 0, invalid: 0, errors: [] };
    }

    let valid = 0;
    let invalid = 0;
    const errors = [];
    const files = fs.readdirSync(cacheDir);

    for (const file of files) {
      try {
        const filePath = path.join(cacheDir, file);
        const metadata = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        const validation = this.normalizer.validate(metadata);
        if (validation.valid) {
          valid++;
        } else {
          invalid++;
          errors.push({
            file,
            errors: validation.errors
          });
        }
      } catch (error) {
        invalid++;
        errors.push({
          file,
          error: error.message
        });
      }
    }

    return {
      total: files.length,
      valid,
      invalid,
      errors
    };
  }
}

module.exports = NormalizedCacheStorage;
