# dw — UI/UX Spec

## 1. Design Vision

dw should feel like a polished desktop utility, not a basic web form. The interface should borrow the clarity and structure of a VS Code workspace: a calm dark theme, strong information hierarchy, compact controls, and clear separation between navigation, content, and status.

The experience should feel fast, focused, and professional for power users who want to queue and manage downloads efficiently.

## 2. Core Design Principles

- Keep the interface minimal and structured.
- Favor clarity over visual noise.
- Use a strong dark theme with subtle contrast and depth.
- Make the primary workflow obvious in one glance.
- Show progress, state, and errors without clutter.
- Support a desktop-first workflow with responsive fallback behavior.

## 3. Visual Style

### Color system
- Primary background: deep slate / editor-like dark surface
- Secondary surfaces: slightly lighter panels for cards and sidebars
- Accent color: electric blue or cyan for primary actions and active states
- Muted text: lower contrast for helper text and metadata
- Warning/error colors: amber and red for failed or caution states

### Typography
- Use a clean sans-serif system similar to developer tooling interfaces.
- Titles should be concise and scannable.
- Metadata should be compact and secondary.

### Spacing and layout
- Dense but breathable spacing.
- Consistent padding scales for cards, panels, and controls.
- Clear section separation with borders, elevation, and subtle shadows.

## 4. Layout Structure

### Overall shell
The app should follow a three-region layout:

1. Left sidebar
   - Navigation for Home, Queue, History, Settings
   - Compact icon and label style
   - Active state clearly highlighted

2. Main content area
   - A central workspace that changes based on the active view
   - Includes the primary form, results, and dashboard panels

3. Right or bottom detail pane
   - Shows queue status, current download progress, and recent activity
   - Can collapse when not needed

### VS Code-inspired treatment
- Sidebar looks like an activity pane or explorer
- Main content resembles an editor workspace
- Status bar at the bottom for connection state, queue status, and quick actions
- Tabs for input modes or workspace views

## 5. Primary Views

### Home / Input view
This is the main entry point.

It should include:
- A compact input bar for single URL, creator, or batch list
- Quick mode switcher with tabs or segmented controls
- A result area that expands below the input area
- Helpful empty state when no parse has happened yet

### Dashboard view
The dashboard should be a first-class view, not a secondary panel.

It should include:
- Summary cards for total downloads, completed, failed, and queued items
- Recent activity feed
- Queue snapshot
- Recent history entries
- Quick actions like Retry, Clear, and Open output folder

### Queue view
- Transparent, structured list of queued and active downloads
- Each item shows status, progress, title, resolution, and timestamp
- Failed items should be visually distinct and easy to inspect

### History view
- A clean timeline or list of completed and failed jobs
- Filter options for all, completed, failed, queued
- Sorting by newest first
- Clear metadata per entry

## 6. Component Guidelines

### Buttons
- Primary actions should use the accent color
- Secondary actions should be lower-emphasis and muted
- Danger actions should be red and explicit

### Form controls
- Inputs should feel native and compact
- Selects, toggles, and dropdowns should align with the editor-like visual language
- Validation errors should be inline and concise

### Cards
- Results and history entries should appear as lightweight cards or rows
- Cards should have consistent spacing, a subtle border, and hover feedback
- Empty states should be visually calm and instructive

## 7. Interaction and UX Patterns

### Input flow
- The workflow should feel immediate and guided.
- The app should progress from input to results to queue without sudden layout jumps.
- Clear status feedback should appear during parsing and queue processing.

### Loading states
- Use skeletons or subtle shimmer effects for loading content
- Keep the UI responsive while data loads

### Error states
- Errors should be visible, specific, and non-blocking
- Show retry options when relevant

### Success states
- Completed items should feel rewarding, but not noisy
- A small confirmation state is enough

## 8. Dashboard Experience

The dashboard should act like a control center.

Suggested sections:
- Overview tiles
  - Total items
  - Completed today
  - Failed items
  - Queue length
- Recent activity
  - Most recent jobs with status and timestamp
- Queue preview
  - Current item and next item
- Quick actions
  - Process queue
  - Retry failed
  - Clear completed

This should make the app feel more like a utility workspace and less like a single page form.

## 9. Motion and Polish

- Use small transitions for hover, focus, and panel changes
- Avoid over-animation; keep it polished and subtle
- Changes should feel responsive rather than flashy

## 10. Accessibility and Responsiveness

- Maintain strong contrast for readability
- Ensure keyboard focus is visible
- Keep layouts usable on tablets and narrower screens
- Preserve the desktop-first feel while making the app responsive

## 11. Suggested Implementation Direction

Phase 1
- Introduce the VS Code-inspired shell: sidebar, main workspace, top toolbar, and status bar

Phase 2
- Add the dashboard with summary cards and recent activity

Phase 3
- Refine form panels, queue rendering, and history items to match the new visual language

## 12. Questions to Improve the UI/UX

- Do you want the app to feel more like a developer tool or more like a media dashboard?
- Should the sidebar contain icons only, or icons plus labels?
- Would you like a dedicated command bar or quick actions area for common tasks?
- Should the dashboard show a compact activity graph, recent downloads, or both?
- Do you want the queue to appear inline in the dashboard or as a separate full view?
- Would you prefer a more minimal layout or a richer, more information-dense workspace?
- Should the app support light mode as well, or remain dark-only for now?
