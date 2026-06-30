# dw — Implementation Roadmap

## 1. Milestone 1 — Project Foundation

### Objectives
- Create the basic project structure for the frontend and backend.
- Establish a simple development workflow.
- Prepare directories for cache, history, queue state, and downloads.

### Tasks
- Create the main application entry points for the frontend and backend.
- Add a basic HTML shell with a modern layout foundation.
- Add a minimal stylesheet with dark mode support.
- Add a lightweight server entry point.
- Define project folders for:
  - public assets
  - frontend scripts
  - backend routes
  - data storage
  - downloads

### Deliverables
- A running local app shell.
- A backend that responds to a simple health endpoint.

## 2. Milestone 2 — Input and Parsing Flow

### Objectives
- Support the three initial input modes:
  - single URL
  - creator/channel input
  - multi-URL batch input

### Tasks
- Build the input form with three tabs or modes.
- Add request handling for parsing a single URL.
- Add request handling for creator/channel input.
- Add request handling for a list of URLs.
- Create a normalized key strategy for cache lookup.

### Deliverables
- Users can submit and receive parsed results for each supported input mode.

## 3. Milestone 3 — Rich Results Experience

### Objectives
- Make the parsed results feel modern, informative, and usable.

### Tasks
- Render results cards with:
  - title
  - thumbnail
  - duration
  - timestamp
  - available resolutions
  - format options
- Add preview and metadata surfaces where available.
- Add controls for selecting a preferred resolution and format.
- Add default selection behavior: best resolution and MP4 by default.

### Deliverables
- A polished results experience for each parsed item.

## 4. Milestone 4 — Caching Layer

### Objectives
- Avoid re-parsing the same source repeatedly.

### Tasks
- Implement disk-backed JSON cache storage.
- Store parsed metadata by normalized ID.
- Serve cached results when the same request is repeated.
- Add cache invalidation or refresh strategy for future enhancements.

### Deliverables
- Same-source requests reuse cached metadata from disk.

## 5. Milestone 5 — Queue and Sequential Downloads

### Objectives
- Enable users to queue and process downloads in order.

### Tasks
- Create a queue model and persistent queue file.
- Add queue add, list, and update operations.
- Implement a worker loop that processes one item at a time.
- Track statuses such as queued, downloading, completed, failed, and canceled.
- Update the UI from queue state.

### Deliverables
- Sequential batch downloads work reliably.

## 6. Milestone 6 — Dashboard and History

### Objectives
- Provide a usable history experience.

### Tasks
- Create a dashboard view for completed and failed downloads.
- Persist history in a JSON file.
- Show metadata such as title, source, date, resolution, format, and status.
- Add filters or simple sorting for history entries.

### Deliverables
- Users can review their downloads from a dedicated dashboard.

## 7. Milestone 7 — PWA and Polish

### Objectives
- Make the app feel like a modern installed experience.

### Tasks
- Add a web app manifest.
- Add a service worker for shell caching.
- Improve transitions, loading states, and empty-state screens.
- Refine the responsive layout and dark mode appearance.
- Improve queue feedback and error messages.

### Deliverables
- A polished installable web application experience.

## 8. Suggested Implementation Order

1. Create the basic frontend and backend shell.
2. Implement parsing support for single URLs.
3. Add creator and batch parsing.
4. Add the results UI with resolution and format selection.
5. Implement cache persistence.
6. Implement queue processing.
7. Implement history tracking.
8. Add PWA support and visual refinement.

## 9. Risks and Mitigations

### Risk: Source parsing complexity
Mitigation: start with reliable single-link parsing and expand once the core flow is stable.

### Risk: Cache inconsistencies
Mitigation: use clear normalized keys and simple write rules.

### Risk: Download failures
Mitigation: track per-item state and expose failures clearly in the UI.

### Risk: UI becomes too complex too early
Mitigation: keep the first milestone focused on the core workflow before adding heavy polish.
