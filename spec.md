# dw — Product Specification

## 1. Overview

dw is a modern, desktop-first web application for downloading Xhamster videos. It supports three primary input modes in v1:

- Single video URL
- Creator/channel URL or creator name
- A pasted list of multiple URLs

The experience should feel polished and highly usable while staying familiar across all entry points.

## 2. Goals

### Primary goals
- Provide a sleek, modern web app experience built with vanilla JavaScript and HTML5 on the frontend.
- Support all three input modes in v1 with a consistent UI pattern.
- Offer rich media metadata, including thumbnails, previews, duration, and resolution options.
- Enable batch downloading with sequential processing.
- Maintain a local dashboard/history view backed by JSON files.
- Cache parsed metadata and results on the server using flat files to avoid repeated work.

### Success criteria
- A user can paste a URL and immediately see available video options.
- A user can submit a creator/channel URL or name and receive a batch list of videos.
- A user can paste multiple URLs and receive a parsed result for each.
- The app feels fast, visually polished, and reliable.
- Repeated requests for the same video are served from cached server-side data.

## 3. Target Users

- Power users who want a fast and flexible downloader workflow
- Content creators who need to manage multiple downloads efficiently

## 4. Core Functional Requirements

### 4.1 Single URL Flow
- Accept a direct video URL.
- Parse the video and display available resolutions.
- Automatically select the best available resolution by default.
- Allow the user to override the resolution choice.
- Display title, duration, timestamp, thumbnail, and preview metadata where available.
- Provide a download action.

### 4.2 Creator/Channel Flow
- Accept a creator/channel URL or name.
- Parse the available videos for that creator/channel.
- Display each video with:
  - title
  - duration
  - available resolutions
  - thumbnail
  - preview metadata
  - checkbox for selection
- Allow the user to choose a resolution for each selected video.
- Download selected videos one after another in sequence.

### 4.3 Multi-URL Flow
- Accept a list of URLs.
- Parse each entry and show a result card or row for each URL.
- Display the same rich metadata and resolution options per entry.
- Allow users to download each entry individually or as a batch.

## 5. UX and UI Requirements

### 5.1 Interface style
- Keep the interface visually similar across all flows, even if not identical.
- Use a rich, polished experience with cards, panels, and modern layout.
- Desktop-first design with responsive behavior for smaller screens.
- Dark mode should be supported and feel first-class.
- Use subtle, polished animations for transitions, loading states, and queue updates.

### 5.2 Initial experience
- The app should feel lightweight and immediate on first use.
- The first interaction should be a simple input area for URLs or a list.
- The app should then expand into a richer dashboard experience after parsing begins.

### 5.3 Dashboard
- Include a dashboard that tracks downloaded items.
- Store dashboard/download history in a JSON file.
- Show at least:
  - item title
  - source URL
  - selected resolution
  - download date/time
  - status
  - output path or file reference

## 6. Media and Metadata Requirements

### 6.1 Metadata display
Each parsed video should include, where available:
- title
- thumbnail (prefer the largest available image)
- preview media
- duration
- timestamp
- resolution list
- source URL

### 6.2 Resolution handling
- The app should auto-select the best available resolution by default.
- The user should be able to change the selected resolution manually.
- MP4 should be the default format.
- WebM should be available as an optional alternative.
- The user should be able to switch between formats.

## 7. Download Workflow Requirements

### 7.1 Queue behavior
- Users should be able to queue multiple downloads.
- Downloads should run sequentially rather than in parallel.
- The app should show progress and current status for each item.

### 7.2 Status handling
- Show clear states such as:
  - queued
  - parsing
  - ready
  - downloading
  - completed
  - failed
  - canceled

### 7.3 Error handling
- Handle unsupported links, parsing failures, and fetch errors gracefully.
- Show concise, user-friendly error messages.
- Retry or fallback behavior should be implemented where appropriate.

## 8. Caching and Data Storage Requirements

### 8.1 Server-side cache
- Parsed media metadata should be cached on the server.
- If another user requests the same video, the app should serve cached metadata from the server rather than re-parsing it.
- Cache storage should use a flat-file system.

### 8.2 Suggested storage model
- Use JSON files stored on disk for:
  - cache metadata
  - download history
  - queue state
- Cache entries should be keyed by a normalized identifier derived from the source URL.

### 8.3 History persistence
- Download history should be stored in a JSON file.
- This history should be readable by the dashboard.

## 9. Technical Requirements

### 9.1 Frontend
- Built with vanilla JavaScript, HTML5, and CSS.
- No heavy framework is required for v1.

### 9.2 Backend
- A backend is required for parsing, caching, queue handling, and history persistence.
- The preferred approach is a lightweight server that exposes REST-style endpoints.
- The backend should be able to write to the local filesystem for caching and history.

### 9.3 PWA support
- The application should be installable as a Progressive Web App.
- Support offline shell behavior where practical.

### 9.4 Accessibility
- Accessibility is not required for v1.

## 10. Non-Functional Requirements

- The app should feel fast and responsive.
- The UI should be polished and modern.
- The system should handle repeated requests efficiently using cache.
- The backend should be robust to temporary failures and malformed input.
- The download workflow should be predictable and easy to follow.

## 11. Out of Scope for v1

- Advanced subtitle support
- Audio-only download modes beyond optional format support
- Full cross-platform desktop packaging
- Complex user accounts or authentication

## 12. Proposed Implementation Direction

- Frontend: vanilla JavaScript + HTML5 + CSS
- Backend: lightweight server with file-based storage
- Storage: JSON files for cache and history
- UI: dark mode, rich cards, animated feedback, queue-driven workflow
- PWA: installable web app with service worker support
