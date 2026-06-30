# dw — Technical Architecture Plan

┌─────────────────────────────────────────┐
│    Core System Framework                │
│  (from todo-plan.md - generic layer)    │
│  - Queue management                     │
│  - Cache storage & serving              │
│  - History tracking                     │
│  - UI shell & state management          │
└──────────────┬──────────────────────────┘
               │ delegates to
        ┌──────┴───────────────────────────────┐
        │     Adapter Interface/Router         │
        │  - URL type detection                │
        │  - Route to appropriate adapter      │
        │  - Normalize output format           │
        └───────┬──────────────────────────────┘
                │
    ┌───────────┼──────────────────────┐
    │           │                      │
┌───▼──┐ ┌──────▼────┐ ┌────────┐   ┌──▼─────────┐
│Video │ │  YouTube  │ │Vimeo   │   │Dailymotion |
│HTML  │ │  Adapter  │ │Adapter │   │Adapter     |
│Parser│ │  (yt-dlp) │ │(APIs)  │   │(APIs)      |
└──────┘ └───────────┘ └────────┘   └────────────┘

## 1. Objective

Build a desktop-first web application that lets users submit video URLs, creator references, or multi-link batches; inspect available media options; queue downloads; and review completed work from a dashboard. The system must feel polished and modern while remaining practical to implement with a lightweight backend and file-based storage.

## 2. Architecture Principles

- Keep the frontend dependency-light and use vanilla JavaScript with HTML5 and CSS.
- Use a small backend service to handle parsing, queueing, caching, and persistence.
- Prefer simple, durable file-based storage over a database in v1.
- Make the UI consistent across all input modes so the experience feels familiar.
- Design around repeatable requests: if metadata for the same asset is already known, serve it from cache.

## 3. System Overview

The application consists of three major layers:

1. Frontend application
   - Presents the input form, results cards, settings controls, queue view, and history dashboard.
   - Communicates with the backend through REST-style endpoints.
   - Stores client-side UI state such as selected resolutions and theme preference.

2. Backend service
   - Accepts parsing and download requests.
   - Normalizes input, checks the local cache, and performs retrieval work when needed.
   - Maintains a sequential worker that processes queued downloads.
   - Persists cache metadata, queue state, and download history to disk.

3. File storage layer
   - Stores metadata cache as JSON files.
   - Stores download history and queue state as JSON files.
   - Stores downloaded artifacts in a designated output directory.

## 4. Frontend Structure

The frontend should be organized into focused modules:

- app-shell
  - Initializes the interface and manages view switching.
- input-controller
  - Handles single-link, creator, and batch input modes.
- results-view
  - Renders cards or rows for discovered media items.
- selection-manager
  - Tracks chosen formats, resolutions, and download toggles.
- queue-view
  - Displays queued, running, completed, and failed tasks.
- dashboard-view
  - Shows historical downloads and summary information.
- theme-manager
  - Applies dark mode and visual polish.
- api-client
  - Wraps backend calls in simple request helpers.

## 5. Backend Structure

The backend is organized into three layers:

### 5.1 API Endpoints

The backend exposes a small set of unified endpoints:

- POST /parse/single
  - Parses a single URL and returns metadata plus resolution options.
- POST /parse/creator
  - Parses a creator or channel reference and returns a list of media items.
- POST /parse/batch
  - Parses a list of URLs and returns item-level results.
- POST /queue
  - Adds one or more download tasks to the queue.
- GET /queue
  - Returns the current queue state.
- GET /history
  - Returns history entries.
- GET /cache/:key
  - Returns cached metadata by normalized identifier.

### 5.2 Adapter Layer

The adapter pattern enables support for multiple video sources. Each adapter is responsible for:
- **URL Detection**: Identifying whether a URL belongs to this adapter.
- **Metadata Extraction**: Fetching video metadata and available resolutions.
- **Download Handling**: Downloading the video in the selected format/resolution.

**Key Components**:
- **BaseAdapter**: Abstract base class with common utilities (error handling, logging, caching interface).
- **Adapter Registry**: Manages available adapters and handles adapter lifecycle.
- **URL Detector**: Analyzes incoming URLs and routes to appropriate adapter.
- **Normalizer**: Converts adapter-specific output to a standard metadata schema.

**Adapters** (examples):
- **YouTube Adapter**: Handles youtube.com, youtu.be URLs (single videos, playlists, channels).
- **HTML Adapter**: Fallback adapter for any HTTP URL; parses embedded video elements and manifests.
- **Vimeo Adapter** (future): Handles vimeo.com URLs.
- **Dailymotion Adapter** (future): Handles dailymotion.com URLs.

### 5.3 Request Router

Routes incoming parse requests to the appropriate adapter:
1. Detect URL type using URL patterns and adapter-specific logic.
2. Delegate to adapter's parsing method.
3. Normalize adapter output to standard metadata schema.
4. Return unified response to frontend.

If primary adapter fails, the system attempts fallback (e.g., generic HTML parser).

### 5.4 Queue and Download Worker

The queue processor:
1. Reads queue items sequentially.
2. Looks up cached metadata or calls adapter to fetch it.
3. Invokes adapter's download handler with selected resolution/format.
4. Updates queue item status and stores downloaded file path.
5. Records entry in history and updates cache.

### 5.5 Cache Storage

All parsed metadata is stored in normalized format:
- Cache keys are adapter-specific but normalized (e.g., YouTube video IDs, domain-based keys for HTML).
- Cache entries include adapter name and source type for tracking.
- Adapter-specific metadata can be preserved in optional fields.

## 6. Data Model

### 6.1 Cache entry
A cache entry holds parsed metadata for an asset and is stored in a flat JSON file.

Fields:
- id
- sourceUrl
- normalizedKey
- adapterName (e.g., "youtube", "vimeo", "html")
- sourceType (e.g., "video", "playlist", "channel")
- title
- thumbnailUrl
- previewUrl
- duration
- timestamp
- resolutions (normalized format)
- formatOptions
- adapterMetadata (optional, adapter-specific fields)
- parsedAt
- expiresAt

### 6.2 History entry
A history entry records a completed or failed download.

Fields:
- id
- sourceUrl
- adapterName (e.g., "youtube", "vimeo", "html")
- sourceType (e.g., "video", "playlist", "channel")
- title
- selectedResolution
- selectedFormat
- status
- startedAt
- completedAt
- outputPath
- adapterMetadata (optional, adapter-specific data like YouTube video ID)
- errorMessage

### 6.3 Queue item
A queue item captures work to be processed sequentially.

Fields:
- id
- sourceUrl
- adapterName (e.g., "youtube", "vimeo", "html")
- sourceType (e.g., "video", "playlist", "channel")
- title
- selectedResolution
- selectedFormat
- status
- createdAt
- updatedAt
- attempts
- adapterMetadata (optional, adapter-specific data for download)

## 7. Storage Strategy

### 7.1 Filesystem layout
A simple disk layout is enough for v1:

- data/cache/
  - One JSON file per normalized cache key.
- data/history/history.json
- data/queue/queue.json
- downloads/
  - Output files are saved here.

### 7.2 Cache behavior
- Before parsing, the backend checks whether a cache file already exists for the normalized key.
- If present, the cached record is reused.
- If missing, parsing occurs, metadata is generated, and the result is saved to disk for future reuse.

## 8. Request Flow

### 8.1 Single URL flow
1. User pastes a URL into the frontend.
2. The frontend sends a parse request to the backend.
3. The backend detects the URL type using the adapter detector.
4. The router delegates to the appropriate adapter (YouTube, HTML, etc.).
5. The adapter checks the cache for the normalized key.
6. If cache exists, it returns the cached metadata (converted to normalized format).
7. If not, the adapter fetches metadata, extracts resolutions, and persists it to cache.
8. The backend returns normalized metadata to the frontend.
9. The frontend renders the result card and lets the user choose the target resolution and format.
10. The user queues the task with selected options, and the backend processes it sequentially.

### 8.2 Creator flow
1. User submits a creator or channel input.
2. The backend detects the input type and routes to the appropriate adapter.
3. The adapter fetches the creator listing (e.g., YouTube channel videos, Vimeo creator videos).
4. Each discovered item is normalized and stored in cache where appropriate.
5. The frontend displays a batch list of selectable items with source badges.
6. The user selects desired entries and starts the queue.

### 8.3 Batch flow
1. User pastes a list of URLs.
2. Backend detects the type of each URL and routes to appropriate adapters.
3. Each adapter processes its URLs and returns normalized results.
4. Results are rendered as a set of cards or rows with source type indicators.
5. Each item can be queued individually or in a single batch action.
6. The queue processor handles downloads from multiple adapters sequentially.

## 9. Adapter Design Pattern

### 9.1 Adapter Interface
Each adapter implements a common interface:

- `detectURL(url)`: Returns boolean indicating if this adapter can handle the URL.
- `parseURL(url)`: Fetches metadata and resolutions; returns normalized result.
- `download(sourceUrl, resolution, format)`: Downloads the media in selected format; returns file path.
- `getResolutions(url)`: Extracts and ranks available resolutions; returns normalized list.

### 9.2 Adapter Metadata Normalization
All adapter outputs are converted to a normalized schema:

```json
{
  "id": "unique-id",
  "sourceUrl": "original-url",
  "normalizedKey": "adapter-specific-key",
  "adapterName": "youtube|vimeo|html|...",
  "sourceType": "video|playlist|channel|...",
  "title": "Media Title",
  "duration": 3600,
  "thumbnailUrl": "...",
  "resolutions": [
    {
      "format": "mp4",
      "codec": "h264",
      "width": 1920,
      "height": 1080,
      "bitrate": "5000k",
      "fps": 30,
      "fileSize": "estimated-bytes"
    }
  ],
  "adapterMetadata": { /* adapter-specific fields */ }
}
```

### 9.3 Adapter Configuration
Adapters are configured in `config/adapters.json`:

```json
{
  "adapters": [
    {
      "name": "youtube",
      "enabled": true,
      "priority": 1,
      "timeout": 10000,
      "apiKey": "${YOUTUBE_API_KEY}",
      "settings": {
        "maxPlaylistSize": 1000,
        "channelVideoLimit": 100
      }
    },
    {
      "name": "html",
      "enabled": true,
      "priority": 100,
      "timeout": 15000,
      "settings": {
        "followRedirects": true,
        "userAgent": "..."
      }
    }
  ]
}
```

### 9.4 Adapter Registry
The adapter registry dynamically loads and manages adapters:

- Discovers adapters from `backend/adapters/` directory
- Registers each adapter with its name and priority
- Routes incoming requests to appropriate adapter based on URL detection
- Falls back to generic adapter (HTML) if no specific adapter claims the URL
- Provides error handling and retry logic

## 10. Queueing and Download Execution

- Downloads run one at a time to avoid overwhelming the environment and keep state predictable.
- Each queue item moves through statuses such as queued, parsing, ready, downloading, completed, failed, and canceled.
- The worker loop reads the queue file, picks the next item, looks up the adapter from `adapterName`, and invokes its download handler.
- Downloads are tracked with adapter-specific metadata for proper resumption and error recovery.
- The worker updates state and writes progress back to disk.
- A simple polling or event-based update strategy can keep the UI current.

## 11. UI and Experience Design

The frontend should support:
- a compact input-first experience for quick use
- a richer results surface with thumbnail, preview, metadata, and options
- a dashboard showing what has already been downloaded
- dark mode with animated transitions and loading states
- consistent card layouts across single, creator, and batch views
- source type badges and adapter-specific UI indicators

## 12. PWA Design

The app should be installable as a PWA with:
- a web app manifest
- a service worker for shell caching
- offline-safe first-load experience where practical
- app-like behavior on desktop and mobile

## 13. Reliability and Error Handling

The system should:
- surface clear, concise messages for parsing failures and download errors
- keep partial queue state so users can recover from interruptions
- avoid silent failures by logging each state transition
- provide sensible fallback behavior when a source is unavailable or a resolution is missing
- implement adapter fallback: if a specific adapter fails, try generic HTML parser
- handle adapter-specific errors gracefully without breaking the queue

## 14. Security and Operational Considerations

- Keep all processing local to the deployed environment where practical.
- Restrict file writes to clearly scoped directories.
- Avoid exposing sensitive runtime data through the UI.
- Make the app easy to run locally while staying understandable for future extension.
- Store adapter credentials (API keys, etc.) in environment variables, not in version control.
- Validate adapter configuration at startup; fail fast if required settings are missing.
- Log adapter-specific metadata for debugging without exposing user data.

## 15. Implementation Notes

The initial version should prioritize correctness and clarity over broad feature coverage. The first milestone should prove:
- Adapter framework and URL detection work
- YouTube adapter parsing works (single videos, playlists, channels)
- Generic HTML fallback adapter works
- cache reuse works across adapters
- queue processing works with multi-adapter support
- history logging works with adapter tracking
- the UI remains coherent across the three input modes
- normalized metadata schema is consistent across adapters
