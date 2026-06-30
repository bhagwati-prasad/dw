/**
 * Adapter Registry
 * 
 * Manages loading, registration, and detection of adapters.
 * Handles adapter lifecycle and routes requests to appropriate adapters.
 */

const path = require('path');
const fs = require('fs');
const { AdapterError } = require('./BaseAdapter');

class AdapterRegistry {
  constructor(logger = console) {
    this.logger = logger;
    this.adapters = new Map(); // name -> adapter instance
    this.adapterConfigs = new Map(); // name -> config
  }

  /**
   * Initialize registry with configuration
   */
  async init(configs = []) {
    this.logger.info('Initializing adapter registry...');

    for (const config of configs) {
      try {
        await this.registerAdapter(config);
      } catch (error) {
        this.logger.error(`Failed to register adapter ${config.name}:`, error.message);
      }
    }

    this.logger.info(`Registry initialized with ${this.adapters.size} adapters`);
  }

  /**
   * Register an adapter
   */
  async registerAdapter(config) {
    const { name, enabled = true, priority = 999, ...adapterConfig } = config;

    if (!enabled) {
      this.logger.info(`Adapter ${name} is disabled, skipping registration`);
      return;
    }

    if (!name) {
      throw new Error('Adapter config must have a name');
    }

    // Check if already registered
    if (this.adapters.has(name)) {
      this.logger.warn(`Adapter ${name} already registered, replacing...`);
    }

    try {
      // Dynamically load adapter module
      const adapterPath = path.join(__dirname, `${name}Adapter.js`);
      
      if (!fs.existsSync(adapterPath)) {
        throw new Error(`Adapter module not found: ${adapterPath}`);
      }

      const AdapterClass = require(adapterPath);

      // Create adapter instance
      const adapter = new AdapterClass({
        ...adapterConfig,
        logger: this.logger
      });

      // Store config with priority
      const configWithPriority = {
        name,
        enabled: true,
        priority,
        ...adapterConfig
      };

      this.adapterConfigs.set(name, configWithPriority);

      // Initialize adapter
      await adapter.init(configWithPriority);

      // Register adapter
      this.adapters.set(name, adapter);

      this.logger.info(`Adapter registered: ${name} (priority: ${priority})`);
    } catch (error) {
      throw new AdapterError(
        `Failed to register adapter ${name}: ${error.message}`,
        'ADAPTER_REGISTRATION_FAILED',
        { adapter: name, originalError: error.message }
      );
    }
  }

  /**
   * Get adapter by name
   */
  getAdapterByName(name) {
    const adapter = this.adapters.get(name);
    if (!adapter) {
      throw new AdapterError(
        `Adapter not found: ${name}`,
        'ADAPTER_NOT_FOUND',
        { adapter: name }
      );
    }
    return adapter;
  }

  /**
   * Detect which adapter should handle a URL
   * Returns adapter with highest confidence
   */
  async detectAdapter(url) {
    const results = [];

    // Get all enabled adapters sorted by priority
    const sortedAdapters = Array.from(this.adapters.values())
      .sort((a, b) => a.priority - b.priority);

    for (const adapter of sortedAdapters) {
      try {
        const detection = await adapter.detectURL(url);

        if (detection.canHandle) {
          results.push({
            adapter,
            ...detection
          });
        }
      } catch (error) {
        this.logger.warn(
          `Error detecting URL in adapter ${adapter.name}: ${error.message}`
        );
      }
    }

    // Sort by confidence (highest first)
    results.sort((a, b) => b.confidence - a.confidence);

    if (results.length === 0) {
      throw new AdapterError(
        `No adapter found for URL: ${url}`,
        'NO_ADAPTER_FOUND',
        { url }
      );
    }

    const result = results[0];
    this.logger.debug(
      `Detected URL with ${result.adapter.name} (confidence: ${result.confidence}, type: ${result.sourceType})`
    );

    return {
      adapter: result.adapter,
      sourceType: result.sourceType,
      confidence: result.confidence
    };
  }

  /**
   * Parse URL using appropriate adapter
   */
  async parse(url) {
    try {
      const { adapter } = await this.detectAdapter(url);
      const result = await adapter.parseURL(url);

      if (result.error) {
        return {
          success: false,
          error: result.error,
          adapter: adapter.name
        };
      }

      return {
        success: true,
        metadata: result.metadata,
        adapter: adapter.name
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof AdapterError
          ? error
          : new AdapterError(error.message, 'PARSE_FAILED'),
        adapter: 'unknown'
      };
    }
  }

  /**
   * Get resolutions for URL using appropriate adapter
   */
  async getResolutions(url) {
    try {
      const { adapter } = await this.detectAdapter(url);
      const result = await adapter.getResolutions(url);

      if (result.error) {
        return {
          success: false,
          error: result.error,
          adapter: adapter.name
        };
      }

      return {
        success: true,
        resolutions: result.resolutions,
        adapter: adapter.name
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof AdapterError
          ? error
          : new AdapterError(error.message, 'RESOLUTION_FETCH_FAILED'),
        adapter: 'unknown'
      };
    }
  }

  /**
   * Download using specific adapter
   */
  async download(adapterName, sourceUrl, resolution, format, outputPath) {
    try {
      const adapter = this.getAdapterByName(adapterName);
      const result = await adapter.download(sourceUrl, resolution, format, outputPath);

      if (result.error) {
        return {
          success: false,
          error: result.error,
          adapter: adapter.name
        };
      }

      return {
        success: true,
        filePath: result.filePath,
        metadata: result.metadata,
        adapter: adapter.name
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof AdapterError
          ? error
          : new AdapterError(error.message, 'DOWNLOAD_FAILED'),
        adapter: adapterName
      };
    }
  }

  /**
   * Get list of all registered adapters
   */
  listAdapters() {
    return Array.from(this.adapters.entries()).map(([name, adapter]) => ({
      name,
      priority: adapter.priority,
      config: this.adapterConfigs.get(name)
    }));
  }

  /**
   * Shutdown all adapters
   */
  async shutdown() {
    this.logger.info('Shutting down adapter registry...');

    for (const [name, adapter] of this.adapters) {
      try {
        await adapter.shutdown();
      } catch (error) {
        this.logger.error(`Error shutting down adapter ${name}:`, error.message);
      }
    }

    this.adapters.clear();
    this.adapterConfigs.clear();
    this.logger.info('Adapter registry shutdown complete');
  }

  /**
   * Get adapter statistics
   */
  getStats() {
    return {
      totalAdapters: this.adapters.size,
      adapters: this.listAdapters()
    };
  }
}

module.exports = AdapterRegistry;
