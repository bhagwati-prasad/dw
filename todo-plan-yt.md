# YouTube Adapter Implementation Plan

## Epic 1: YouTube Adapter Foundation and Integration

### Story 1.1: Set up YouTube adapter module
- [ ] Create `backend/adapters/youtube.js` module.
- [ ] Integrate YouTube data fetching library (yt-dlp or similar).
- [ ] Add configuration for YouTube adapter endpoints.
- [ ] Create utility functions for URL validation and type detection (video, playlist, channel).

### Story 1.2: Create YouTube-specific parsing endpoints
- [ ] Add POST `/api/parse/youtube/video` endpoint for single video URLs.
- [ ] Add POST `/api/parse/youtube/playlist` endpoint for playlist URLs.
- [ ] Add POST `/api/parse/youtube/channel` endpoint for channel URLs.
- [ ] Add POST `/api/parse/youtube/batch` endpoint for multiple URLs.

### Story 1.3: Add YouTube input modes to UI
- [ ] Add a tab or mode selector for YouTube video, playlist, channel, or batch input.
- [ ] Create form inputs for each mode with appropriate placeholders and validation.

## Epic 2: Single Video Handling

### Story 2.1: Parse and fetch single video metadata
- [ ] Fetch video metadata from YouTube (title, duration, thumbnail URL, channel name).
- [ ] Fetch available resolutions/quality levels for the video.
- [ ] Normalize and structure the response (id, title, duration, thumbnail, resolutions, url, source).
- [ ] Return data in format compatible with existing result card UI.

### Story 2.2: Build single video result card
- [ ] Display thumbnail, title, duration, and source channel.
- [ ] Show a list of available resolutions with details (format, size estimate, frame rate).
- [ ] Auto-select the highest resolution by default (visual indication).
- [ ] Add resolution picker buttons to allow manual selection.

### Story 2.3: Add download action for single video
- [ ] Display "Add to Queue" or "Download" button.
- [ ] Store selected resolution and format preference (MP4 default, WebM optional).
- [ ] Add the item to the queue with YouTube-specific metadata.

## Epic 3: Batch Handling (Playlists, Channels, Multi-URL)

### Story 3.1: Parse playlists
- [ ] Fetch all video URLs from a YouTube playlist.
- [ ] Retrieve metadata for each video (title, thumbnail, duration).
- [ ] Return a list of video objects with consistent structure.
- [ ] Handle pagination for large playlists.

### Story 3.2: Parse channels
- [ ] Fetch recent/popular videos from a YouTube channel.
- [ ] Retrieve metadata for each video (title, thumbnail, duration).
- [ ] Return a paginated or limited list of video objects.
- [ ] Add option to filter by date range or upload date.

### Story 3.3: Parse multi-URL input
- [ ] Parse a textarea input with one URL per line.
- [ ] Detect the type of each URL (video, playlist, or channel).
- [ ] Fetch and normalize results for all URLs.
- [ ] Merge results into a single batch list.

### Story 3.4: Display batch results
- [ ] Show all videos in a scrollable list with checkboxes or toggle switches.
- [ ] Display metadata (thumbnail, title, duration, source) for each item.
- [ ] Provide "Select All" and "Deselect All" buttons.
- [ ] Show count of selected items.

### Story 3.5: Add bulk queue action
- [ ] Add "Add Selected to Queue" button.
- [ ] Add all checked items to the queue with default resolution selection.
- [ ] Show confirmation or toast with count of items added.

## Epic 4: Backend Download Logic

### Story 4.1: Implement YouTube download worker
- [ ] Create a download handler that accepts queue items with YouTube video IDs and resolutions.
- [ ] Use yt-dlp or similar to download the selected resolution.
- [ ] Save the file to the server downloads or cache directory.
- [ ] Store download metadata (video_id, title, resolution, file_path, timestamp).

### Story 4.2: Handle download errors and retries
- [ ] Catch and log errors during download (network issues, video unavailable, etc.).
- [ ] Update queue item status to "failed" with error message.
- [ ] Allow user to retry failed downloads.
- [ ] Implement exponential backoff for automatic retries.

### Story 4.3: Add download progress tracking
- [ ] Stream download progress from yt-dlp to the frontend via WebSocket or polling.
- [ ] Update queue item with percentage, ETA, and current resolution being fetched.

## Epic 5: Cache Management and Deduplication

### Story 5.1: Create YouTube-specific cache keys
- [ ] Normalize YouTube URLs to video IDs.
- [ ] Create cache keys based on video_id + resolution combination.
- [ ] Detect duplicate requests for the same video and resolution.

### Story 5.2: Implement cache lookup and serving
- [ ] Before downloading, check if the video + resolution exists in cache.
- [ ] If cached, skip download and serve from cache directory.
- [ ] Add cache metadata (video_id, title, resolution, cached_timestamp, file_path).

### Story 5.3: Add cache status to results
- [ ] Display a "cached" badge or indicator on video items if already cached.
- [ ] Show cache details (when cached, file size, resolution) in UI tooltip or info panel.
- [ ] Allow user to force re-download or skip if cached.

## Epic 6: User Download Prompts and Delivery

### Story 6.1: Add download prompt after completion
- [ ] When a YouTube video download completes on the server, send a prompt to the user.
- [ ] Display video title, resolution, file size, and format.
- [ ] Provide "Download Now" and "Keep on Server" options.
- [ ] Add a link to download the file from the server.

### Story 6.2: Implement server file serving
- [ ] Create GET endpoint `/api/download/:fileId` to serve downloaded files.
- [ ] Set proper Content-Type and Content-Disposition headers for browser download.
- [ ] Add file size limits and cleanup policies for old cached files.

### Story 6.3: Track download history for YouTube
- [ ] Record each completed YouTube download in history.json with: video_id, title, resolution, file_path, downloaded_by (user), timestamp.
- [ ] Display YouTube downloads in the history/dashboard with YouTube-specific formatting.

## Epic 7: Testing and Quality

### Story 7.1: Add unit tests for YouTube adapter
- [ ] Test URL validation and type detection (video, playlist, channel).
- [ ] Test metadata parsing for various YouTube URL types.
- [ ] Test resolution extraction and formatting.
- [ ] Test cache key generation and deduplication logic.

### Story 7.2: Add integration tests
- [ ] Test end-to-end flow: paste YouTube URL → parse → select resolution → queue → download → prompt.
- [ ] Test batch download flow: paste playlist URL → parse → select videos → queue → download all.
- [ ] Test cache serving for duplicate requests.

### Story 7.3: Handle edge cases
- [ ] Test with private/unavailable videos (proper error messages).
- [ ] Test with very large playlists (pagination and limits).
- [ ] Test with deleted or moved videos.
- [ ] Test network timeouts and partial downloads.

## Epic 8: Polish and Optimization

### Story 8.1: Optimize metadata fetching
- [ ] Implement parallel fetching for batch URLs to reduce total time.
- [ ] Add caching of fetched metadata (not just files) to avoid repeated API calls.
- [ ] Add rate-limiting to respect YouTube/API quotas.

### Story 8.2: Improve UI/UX for YouTube mode
- [ ] Add YouTube-specific styling (YouTube colors, branding where appropriate).
- [ ] Show channel thumbnails and subscriber counts for context.
- [ ] Add keyboard shortcuts for selecting/deselecting in batch mode.
- [ ] Display download quality recommendations based on video length and device.

### Story 8.3: Add YouTube-specific features
- [ ] Support audio-only extraction (MP3) as a format option.
- [ ] Add subtitle/caption download option.
- [ ] Support video timestamp ranges (e.g., download only 2:30-5:45 of a video).
- [ ] Add recommended related videos suggestions based on user history.
