# dw — Concrete Implementation Plan

## Epic 1: Foundation and App Shell

### Story 1.1: Create project structure
- [x] Create folders for frontend, backend, public assets, data, downloads, and cache.
- [x] Add a basic package manifest and startup scripts.
- [x] Create a simple health endpoint for the backend.

### Story 1.2: Build the initial UI shell
- [x] Create a single-page HTML shell with a header, main content area, and sidebar.
- [x] Add a dark theme base stylesheet.
- [x] Add placeholder sections for input, results, queue, and dashboard.

### Story 1.3: Add app state management
- [x] Define a simple in-memory app state for current mode, results, queue, and history.
- [x] Connect the UI to render state changes.

## Epic 2: Input Modes and Parsing

### Story 2.1: Implement single URL parsing flow
- [x] Add a form for one video URL.
- [x] Send the URL to the backend parse endpoint.
- [x] Display parsed metadata including title, duration, thumbnail, and resolutions.

### Story 2.2: Implement creator/channel parsing flow
- [x] Add a form for creator or channel input.
- [x] Send the input to the backend and receive a list of discovered videos.
- [x] Render the batch list with metadata and selection controls.

### Story 2.3: Implement multi-URL batch parsing flow
- [x] Add a textarea for pasting multiple URLs.
- [x] Parse each line as an individual input.
- [x] Render one result card per URL.

### Story 2.4: Normalize sources for caching
- [x] Create a normalization function for URLs and creator identifiers.
- [x] Use the normalized key for cache lookup and storage.

## Epic 3: Result Experience and Controls

### Story 3.1: Add media result cards
- [x] Build reusable result card UI for single and batch results.
- [x] Show thumbnail, title, duration, timestamp, and source link.
- [x] Add a loading and empty state.

### Story 3.2: Add resolution and format selection
- [x] Auto-select the best resolution by default.
- [x] Allow manual override of resolution.
- [x] Make MP4 the default format and add WebM as an option.
- [x] Persist the selected resolution/format per item in UI state.

### Story 3.3: Add preview support
- [ ] Render a preview player or preview placeholder when metadata contains preview media.
- [ ] Add graceful fallback when preview media is unavailable.

## Epic 4: Backend Caching and Persistence

### Story 4.1: Implement flat-file cache storage
- [x] Create a cache directory and JSON file writer/reader utilities.
- [x] Save parsed metadata by normalized key.
- [x] Return cached results when the same source is requested again.

### Story 4.2: Implement queue persistence
- [x] Create a queue state file and JSON schema.
- [x] Add operations to add, update, and read queue items.

### Story 4.3: Implement download history persistence
- [x] Create a history JSON file.
- [x] Append completed, failed, or canceled downloads with metadata.

## Epic 5: Download Queue and Execution

### Story 5.1: Add queue management UI
- [x] Show queued items in a dedicated queue panel.
- [x] Support start, pause, cancel, and retry actions.

### Story 5.2: Implement sequential processing worker
- [x] Process one queue item at a time.
- [x] Update item state as it moves through queued, downloading, completed, and failed.
- [x] Handle errors without breaking the rest of the queue.

### Story 5.3: Add progress feedback
- [x] Show progress, status labels, and timestamps per item.
- [x] Display clear errors for failed downloads.

## Epic 6: Dashboard and History

### Story 6.1: Build dashboard view
- [x] Render a list of completed and failed downloads.
- [x] Show title, source, resolution, status, and timestamp.

### Story 6.2: Add simple filtering and sorting
- [x] Add filter options for completed, failed, and queued items.
- [x] Sort history by newest first.

## Epic 7: PWA and Polish

### Story 7.1: Add PWA manifest and service worker
- [ ] Create a web app manifest.
- [ ] Add a service worker for offline shell caching.

### Story 7.2: Improve user experience
- [ ] Add subtle transitions and loading animations.
- [ ] Improve empty states and error messaging.
- [ ] Refine dark mode styling and layout polish.

## Epic 8: Testing and Hardening

### Story 8.1: Add basic automated tests
- [x] Add tests for cache normalization and storage utilities.
- [x] Add tests for queue state transitions.
- [ ] Add tests for API response structure.

### Story 8.2: Add operational safeguards
- [x] Ensure output directories are created automatically.
- [ ] Add safe logging for queue and download failures.
- [ ] Handle malformed input gracefully.

## Epic 9: HTML Source Analysis and Resolution Discovery

### Story 9.1: Support HTML-based source analysis
- [ ] Accept a video page URL and fetch the associated HTML page.
- [ ] Parse embedded scripts, metadata, and preload tags for media references.
- [ ] Support the sample HTML structure provided in sample.html and sample.url.
- [ ] Extract video title, thumbnail, and candidate media manifests.

### Story 9.2: Extract and rank available resolutions
- [ ] Detect resolutions from media URLs, manifests, and HTML metadata.
- [ ] Identify the best available resolution automatically.
- [ ] Surface all discovered resolutions and allow manual selection.
- [ ] Map the chosen resolution to the matching media source.

### Story 9.3: Build analysis result UI
- [ ] Show the analysis result in the main results area with title, source, detected resolutions, and status.
- [ ] Highlight the recommended best resolution.
- [ ] Present a clear “Download” action for the selected resolution.

## Epic 10: Server-side Download and User Prompt

### Story 10.1: Download media to server storage
- [ ] Add a backend endpoint to download the selected media source to the server.
- [ ] Store the downloaded file in the downloads directory with a safe filename.
- [ ] Record metadata for the download in history and queue state.

### Story 10.2: Prompt user to download from server
- [ ] Expose the downloaded file through a download endpoint or direct file link.
- [ ] Show a prompt or call-to-action in the UI to let the user download the file.
- [ ] Support retry and error handling for failed downloads.

### Story 10.3: Harden analysis and download flow
- [ ] Handle unsupported HTML patterns gracefully.
- [ ] Add logging and fallback behavior when resolution extraction fails.
- [ ] Add tests for HTML parsing, resolution ranking, and server download flow.

## Suggested Execution Order

1. Foundation and app shell
2. Single URL parsing and result display
3. Creator and batch parsing
4. Cache persistence
5. Queue processing
6. Dashboard and history
7. PWA polish and hardening
