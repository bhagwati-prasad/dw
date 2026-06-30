# Adapter Interface Specification

## Overview

Adapters are pluggable modules that handle parsing and downloading from different video sources. Each adapter must conform to this interface to work with the core system.

## Required Methods

### detectURL(url)

Determines if this adapter can handle a given URL.

**Signature:**
```javascript
async detectURL(url) -> { canHandle: boolean, confidence: number, sourceType: string }
```

**Parameters:**
- `url` (string): The URL to evaluate

**Returns:**
- `canHandle` (boolean): Whether this adapter can handle the URL
- `confidence` (number): Confidence level (0-1); used for priority when multiple adapters match
- `sourceType` (string): Classification of source (e.g., "video", "playlist", "channel", "stream")

**Example:**
```javascript
// YouTube adapter
{
  canHandle: true,
  confidence: 0.99,
  sourceType: "playlist"
}
```

### parseURL(url)

Fetches metadata and available resolutions for a URL.

**Signature:**
```javascript
async parseURL(url) -> { error?: Error } | { metadata: NormalizedMetadata }
```

**Parameters:**
- `url` (string): The URL to parse

**Returns:**
- On success: `{ metadata: NormalizedMetadata }`
- On error: `{ error: Error }`

**Throws:** Adapter-specific errors should be caught and returned in error field.

**Example:**
```javascript
{
  metadata: {
    id: "dQw4w9WgXcQ",
    sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    normalizedKey: "youtube:dQw4w9WgXcQ",
    adapterName: "youtube",
    sourceType: "video",
    title: "Never Gonna Give You Up",
    duration: 213,
    thumbnailUrl: "https://...",
    resolutions: [
      { format: "mp4", codec: "h264", width: 1920, height: 1080, bitrate: "5000k", fps: 30, fileSize: 123456 },
      { format: "mp4", codec: "h264", width: 1280, height: 720, bitrate: "2500k", fps: 30, fileSize: 67890 }
    ],
    adapterMetadata: { videoId: "dQw4w9WgXcQ", channelId: "UCuAXFkgsw1L7xaCfnd5J1vQ" }
  }
}
```

### getResolutions(url)

Extracts and ranks available resolutions for a URL.

**Signature:**
```javascript
async getResolutions(url) -> { error?: Error } | { resolutions: Resolution[] }
```

**Parameters:**
- `url` (string): The URL to query

**Returns:**
- On success: `{ resolutions: Resolution[] }` - sorted by quality (highest first)
- On error: `{ error: Error }`

**Resolution Schema:**
```javascript
{
  format: "mp4" | "webm" | "flv" | "m4a" | "opus" | "mp3",
  codec: "h264" | "vp9" | "av1" | "aac" | "opus" | "vorbis",
  width: number,              // 0 for audio-only
  height: number,             // 0 for audio-only
  bitrate: "5000k" | "128k",  // Video or audio bitrate
  fps: number,                // 0 for audio
  fileSize: number,           // Estimated in bytes, 0 if unknown
  isRecommended: boolean      // Mark best quality
}
```

### download(sourceUrl, resolution, format, outputPath)

Downloads media in the selected format and resolution.

**Signature:**
```javascript
async download(sourceUrl, resolution, format, outputPath) -> { error?: Error } | { filePath: string, metadata: object }
```

**Parameters:**
- `sourceUrl` (string): Original URL to download from
- `resolution` (object): Selected resolution object from getResolutions()
- `format` (string): File format (mp4, webm, mp3, etc.)
- `outputPath` (string): Directory to save downloaded file

**Returns:**
- On success: `{ filePath: string, metadata: object }`
- On error: `{ error: Error }`

**Metadata returned should include:**
- `fileSize`: Actual downloaded file size in bytes
- `duration`: Media duration in seconds
- `codec`: Actual codec used
- Any adapter-specific metadata

**Example:**
```javascript
{
  filePath: "/path/to/downloads/never-gonna-give-you-up.mp4",
  metadata: {
    fileSize: 123456789,
    duration: 213,
    codec: "h264",
    videoId: "dQw4w9WgXcQ"
  }
}
```

## Normalized Metadata Schema

```json
{
  "id": "unique-identifier-per-adapter",
  "sourceUrl": "original-input-url",
  "normalizedKey": "adapter-specific-normalized-key",
  "adapterName": "youtube|vimeo|html|...",
  "sourceType": "video|playlist|channel|stream|...",
  "title": "Media Title",
  "duration": 3600,
  "description": "Optional description",
  "thumbnailUrl": "https://...",
  "authorName": "Author/Channel Name",
  "authorUrl": "https://author-page",
  "uploadDate": "2023-01-15T10:30:00Z",
  "resolutions": [
    {
      "format": "mp4",
      "codec": "h264",
      "width": 1920,
      "height": 1080,
      "bitrate": "5000k",
      "fps": 30,
      "fileSize": 123456,
      "isRecommended": true
    }
  ],
  "formatOptions": ["mp4", "webm"],
  "adapterMetadata": {
    "custom-field": "adapter-specific-value"
  },
  "parsedAt": "2023-01-15T10:30:00Z",
  "expiresAt": "2023-01-22T10:30:00Z"
}
```

## Error Handling

All adapter methods should handle errors gracefully:

```javascript
// Do NOT throw - return error object
async parseURL(url) {
  try {
    const metadata = await fetchMetadata(url);
    return { metadata };
  } catch (error) {
    return { error: new AdapterError(`Failed to parse ${url}: ${error.message}`) };
  }
}
```

### Error Types

Define a custom `AdapterError` class:

```javascript
class AdapterError extends Error {
  constructor(message, code = 'ADAPTER_ERROR', details = {}) {
    super(message);
    this.name = 'AdapterError';
    this.code = code;
    this.details = details;
  }
}
```

**Common Error Codes:**
- `ADAPTER_ERROR`: Generic adapter error
- `URL_NOT_SUPPORTED`: Adapter cannot handle this URL
- `NETWORK_ERROR`: Network request failed
- `PARSE_ERROR`: Failed to parse metadata
- `NOT_FOUND`: Resource not found (video deleted, private, etc.)
- `UNAUTHORIZED`: Authentication required or denied
- `RATE_LIMITED`: Too many requests, try again later
- `DOWNLOAD_FAILED`: Download process failed
- `INVALID_RESOLUTION`: Selected resolution not available

## Retry Strategy

Adapters should support automatic retry for transient errors:

```javascript
// Implement in BaseAdapter
async retryWithBackoff(asyncFn, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await asyncFn();
    } catch (error) {
      if (attempt === maxRetries - 1 || !isTransientError(error)) {
        throw error;
      }
      const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

**Transient errors to retry:**
- Network timeouts
- Rate limiting (429, 503 status codes)
- Temporary service unavailability

**Non-transient errors (don't retry):**
- Video not found (404)
- Unauthorized (401, 403)
- Invalid URL format

## Adapter Configuration

Adapters are configured in `config/adapters.json`:

```json
{
  "adapters": [
    {
      "name": "youtube",
      "enabled": true,
      "priority": 1,
      "timeout": 10000,
      "maxRetries": 3,
      "retryDelay": 1000,
      "apiKey": "${YOUTUBE_API_KEY}",
      "settings": {
        "maxPlaylistSize": 1000,
        "channelVideoLimit": 100,
        "preferredFormats": ["mp4", "webm"]
      }
    }
  ]
}
```

**Standard configuration fields:**
- `name` (string): Adapter identifier
- `enabled` (boolean): Whether adapter is active
- `priority` (number): Order for URL detection (lower = higher priority)
- `timeout` (number): Request timeout in milliseconds
- `maxRetries` (number): Max retry attempts
- `retryDelay` (number): Initial retry delay in milliseconds
- `apiKey` (string): Optional API key (can use ${ENV_VAR} syntax)
- `settings` (object): Adapter-specific configuration

## Lifecycle Hooks

Adapters can implement optional lifecycle methods:

```javascript
// Called during adapter registration
async init(config) {
  // Initialize adapter with configuration
  // Validate API keys, set up HTTP clients, etc.
}

// Called when adapter is unloaded
async shutdown() {
  // Clean up resources
  // Close connections, etc.
}
```

## Progress Tracking (Optional)

For long-running downloads, adapters should emit progress events:

```javascript
// In BaseAdapter
emitProgress(event) {
  // event: { type: 'progress', progress: 0-100, speed: 'bytes/sec', eta: 'seconds' }
  if (this.progressCallback) {
    this.progressCallback(event);
  }
}

// Usage in adapter
async download(sourceUrl, resolution, format, outputPath) {
  this.progressCallback = (event) => {
    // Frontend will receive progress updates via WebSocket
  };
  // ... download logic, emit progress events
}
```

## Example Adapter

```javascript
const BaseAdapter = require('./BaseAdapter');
const { AdapterError } = require('./errors');

class YouTubeAdapter extends BaseAdapter {
  static adapterName = 'youtube';
  static priority = 1;

  async detectURL(url) {
    const youtubePatterns = [
      /youtube\.com\/watch/,
      /youtu\.be\//,
      /youtube\.com\/playlist/,
      /youtube\.com\/@/
    ];
    
    for (const pattern of youtubePatterns) {
      if (pattern.test(url)) {
        const sourceType = this._classifyURL(url);
        return {
          canHandle: true,
          confidence: 0.99,
          sourceType
        };
      }
    }
    
    return { canHandle: false, confidence: 0, sourceType: null };
  }

  async parseURL(url) {
    try {
      const metadata = await this.retryWithBackoff(async () => {
        return await this._fetchMetadata(url);
      });
      return { metadata };
    } catch (error) {
      return { error: new AdapterError(error.message, 'PARSE_ERROR') };
    }
  }

  async getResolutions(url) {
    try {
      const resolutions = await this._fetchResolutions(url);
      return { resolutions };
    } catch (error) {
      return { error: new AdapterError(error.message, 'PARSE_ERROR') };
    }
  }

  async download(sourceUrl, resolution, format, outputPath) {
    try {
      const result = await this.retryWithBackoff(async () => {
        return await this._downloadVideo(sourceUrl, resolution, format, outputPath);
      });
      return { filePath: result.path, metadata: result.metadata };
    } catch (error) {
      return { error: new AdapterError(error.message, 'DOWNLOAD_FAILED') };
    }
  }

  _classifyURL(url) {
    if (/playlist\?list=/.test(url)) return 'playlist';
    if (/\/@/.test(url)) return 'channel';
    return 'video';
  }

  async _fetchMetadata(url) {
    // Implementation specific to YouTube
  }

  async _fetchResolutions(url) {
    // Implementation specific to YouTube
  }

  async _downloadVideo(sourceUrl, resolution, format, outputPath) {
    // Implementation specific to YouTube
  }
}

module.exports = YouTubeAdapter;
```
