# Older Changelog

<!-- older entries moved here by release-script -->
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
