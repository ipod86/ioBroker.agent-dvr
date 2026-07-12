# Older Changelog

<!-- older entries moved here by release-script -->
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
