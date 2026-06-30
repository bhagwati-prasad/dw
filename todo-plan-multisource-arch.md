# Multi-Source Adapter Architecture Implementation Plan

## Epic 1: Adapter Interface and Contract Definition

### Story 1.1: Define adapter interface specification
- [x] Create a formal adapter interface document (`backend/adapters/ADAPTER_INTERFACE.md`).
- [x] Define required adapter methods: `detectURL()`, `parseURL()`, `download()`, `getResolutions()`.
- [x] Define adapter output format/schema for metadata, resolutions, and errors.
- [x] Specify adapter configuration structure (API keys, timeouts, rate limits).
- [x] Document error handling and retry strategy expectations.

### Story 1.2: Create adapter base class or template
- [x] Create `backend/adapters/BaseAdapter.js` with common helper methods.
- [x] Implement shared utilities: error handling, logging, caching interface, retry logic.
- [x] Add hooks for adapter-specific initialization and cleanup.
- [x] Provide standard response formatting for adapter implementations.

### Story 1.3: Establish adapter registry
- [x] Create `backend/adapters/registry.js` to manage available adapters.
- [x] Implement `registerAdapter()` function to dynamically load adapters.
- [x] Add `getAdapterByName()` and `detectAdapter()` methods.
- [x] Support adapter priority/ordering for ambiguous URL detection.

## Epic 2: URL Detection and Routing

### Story 2.1: Implement URL detection system
- [x] Create `backend/adapters/detector.js` with URL pattern matching.
- [x] Add detection functions for each adapter type (YouTube, Vimeo, generic HTML, etc.).
- [x] Support multiple detection strategies (regex, domain-based, API probing).
- [x] Return adapter name and confidence level.
- [x] Handle edge cases (shortened URLs, custom domains, regional URLs).

### Story 2.2: Create request router
- [x] Create `backend/routes/parseRouter.js` to route parse requests.
- [x] Detect URL type and delegate to appropriate adapter.
- [x] Unify request/response format across all adapters.
- [x] Handle adapter fallback (if primary adapter fails, try generic HTML parser).
- [x] Return metadata in normalized format.

### Story 2.3: Add routing tests
- [x] Test URL detection accuracy for each supported source.
- [x] Test fallback behavior when adapter fails.
- [x] Test priority ordering when multiple adapters could handle a URL.
- [x] Test error handling for unrecognized URLs.

## Epic 3: Metadata Normalization Layer

### Story 3.1: Define normalized metadata schema
- [x] Create `backend/adapters/schemas/normalizedMetadata.schema.json`.
- [x] Define standard fields: id, title, duration, thumbnail, resolutions, source, sourceType.
- [x] Define resolution schema: format, width, height, bitrate, fileSize, codec.
- [x] Support optional adapter-specific fields (channel info, captions, etc.).
- [x] Version the schema for future compatibility.

### Story 3.2: Implement normalization utilities
- [x] Create `backend/adapters/normalizer.js` with conversion functions.
- [x] Implement `normalizeAdapterOutput()` to convert adapter response to standard schema.
- [x] Add `denormalizeForAdapter()` to convert standard format back to adapter-specific format if needed.
- [x] Support custom field mappings per adapter.
- [x] Add validation against schema.

### Story 3.3: Update cache storage for normalized format
- [x] Modify cache storage to use normalized metadata schema.
- [x] Ensure all adapters' outputs are cached in normalized form.
- [x] Update cache retrieval to return normalized format.
- [x] Add migration script for any existing cache entries.

## Epic 4: YouTube Adapter Implementation

### Story 4.1: Implement YouTube adapter module
- [ ] Create `backend/adapters/youtubeAdapter.js` extending BaseAdapter.
- [ ] Implement `detectURL()` to identify YouTube URLs (youtube.com, youtu.be, m.youtube.com).
- [ ] Add URL type classification (video, playlist, channel, mix, shorts).
- [ ] Integrate yt-dlp or YouTube API for metadata fetching.
- [ ] Handle YouTube-specific error cases (private, region-restricted, deleted).

### Story 4.2: Parse single YouTube videos
- [ ] Implement `parseURL()` for single video URLs.
- [ ] Fetch video metadata: title, duration, channel, thumbnail, upload date.
- [ ] Extract available resolutions: video+audio, video-only, audio-only.
- [ ] Return normalized metadata with resolution list.
- [ ] Cache results with YouTube video ID as key.

### Story 4.3: Parse YouTube playlists
- [ ] Implement `parsePlaylist()` to fetch all videos in a playlist.
- [ ] Retrieve video metadata for each item.
- [ ] Handle pagination for large playlists.
- [ ] Return array of normalized video metadata.
- [ ] Support playlist filtering (by date, duration, etc.) for performance.

### Story 4.4: Parse YouTube channels
- [ ] Implement `parseChannel()` to fetch recent/popular videos.
- [ ] Support channel URL, channel ID, and @handle formats.
- [ ] Retrieve configurable number of videos (latest N, popular videos, uploads).
- [ ] Return array of normalized video metadata.
- [ ] Add caching with TTL for channel data.

### Story 4.5: Extract YouTube resolutions
- [ ] Implement `getResolutions()` to list all available quality options.
- [ ] Identify formats: MP4, WebM, FLV for video; MP4A, M4A, OPUS for audio.
- [ ] Extract codec, bitrate, frame rate, and estimated file size.
- [ ] Rank by quality and mark recommended resolution.
- [ ] Support audio-only format option (MP3, M4A, OPUS).

### Story 4.6: Implement YouTube download handler
- [ ] Create download handler for YouTube videos with selected resolution.
- [ ] Use yt-dlp to download selected format and resolution.
- [ ] Stream download progress to UI via WebSocket or polling.
- [ ] Handle errors: video unavailable, geo-blocked, rate-limited.
- [ ] Implement retry logic with exponential backoff.

## Epic 5: Generic HTML Parser Adapter

### Story 5.1: Create generic HTML parser adapter
- [ ] Create `backend/adapters/htmlAdapter.js` extending BaseAdapter.
- [ ] Implement `detectURL()` to match any HTTP(S) URL not claimed by specific adapters.
- [ ] Set as fallback/catch-all adapter.

### Story 5.2: Parse HTML for embedded media
- [ ] Fetch and parse HTML page content.
- [ ] Scan for media elements: `<video>`, `<audio>`, `<img>`, `<source>`.
- [ ] Extract from meta tags: Open Graph, Twitter Card, JSON-LD.
- [ ] Parse embedded scripts for manifest URLs (HLS, DASH).
- [ ] Extract video player metadata and media URLs.

### Story 5.3: Extract resolutions from HTML media
- [ ] Identify all candidate media URLs (video files, manifests, streams).
- [ ] Parse manifest files (HLS m3u8, DASH mpd) to extract resolution options.
- [ ] Rank resolutions and estimate file sizes.
- [ ] Return normalized resolution list.

### Story 5.4: Implement HTML download handler
- [ ] Download selected media file from extracted URL.
- [ ] Handle redirects and authentication if needed.
- [ ] Support stream downloads (HLS, DASH) by merging segments.
- [ ] Graceful fallback for media that cannot be downloaded.

## Epic 6: Core System Integration with Adapters

### Story 6.1: Update queue processing for adapters
- [ ] Modify queue processor to use adapter's download handler.
- [ ] Pass selected resolution/format from queue item to adapter.
- [ ] Adapter handles download and returns file path.
- [ ] Track adapter-specific errors and metadata.

### Story 6.2: Update cache layer for adapter metadata
- [ ] Modify cache storage to use normalized schema.
- [ ] Store adapter name and type detection confidence.
- [ ] Implement adapter-aware cache invalidation (re-detect if cache is stale).
- [ ] Support adapter-specific cache TTL policies.

### Story 6.3: Update history tracking for adapters
- [ ] Record adapter name in download history entry.
- [ ] Store adapter-specific metadata (YouTube video ID, HTML source URL, etc.).
- [ ] Support filtering history by adapter/source type.
- [ ] Display adapter info in dashboard.

### Story 6.4: Update UI to display source type
- [ ] Show adapter/source type badge on result cards (YouTube, Vimeo, HTML, etc.).
- [ ] Display adapter-specific info (channel name for YouTube, domain for HTML).
- [ ] Update queue view to show source type icon.
- [ ] Update history/dashboard to filter by source type.

## Epic 7: Configuration and Settings

### Story 7.1: Create adapter configuration system
- [ ] Create `config/adapters.json` to enable/disable adapters and set priorities.
- [ ] Support per-adapter settings: API keys, timeout values, rate limits, quality defaults.
- [ ] Load configuration on server startup.
- [ ] Support environment variable overrides for sensitive settings.

### Story 7.2: Implement feature flags for adapters
- [ ] Add per-adapter feature flags (e.g., enable YouTube audio extraction, channel scanning).
- [ ] Support dynamic feature toggling without server restart.
- [ ] Store feature flag state in configuration.

### Story 7.3: Add adapter management UI (optional)
- [ ] Create settings panel to view enabled adapters.
- [ ] Display adapter versions and status.
- [ ] Show adapter-specific configuration options.
- [ ] Allow users to adjust quality defaults per adapter.

## Epic 8: Testing and Quality Assurance

### Story 8.1: Add unit tests for adapter framework
- [ ] Test BaseAdapter initialization and method signatures.
- [ ] Test adapter registry registration and lookup.
- [ ] Test URL detector accuracy and priority ordering.
- [ ] Test metadata normalization schema validation.
- [ ] Test error handling across adapter methods.

### Story 8.2: Add YouTube adapter tests
- [ ] Test YouTube URL detection for all URL formats.
- [ ] Mock yt-dlp responses for unit tests.
- [ ] Test single video parsing with various metadata scenarios.
- [ ] Test playlist and channel parsing with pagination.
- [ ] Test resolution extraction and ranking.
- [ ] Test error cases (private videos, age-restricted, etc.).

### Story 8.3: Add HTML adapter tests
- [ ] Test HTML detection for various page structures.
- [ ] Test media extraction from HTML elements and meta tags.
- [ ] Test manifest parsing (HLS, DASH).
- [ ] Test fallback behavior when media is not found.

### Story 8.4: Add integration tests
- [ ] Test full flow: URL input → detection → adapter parse → cache → queue → download.
- [ ] Test adapter switching/fallback scenarios.
- [ ] Test concurrent requests to multiple adapters.
- [ ] Test history and dashboard filtering by source type.

### Story 8.5: Add performance tests
- [ ] Benchmark URL detection performance.
- [ ] Measure adapter initialization time.
- [ ] Test memory usage for large batch parsing (playlists).
- [ ] Profile download performance across adapters.

## Epic 9: Documentation and Developer Experience

### Story 9.1: Create adapter development guide
- [ ] Write `ADAPTER_DEVELOPMENT.md` with step-by-step instructions.
- [ ] Provide code templates for new adapters.
- [ ] Document common patterns and utilities available to adapters.
- [ ] Include troubleshooting section for common issues.

### Story 9.2: Document supported sources
- [ ] Create `SUPPORTED_SOURCES.md` listing all supported adapters and URL patterns.
- [ ] Document limitations and unsupported scenarios per adapter.
- [ ] Provide example URLs for each adapter.
- [ ] Include troubleshooting tips for each source type.

### Story 9.3: Add API documentation
- [ ] Document adapter interface with examples.
- [ ] Document normalized metadata schema with examples.
- [ ] Document router endpoint request/response formats.
- [ ] Include adapter configuration options reference.

## Epic 10: Future Adapters and Extensibility

### Story 10.1: Plan Vimeo adapter
- [ ] Research Vimeo API and URL patterns.
- [ ] Design Vimeo adapter following YouTube adapter pattern.
- [ ] Create implementation backlog as separate todo-plan-vimeo.md.

### Story 10.2: Plan other platform adapters
- [ ] Research Dailymotion, Facebook Video, Instagram Reels, TikTok URL patterns.
- [ ] Prioritize based on user demand.
- [ ] Create implementation backlog for each platform.

### Story 10.3: Plan stream provider adapters
- [ ] Research Twitch, YouTube Live, stream.me patterns.
- [ ] Design stream recording capability.
- [ ] Create implementation backlog for stream adapters.

## Implementation Priority

1. **Phase 1**: Adapter framework + YouTube adapter (Stories 1.1-1.3, 2.1-2.3, 3.1-3.3, 4.1-4.6)
2. **Phase 2**: Core system integration (Stories 6.1-6.4, 5.1-5.4)
3. **Phase 3**: Configuration and settings (Epic 7)
4. **Phase 4**: Comprehensive testing (Epic 8)
5. **Phase 5**: Documentation (Epic 9)
6. **Phase 6**: Future adapters (Epic 10)
