![Logo](admin/agent-dvr.png)
# ioBroker.agent-dvr

[![NPM version](https://img.shields.io/npm/v/iobroker.agent-dvr.svg)](https://www.npmjs.com/package/iobroker.agent-dvr)
[![Downloads](https://img.shields.io/npm/dm/iobroker.agent-dvr.svg)](https://www.npmjs.com/package/iobroker.agent-dvr)
![Number of Installations](https://iobroker.live/badges/agent-dvr-installed.svg)
![Current version in stable repository](https://iobroker.live/badges/agent-dvr-stable.svg)

[![NPM](https://nodei.co/npm/iobroker.agent-dvr.png?downloads=true)](https://nodei.co/npm/iobroker.agent-dvr/)

**Tests:** ![Test and Release](https://github.com/ipod86/ioBroker.agent-dvr/workflows/Test%20and%20Release/badge.svg)

## agent-dvr adapter for ioBroker

Connects ioBroker to [AgentDVR](https://www.ispyconnect.com): auto-discovers all cameras and microphones, mirrors every device property as data points, provides buttons for all common commands (record, arm, PTZ, …), delivers push-triggered gallery updates on new recordings, and generates a responsive HTML gallery widget per camera.

## Features

- Auto-discovery of all AgentDVR cameras and microphones on startup
- All device properties mirrored as data points (flattened from the API)
- Per-device control buttons: record, snapshot, detect, arm/disarm alerts, switch on/off, object detection, purge, …
- System-level buttons: arm, disarm, all on/off, reload, storage management, restart, …
- **Profile selector** — writable dropdown that reflects the current AgentDVR profile (Home / Away / Night / custom); changes apply immediately
- **Snapshot as Base64** — `snapshot_b64` state (role `media.picture`) per camera, writable via button or auto-updated every poll cycle
- PTZ control with hold-to-move switches (left, right, up, down, diagonals, zoom in/out, stop, center)
- Stream URLs per camera (snapshot, photo, MJPEG, MP4)
- Push trigger state — ioBroker scripts can react instantly when AgentDVR reports a new recording
- HTML gallery widget per camera (pure HTML/CSS or full JS mode with search and tag filter)
- Overview widget combining all cameras in one HTML state
- Raw API JSON state for advanced use cases

## Configuration

| Setting | Description | Default |
|---------|-------------|---------|
| AgentDVR IP | IP address of the AgentDVR server | — |
| Port | AgentDVR port | `8090` |
| Username / Password | Optional HTTP basic auth | — |
| Poll interval (s) | How often to fetch data from AgentDVR | `30` |
| HTTP timeout (ms) | Timeout per API request | `8000` |
| System control buttons | Create arm/disarm/restart/… buttons and the profile selector | `true` |
| PTZ control buttons | Create per-camera PTZ hold-switches | `true` |
| Generate stream URLs | Create URL states (snapshot, MJPEG, MP4) per camera | `true` |
| Snapshot as Base64 | Auto-fetch and store the current frame as Base64 on every poll | `false` |
| Event data points | Mirror recording metadata (latest event, count, …) | `true` |
| Real-time push trigger | Create push-trigger state that scripts can subscribe to | `true` |
| Overview widget | Single HTML state combining all camera live tiles | `true` |
| Gallery widget per camera | HTML recording gallery per camera | `true` |
| Store raw API JSON | Write the full getObjects response to `system.raw_getObjects` | `false` |

## Data points

The adapter creates the following data point tree. `<cam>` stands for `cam_<oid>_<name>`, e.g. `cam_8_Reolink`. Microphones use the same layout but with prefix `mic_<oid>_<name>`.

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
| `system.profile.selector` | number | R/W | Active profile index — dropdown populated from AgentDVR (0 = Home, 1 = Away, …) |
| `system.profile.list` | string | R | Available profiles as JSON array |

### Per camera / microphone

The raw device data from AgentDVR is mirrored recursively (depth configurable, default 6). The most important sub-tree is `<cam>.data.*`:

| Data point | Type | R/W | Description |
|-----------|------|-----|-------------|
| `<cam>.name` | string | R | Device name |
| `<cam>.data.online` | boolean | R | Device is online |
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
| `<cam>.control.switchOn` | button | W | Switch device on |
| `<cam>.control.switchOff` | button | W | Switch device off |
| `<cam>.control.objectDetectOn` | button | W | Enable object detection |
| `<cam>.control.objectDetectOff` | button | W | Disable object detection |
| `<cam>.control.recOnAlert` | button | W | Enable "record on alert" |
| `<cam>.control.recOnDetect` | button | W | Enable "record on detect" |
| `<cam>.control.purge` | button | W | Delete all recordings in the device folder |

### PTZ *(cameras only, requires "PTZ control buttons")*

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

### Stream URLs *(cameras only, requires "Generate stream URLs")*

| Data point | Type | R/W | Description |
|-----------|------|-----|-------------|
| `<cam>.urls.snapshot` | string | R | URL to current JPEG snapshot (`/grab.jpg`) |
| `<cam>.urls.photo` | string | R | URL to photo endpoint (`/photo.jpg`) |
| `<cam>.urls.mjpeg` | string | R | URL to MJPEG live stream (`/video.mjpg`) |
| `<cam>.urls.mp4` | string | R | URL to MP4 live stream (`/video.mp4`) |

### Events / Gallery *(cameras only)*

| Data point | Type | R/W | Description |
|-----------|------|-----|-------------|
| `<cam>.events.*` | various | R | Latest recording metadata (filename, date, duration, tags, …) — requires "Event data points" |
| `<cam>.push` | string | R | Push trigger — updated immediately when AgentDVR reports a new recording — requires "Real-time push trigger" |
| `<cam>.gallery` | string | R | HTML gallery of recent recordings — requires "Gallery widget" |

### Overview *(requires "Overview widget")*

| Data point | Type | R/W | Description |
|-----------|------|-----|-------------|
| `overview` | string | R | HTML tile grid of all cameras with live stream links |

## Snapshot as Base64

The `snapshot_b64` state stores the current camera frame as a `data:image/jpeg;base64,…` string so it can be used directly in vis/vis-2 image widgets without a separate HTTP request from the browser.

**Manual refresh:** Write `true` to `<cam>.control.refreshSnapshotB64` to fetch a new frame on demand — no adapter restart required.

**Auto-refresh:** Enable *"Snapshot as Base64"* in the adapter configuration to refresh automatically on every poll cycle.

## Changelog

<!--
	Placeholder for the next version (at the beginning of the line):
	### **WORK IN PROGRESS**
-->
### 0.0.4 (2026-06-27)
* (ipod86) fix: snapshot_b64 role corrected to `state` (E1008)
* (ipod86) fix: profile selector role corrected to `level` (E1011)

### 0.0.3 (2026-06-27)
* (ipod86) feat: profile selector — reads profiles from getObjects, writable dropdown with active profile reflected on every poll
* (ipod86) feat: snapshot_b64 state (media.picture) always present per camera + manual refresh button; auto-poll optional

### 0.0.2 (2026-06-27)
* (ipod86) setup npm trusted publishing and fix repochecker findings

### 0.0.1 (2026-06-27)
* (ipod86) initial release

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
