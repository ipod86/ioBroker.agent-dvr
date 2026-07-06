![Logo](admin/agent-dvr.png)
# ioBroker.agent-dvr

[![NPM version](https://img.shields.io/npm/v/iobroker.agent-dvr.svg)](https://www.npmjs.com/package/iobroker.agent-dvr)
[![Downloads](https://img.shields.io/npm/dm/iobroker.agent-dvr.svg)](https://www.npmjs.com/package/iobroker.agent-dvr)
![Number of Installations](https://iobroker.live/badges/agent-dvr-installed.svg)
![Current version in stable repository](https://iobroker.live/badges/agent-dvr-stable.svg)

[![NPM](https://nodei.co/npm/iobroker.agent-dvr.png?downloads=true)](https://nodei.co/npm/iobroker.agent-dvr/)

**Tests:** ![Test and Release](https://github.com/ipod86/ioBroker.agent-dvr/workflows/Test%20and%20Release/badge.svg)

## agent-dvr adapter for ioBroker

Connects ioBroker to [AgentDVR](https://www.ispyconnect.com): auto-discovers all cameras, mirrors every device property as data points, provides buttons for all common commands (record, arm, PTZ, …), delivers push-triggered gallery updates on new recordings, generates a responsive HTML gallery widget per camera, and includes a built-in live dashboard with per-camera stream selection (MJPEG, MP4/FLV with audio, or go2rtc WebRTC).

## Features

- Auto-discovery of all AgentDVR cameras on startup (microphones excluded)
- All device properties mirrored as data points (flattened from the API)
- Per-device control buttons: record, snapshot, detect, arm/disarm alerts, switch on/off, object detection, schedule on/off, detector on/off, sensitivity (min/max/gain), purge, …
- System-level buttons: arm, disarm, all on/off, reload, storage management, restart, …
- **Profile selector** — writable dropdown reflecting the current AgentDVR profile (Home / Away / Night / custom)
- **Snapshot as Base64** — `snapshot_b64` state per camera, writable via button or auto-updated every poll cycle
- PTZ control with hold-to-move switches
- Stream URLs per camera (snapshot, photo, MJPEG, MP4)
- Push trigger state for real-time script reactions to new recordings
- HTML gallery widget per camera (pure HTML/CSS or full JS mode with search and tag filter)
- Overview widget combining all cameras in one HTML state
- **Built-in live dashboard** at `http://<iobroker>:<webport>/agent-dvr/` — no additional app needed:
  - Per-camera stream selection: MJPEG, MP4/FLV with audio, or go2rtc WebRTC/MSE
  - Camera filter badges to show/hide individual cameras (state saved in localStorage)
  - Real-time motion and alert indicators (yellow / orange tile border) via Socket.io
  - Fullscreen view with PTZ overlay, record, mute, and native browser fullscreen button; header auto-hides
  - Recordings tab with grid and timeline view, search, collapsible tag filter, and video player
  - Auto-reconnect for all stream types after network interruption or tab switch
  - Fully color-themeable via adapter config

## Configuration

### Tab: Connection

| Setting | Description | Default |
|---------|-------------|---------|
| AgentDVR IP | IP address of the AgentDVR server | — |
| Port | AgentDVR HTTP port | `8090` |
| Username | Optional HTTP basic auth username | — |
| Password | Optional HTTP basic auth password | — |
| Poll interval (s) | How often to fetch data from AgentDVR (5–3600) | `30` |
| HTTP timeout (ms) | Timeout per API request (1000–30000) | `8000` |

### Tab: Features

**Controls**

| Setting | Description | Default |
|---------|-------------|---------|
| System control buttons | Create arm/disarm/restart/… buttons and the profile selector | `true` |
| PTZ control buttons | Create per-camera PTZ hold-switches (left, right, up, down, diagonals, zoom, stop, center) | `true` |
| Generate stream URLs | Create URL states (snapshot, MJPEG, MP4) per camera | `true` |
| Snapshot as Base64 | Auto-fetch and store the current frame as Base64 on every poll | `false` |

**Events**

| Setting | Description | Default |
|---------|-------------|---------|
| Event data points | Mirror recording metadata (latest event, count, tags, …) per camera | `true` |
| Real-time push trigger | Create a push-trigger state that scripts can subscribe to for new recordings | `true` |

**Display**

| Setting | Description | Default |
|---------|-------------|---------|
| Overview widget | Single HTML state combining all camera live tiles | `true` |

**Debug**

| Setting | Description | Default |
|---------|-------------|---------|
| Store raw API JSON | Write the full getObjects response to `system.raw_getObjects` | `false` |

### Tab: Dashboard

**Default view**

| Setting | Description | Default |
|---------|-------------|---------|
| Default view | Which tab opens when the dashboard loads: Live or Recordings | `Live` |
| Show offline cameras | Display camera tiles even when the camera is offline | `true` |

**Camera grid**

| Setting | Description | Default |
|---------|-------------|---------|
| Columns | Number of grid columns (0 = auto-fit based on tile width) | `0` |
| Buttons always visible | Show record/PTZ buttons permanently instead of on hover only | `false` |
| Tag-badge position | Corner where the camera name badge appears on each tile | `bottom-right` |

**Stream**

| Setting | Description | Default |
|---------|-------------|---------|
| Refresh interval (s) | How often the dashboard re-fetches camera data (10–600) | `60` |
| Auto-reconnect streams | Automatically reconnect MJPEG, MP4/FLV and go2rtc streams after an error or tab switch | `true` |

**Color theme** — 7 color pickers to match your UI:

| Setting | Description |
|---------|-------------|
| Background | Page/grid background color |
| Surface | Camera tile background |
| Accent | Highlight / active element color |
| Text | Primary text color |
| Border | Tile border color |
| Online indicator | Color of the online status dot |
| Offline indicator | Color of the offline status dot |

**Stream assignment**

Here you assign a stream source to each camera individually. The dropdown shows all cameras discovered from AgentDVR (microphones are excluded).

| Option | Description |
|--------|-------------|
| MJPEG *(AgentDVR)* | Classic MJPEG stream served by AgentDVR — lowest latency, no audio |
| MP4 / FLV with audio *(AgentDVR)* | FLV stream proxied through ioBroker using flv.js — includes audio, correct aspect ratio |
| *stream name* *(go2rtc)* | WebRTC/MSE stream from go2rtc — smooth, low latency, audio support |

The go2rtc stream names are fetched automatically from the go2rtc server when the admin UI is open. If the browser cannot reach go2rtc directly (e.g. mixed-content on HTTPS), the adapter fetches them on the server side as a fallback.

**go2rtc URL** *(only visible when at least one camera uses a go2rtc stream)*

| Setting | Description | Example |
|---------|-------------|---------|
| go2rtc URL | Base URL of your go2rtc instance | `http://192.168.1.10:1984` |

> **Note:** go2rtc must already have the streams configured. The adapter only reads the stream list and proxies the WebSocket — it does not configure go2rtc.

### Tab: Widget (gallery widget per camera)

**General**

| Setting | Description | Default |
|---------|-------------|---------|
| Enable widget | Generate an HTML gallery widget per camera | `true` |
| Widget mode | `No JS` — pure HTML/CSS, embed anywhere; `JS` — full interactivity with search and tag filter | `No JS` |

**Layout**

| Setting | Description | Default |
|---------|-------------|---------|
| Max. entries | Maximum number of recordings shown in the widget | `20` |
| Min. column width (px) | Minimum width of each thumbnail column | `150` |
| Max. modal width (px) | Maximum width of the video playback modal | `900` |

**Tags**

| Setting | Description | Default |
|---------|-------------|---------|
| Show tags | Display recording tags on each thumbnail | `true` |
| Tag-badge position | Corner where tags appear on the thumbnail | `bottom-left` |

**Filter**

| Setting | Description | Default |
|---------|-------------|---------|
| Newest first | Sort recordings with the latest at the top | `true` |
| Show search | Show a text search field in JS mode | `false` |
| Compact mode | Denser layout with smaller thumbnails | `false` |
| Default tag | Pre-select this tag filter when the widget loads | — |
| Thumbnail size | `Small` / `Medium` / `Large` | `Medium` |

**Player**

| Setting | Description | Default |
|---------|-------------|---------|
| Live aspect ratio | Aspect ratio for the live stream preview, e.g. `16/9` | — |
| Player URL | Custom URL for the video player used in the widget | — |

**Color theme** — 5 color pickers + border radius:

| Setting | Description |
|---------|-------------|
| Card background | Widget card background |
| Tag background | Tag chip background |
| Tag text | Tag chip text color |
| Accent | Highlight color |
| Modal background | Video modal background |
| Border radius (px) | Rounded corner radius for cards | `4` |

### Tab: Advanced

| Setting | Description | Default |
|---------|-------------|---------|
| Max. recursion depth | How many levels deep the API JSON is flattened into data points (1–10) | `6` |
| Max. array entries | Maximum number of array elements mirrored per property (1–500) | `30` |
| Dynamic tags | Automatically create a tag data point for every unique recording tag | `false` |
| Ignore tags (comma-separated) | Recording tags to exclude from event data points | — |
| Tag filter (comma-separated) | Only create event data points for recordings matching these tags | — |

## Live Dashboard

The adapter ships a built-in live dashboard at `http://<iobroker>:<webport>/agent-dvr/`.

**Features:**
- Per-camera stream selection: MJPEG, MP4/FLV with audio (via flv.js), or go2rtc WebRTC/MSE
- Camera filter badges — click to show/hide individual cameras; state persisted in localStorage
- Fullscreen view with PTZ overlay, record button, mute button, and **native browser fullscreen** (header auto-hides after 3 s of inactivity; reappears on mouse or touch)
- Real-time motion (yellow border) and alert (orange border) indicators via Socket.io
- Auto-reconnect: MJPEG and FLV reconnect after error; go2rtc reconnects after unexpected WebSocket close or 10 s stall
- Recordings tab with grid and timeline view, search, **collapsible tag filter**, and video player with prev/next navigation
- Color theming via adapter config

### go2rtc WebRTC Streams

[go2rtc](https://github.com/AlexxIT/go2rtc) provides smooth, low-latency WebRTC/MSE streams with audio.

**Setup:**
1. Install and run go2rtc, configure your camera streams in go2rtc's config.
2. In the adapter config → *Dashboard* tab, assign the desired go2rtc stream name to each camera from the dropdown.
3. Enter the **go2rtc URL** that appears below the table (e.g. `http://192.168.1.10:1984`).
4. Save and restart. The adapter proxies WebSocket traffic through ioBroker to avoid browser cross-origin restrictions.

## Data points

`<cam>` stands for `cam_<oid>_<name>`, e.g. `cam_8_Reolink`.

### System

| Data point | Type | R/W | Description |
|-----------|------|-----|-------------|
| `system.online` | boolean | R | Connection to AgentDVR established |
| `system.lastUpdate` | string | R | ISO timestamp of last successful poll |
| `system.lastPoll` | number | R | Unix timestamp of last poll |
| `system.cameraCount` | number | R | Number of cameras discovered |
| `system.disk_free_gb` | number | R | Free disk space in GB |
| `system.settings.*` | various | R | Flattened AgentDVR server settings |
| `system.stats.*` | various | R | CPU / RAM / disk stats |
| `system.status.*` | various | R | System status (armed, devices, version, …) |
| `system.raw_getObjects` | string | R | Raw getObjects JSON (if enabled) |

### System controls *(requires "System control buttons")*

| Data point | Type | R/W | Description |
|-----------|------|-----|-------------|
| `system.control.arm` | button | W | Arm the system |
| `system.control.disarm` | button | W | Disarm the system |
| `system.control.allOn` | button | W | Switch all devices on |
| `system.control.allOff` | button | W | Switch all devices off |
| `system.control.reloadConfig` | button | W | Reload AgentDVR configuration |
| `system.control.reloadObjects` | button | W | Reload objects |
| `system.control.runStorageMgmt` | button | W | Run storage management |
| `system.control.blockExternal` | button | W | Block external access |
| `system.control.unblockExternal` | button | W | Unblock external access |
| `system.control.restart` | button | W | Restart AgentDVR |
| `system.control.refresh` | button | W | Force immediate poll |
| `system.profile.selector` | number | R/W | Active profile index — dropdown (0 = Home, 1 = Away, …) |
| `system.profile.list` | string | R | Available profiles as JSON array |

### Per camera

| Data point | Type | R/W | Description |
|-----------|------|-----|-------------|
| `<cam>.name` | string | R | Camera name |
| `<cam>.data.online` | boolean | R | Camera is online |
| `<cam>.data.connected` | boolean | R | Stream is connected |
| `<cam>.data.recording` | boolean | R | Currently recording |
| `<cam>.data.detected` | boolean | R | Motion/object detected |
| `<cam>.data.detectorActive` | boolean | R | Motion detector enabled |
| `<cam>.data.alertsActive` | boolean | R | Alerts enabled |
| `<cam>.data.alerted` | boolean | R | Alert currently active |
| `<cam>.data.scheduleActive` | boolean | R | Schedule enabled |
| `<cam>.data.width` / `height` | number | R | Stream resolution |
| `<cam>.data.*` | various | R | All further device properties from AgentDVR |
| `<cam>.snapshot_b64` | string | R | Current frame as `data:image/jpeg;base64,…` (role `media.picture`) |
| `<cam>.control.record` | button | W | Start recording |
| `<cam>.control.recordStop` | button | W | Stop recording |
| `<cam>.control.recordRestart` | button | W | Restart recording |
| `<cam>.control.triggerRecord` | button | W | Trigger recording (runs until timeout) |
| `<cam>.control.snapshot` | button | W | Tell AgentDVR to save a snapshot to disk |
| `<cam>.control.refreshSnapshotB64` | button | W | Fetch current frame and write to `snapshot_b64` |
| `<cam>.control.detect` | button | W | Trigger motion detection |
| `<cam>.control.alertOn` | button | W | Arm alerts |
| `<cam>.control.alertOff` | button | W | Disarm alerts |
| `<cam>.control.switchOn` | button | W | Switch camera on |
| `<cam>.control.switchOff` | button | W | Switch camera off |
| `<cam>.control.objectDetectOn` | button | W | Enable object detection *(cameras only)* |
| `<cam>.control.objectDetectOff` | button | W | Disable object detection *(cameras only)* |
| `<cam>.control.scheduleOn` | button | W | Enable the device schedule |
| `<cam>.control.scheduleOff` | button | W | Disable the device schedule |
| `<cam>.control.detectorOn` | button | W | Enable the motion detector |
| `<cam>.control.detectorOff` | button | W | Disable the motion detector |
| `<cam>.control.sensitivityMin` | number 0–100 | R/W | Detector sensitivity — minimum threshold *(cameras only)* |
| `<cam>.control.sensitivityMax` | number 0–100 | R/W | Detector sensitivity — maximum threshold *(cameras only)* |
| `<cam>.control.sensitivityGain` | number 0–100 | R/W | Detector sensitivity — gain *(cameras only)* |
| `<cam>.control.recOnAlert` | button | W | Enable "record on alert" |
| `<cam>.control.recOnDetect` | button | W | Enable "record on detect" |
| `<cam>.control.purge` | button | W | Delete all recordings for this camera |

### PTZ *(requires "PTZ control buttons")*

| Data point | Type | R/W | Description |
|-----------|------|-----|-------------|
| `<cam>.control.ptz.left` | switch | R/W | Pan left (hold to keep moving) |
| `<cam>.control.ptz.right` | switch | R/W | Pan right |
| `<cam>.control.ptz.up` | switch | R/W | Tilt up |
| `<cam>.control.ptz.down` | switch | R/W | Tilt down |
| `<cam>.control.ptz.upLeft` | switch | R/W | Diagonal up-left |
| `<cam>.control.ptz.upRight` | switch | R/W | Diagonal up-right |
| `<cam>.control.ptz.downLeft` | switch | R/W | Diagonal down-left |
| `<cam>.control.ptz.downRight` | switch | R/W | Diagonal down-right |
| `<cam>.control.ptz.zoomIn` | switch | R/W | Zoom in |
| `<cam>.control.ptz.zoomOut` | switch | R/W | Zoom out |
| `<cam>.control.ptz.stop` | button | W | Stop PTZ movement |
| `<cam>.control.ptz.center` | button | W | Move to center/home position |

### Stream URLs *(requires "Generate stream URLs")*

| Data point | Type | R/W | Description |
|-----------|------|-----|-------------|
| `<cam>.urls.snapshot` | string | R | URL to current JPEG snapshot *(cameras only)* |
| `<cam>.urls.photo` | string | R | URL to photo endpoint *(cameras only)* |
| `<cam>.urls.mjpeg` | string | R | URL to MJPEG live stream *(cameras only)* |
| `<cam>.urls.mp4` | string | R | URL to MP4 live stream *(cameras only)* |
| `<mic>.urls.audio_mp3` | string | R | URL to MP3 audio stream *(microphones only)* |
| `<mic>.urls.audio_ogg` | string | R | URL to OGG audio stream *(microphones only)* |

### Events / Gallery *(cameras only)*

| Data point | Type | R/W | Description |
|-----------|------|-----|-------------|
| `<cam>.events.*` | various | R | Latest recording metadata — requires "Event data points" |
| `<cam>.push` | string | R | Push trigger — updated when AgentDVR reports a new recording — requires "Real-time push trigger" |
| `<cam>.gallery` | string | R | HTML recording gallery — requires "Gallery widget" |

### Overview *(requires "Overview widget")*

| Data point | Type | R/W | Description |
|-----------|------|-----|-------------|
| `overview` | string | R | HTML tile grid of all cameras |

## Changelog

<!--
	Placeholder for the next version (at the beginning of the line):
	### **WORK IN PROGRESS**
-->
### **WORK IN PROGRESS**
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

### 0.2.2 (2026-07-04)
* (ipod86) fix: translate remaining German strings in DashboardPanel to English via I18n.t()
* (ipod86) fix: add i18n keys loadingCamerasAndStreams, cfgCameraColumn, cfgStreamSourceColumn, reload in all 11 languages
* (ipod86) chore: replace POSIX mv with cross-platform node rename in src-admin build script

### 0.2.1 (2026-07-04)
* (ipod86) fix: translate all German user-facing strings and error messages to English
* (ipod86) fix: DashboardPanel shows i18n-aware messages for missing IP and empty camera list
* (ipod86) chore: add .npmignore to exclude src/ and src-admin/ from npm package

### 0.2.0 (2026-07-04)
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

### 0.1.0 (2026-07-01)
* (ipod86) feat: add full i18n to live dashboard — all UI strings translated into 11 languages
* (ipod86) fix: add missing sm/md/lg/xl size attributes to go2rtcMapping table in jsonConfig.json (E5507)
* (ipod86) fix: translate missing admin i18n keys into 9 languages (E5606)

### 0.0.6 (2026-07-01)
* (ipod86) docs: add Live Dashboard and go2rtc WebRTC sections to README

[Older changelog entries in CHANGELOG_OLD.md](CHANGELOG_OLD.md)

## License
MIT License

Copyright (c) 2026 ipod86 <david@graef.email>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
