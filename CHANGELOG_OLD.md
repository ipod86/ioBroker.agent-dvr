# Older Changelog

<!-- older entries moved here by release-script -->
## 0.5.0 (2026-08-03)
* (ipod86) feat: replace live-view camera chip-bar with compact header filter button — funnel icon opens a popover with per-camera checkboxes and drag-to-reorder; order persisted in localStorage
* (ipod86) feat: new-recordings badge on the Recordings tab — shows count of recordings since last visit; persisted per browser/device in localStorage
* (ipod86) feat: recording display settings panel — ⚙ gear button in the select/delete bar; grid column width slider, max-recordings override, badge toggle (all persisted in localStorage)
* (ipod86) feat: first-visit onboarding modals for live view (camera filter & sort) and recordings tab (gestures, gear panel, badge)
* (ipod86) feat: webhook endpoint `/agent-dvr.0/webhook` triggers immediate full poll — configure as AgentDVR action for real-time updates
* (ipod86) feat: PTZ presets — navigate to saved presets from PTZ overlay; single selector DP `<cam>.control.ptz.preset` per camera (requires AgentDVR v7.7.8.0+)
* (ipod86) feat: add event log view to recordings panel (clock icon toggle) alongside grid and timeline
* (ipod86) feat: delete recording from video modal (trash icon, two-click confirm, requires AgentDVR v7.7.8.0+)
* (ipod86) feat: bulk-delete recordings — long-press a tile to enter select mode, checkbox each recording, delete all at once
* (ipod86) feat: new `dashMaxRec` config setting — limits total recordings shown across all cameras in the dashboard (independent of widget limit, default 200)
* (ipod86) feat: tag filter splits AgentDVR's comma-separated tags into individual chips for per-tag filtering
* (ipod86) feat: read camera color from AgentDVR and use it for timeline bars and recording dots
* (ipod86) feat: status bar shows CPU usage, RAM % and free, disk usage % and free alongside camera/recording counts
* (ipod86) feat: reset colors to defaults button in Live Dashboard settings tab
* (ipod86) refactor: remove per-camera pushTrigger data points in favour of the global webhook
* (ipod86) fix: new-recordings badge now correctly visible (display:none CSS fallback fixed)
* (ipod86) fix: record button moved to rightmost position in grid tiles and fullscreen panel
* (ipod86) fix: camera filter button no longer changes appearance when cameras are hidden
* (ipod86) fix: header z-index lifted so the camera filter popover renders above the main content area
* (ipod86) fix: drive object pruning regex corrected; stale drive entries are now properly removed
* (ipod86) fix: deleted recordings no longer reappear after the next adapter poll
* (ipod86) fix: extend video format error message with AgentDVR auto-convert hint in all 11 languages
* (ipod86) fix: FLV stream and grid tile layout scaling corrections
* (ipod86) fix: Italian i18n string with apostrophe broke page JS (changed to escaped variant)
* (ipod86) fix: detect AgentDVR "Command not found" response on delete and show proper error message

## 0.4.3 (2026-07-19)
* (ipod86) fix: switch polling loop from setInterval to setTimeout to prevent concurrent poll runs
* (ipod86) fix: httpTimeoutMs=0 now correctly clamps to 1000ms instead of falling back to default
* (ipod86) fix: go2rtcEnabled config flag is now honored in fetchGo2rtcStreams
* (ipod86) fix: remove unused isSupportedLang export from widget-i18n

## 0.4.2 (2026-07-12)
* (ipod86) fix: FLV stream proxy now sends Authorization header (HTTP 401 with AgentDVR auth)
* (ipod86) fix: dashboard camera online status was read from wrong state path (data.online → status.online)
* (ipod86) fix: MP4/FLV stream label was hardcoded German — now translated in all 11 languages
* (ipod86) fix: admin UI default values now match io-package.json (dashTagPosition, widgetAnzahl, widgetBorderRadius)
* (ipod86) fix: go2rtcEnabled flag now respected when loading streams in admin UI
* (ipod86) fix: enableStreamProxy missing from native defaults in io-package.json

## 0.4.1 (2026-07-12)
* (ipod86) fix: overview tile links to ioBroker host; go2rtc URL shown only when enabled

## 0.4.0 (2026-07-12)
* (ipod86) feat: optional MJPEG and snapshot stream proxy through ioBroker (browser needs only one connection to ioBroker, not directly to AgentDVR)

## 0.3.0 (2026-07-06)
* (ipod86) feat: add scheduleOn/Off and detectorOn/Off control buttons for cameras and microphones
* (ipod86) feat: add sensitivityMin, sensitivityMax, sensitivityGain level states for cameras (0–100)
* (ipod86) feat: add audio_mp3 and audio_ogg URL states for microphones
* (ipod86) fix: restrict objectDetectOn/Off and snapshot buttons to cameras (ot=2) only
* (ipod86) feat: inline flv.js into dashboard HTML — no external file required
* (ipod86) fix: preserve FLV stream aspect ratio after tab visibility change (all three player call sites)
* (ipod86) feat: collapsible tag filter row on recordings and timeline pages
* (ipod86) feat: native browser fullscreen button in live view modal with correct aspect ratio
* (ipod86) feat: live view modal header auto-hides after 3 s of inactivity; reappears on mouse/touch
* (ipod86) fix: add fsEnter, fsExit, filterByLabel, timelineView, closePanel i18n keys in all 10 languages

## 0.2.1 (2026-07-04)
* (ipod86) fix: translate all German user-facing strings and error messages to English
* (ipod86) fix: DashboardPanel shows i18n-aware messages for missing IP and empty camera list
* (ipod86) chore: add .npmignore to exclude src/ and src-admin/ from npm package

## 0.2.2 (2026-07-04)
* (ipod86) fix: translate remaining German strings in DashboardPanel to English via I18n.t()
* (ipod86) fix: add i18n keys loadingCamerasAndStreams, cfgCameraColumn, cfgStreamSourceColumn, reload in all 11 languages
* (ipod86) chore: replace POSIX mv with cross-platform node rename in src-admin build script

## 0.2.1 (2026-07-04)
* (ipod86) fix: translate all German user-facing strings and error messages to English
* (ipod86) fix: DashboardPanel shows i18n-aware messages for missing IP and empty camera list
* (ipod86) chore: add .npmignore to exclude src/ and src-admin/ from npm package

## 0.2.0 (2026-07-04)
* (ipod86) feat: dashboard camera filter badges with localStorage persistence
* (ipod86) feat: FLV/MP4 stream auto-reconnect after network error (5 s delay)
* (ipod86) feat: go2rtc WebSocket auto-reconnect after unexpected disconnect (5 s delay)
* (ipod86) feat: go2rtc stall detection — retry if stream stays black after 10 s
* (ipod86) fix: cameraStreams missing from io-package.json native defaults (settings not saved)
* (ipod86) fix: adminUI.config "custom" → "materialize" (404 on adapter settings page)
* (ipod86) fix: remove resolution overlay on FLV stream load
* (ipod86) fix: remove CDN fallback for flv.js — local copy only
* (ipod86) fix: remove AgentDVR/go2rtc section headers from dashboard grid
* (ipod86) fix: cfgGo2rtcMapping_tt tooltip corrected in all 11 languages
* (ipod86) fix: plain setTimeout() replaced by this.setTimeout() (E5005)
* (ipod86) fix: remove obsolete jsonConfig.json — settings handled by React admin (W5046)
* (ipod86) chore: exclude admin/ directory from ESLint to prevent OOM in CI
* (ipod86) docs: rewrite README and README.de with all tabs and settings documented

## 0.1.0 (2026-07-01)
* (ipod86) feat: add full i18n to live dashboard — all UI strings translated into 11 languages
* (ipod86) fix: add missing sm/md/lg/xl size attributes to go2rtcMapping table in jsonConfig.json (E5507)
* (ipod86) fix: translate missing admin i18n keys into 9 languages (E5606)

## 0.0.6 (2026-07-01)
* (ipod86) docs: add Live Dashboard and go2rtc WebRTC sections to README

## 0.0.5 (2026-07-01)
* (ipod86) feat: go2rtc WebRTC stream integration — per-camera mapping table in admin, ioBroker WebSocket proxy to bypass browser cross-origin restrictions
* (ipod86) feat: auto-delete camera/microphone data points when device is removed from AgentDVR
* (ipod86) feat: dedicated `status.*` data points per camera
* (ipod86) feat: dashboard — full color theming, configurable tag-badge corner position
* (ipod86) feat: dashboard — record/stop button on camera tiles and in fullscreen panel
* (ipod86) feat: dashboard — real-time motion and alert indicators via Socket.io
* (ipod86) feat: dashboard — recording timeline view
* (ipod86) feat: dashboard — PTZ and record buttons in fullscreen panel

## 0.0.4 (2026-06-27)
* (ipod86) fix: snapshot_b64 role corrected to `state` (E1008)
* (ipod86) fix: profile selector role corrected to `level` (E1011)

## 0.0.3 (2026-06-27)
* (ipod86) feat: profile selector — reads profiles from getObjects, writable dropdown with active profile reflected on every poll
* (ipod86) feat: snapshot_b64 state (media.picture) always present per camera + manual refresh button; auto-poll optional

## 0.0.2 (2026-06-27)
* (ipod86) setup npm trusted publishing and fix repochecker findings

## 0.0.1 (2026-06-27)
* (ipod86) initial release
