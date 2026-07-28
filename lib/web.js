'use strict';

const fs    = require('node:fs');
const net   = require('node:net');
const path  = require('node:path');
const http  = require('node:http');
const https = require('node:https');

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js':   'application/javascript',
    '.css':  'text/css',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.svg':  'image/svg+xml',
    '.ico':  'image/x-icon',
    '.json': 'application/json',
};

const WWW   = path.join(__dirname, '..', 'www');
const ROUTE = 'agent-dvr';

class AgentDvrWeb {
    constructor(server, webSettings, adapter, instanceSettings, app) {
        this.app     = app;
        this.adapter = adapter;

        const ns     = instanceSettings ? instanceSettings._id.replace('system.adapter.', '') : 'agent-dvr.0';
        const native = (instanceSettings && instanceSettings.native) ? instanceSettings.native : {};

        // Keep native in sync — iobroker.web caches it at startup, so when the
        // user saves adapter settings, the old values would stick until web restarts.
        // Subscribing to object changes fixes this without a restart.
        adapter.subscribeForeignObjects('system.adapter.' + ns);
        adapter.on('objectChange', (id, obj) => {
            if (id !== 'system.adapter.' + ns || !obj || !obj.native) return;
            Object.assign(native, obj.native);
            this._authHeader = (native.user || native.pass)
                ? 'Basic ' + Buffer.from((native.user || '') + ':' + (native.pass || '')).toString('base64')
                : null;
        });

        // Cache auth header for proxy endpoints
        this._authHeader = (native.user || native.pass)
            ? 'Basic ' + Buffer.from((native.user || '') + ':' + (native.pass || '')).toString('base64')
            : null;

        // ── REST API ─────────────────────────────────────────────────────────
        // Must be registered before the static file handler (Express matches in order)
        app.get('/' + ROUTE + '/api/cameras', (req, res) => {
            const base = (native.serverIp && native.port) ? 'http://' + native.serverIp + ':' + native.port : '';

            Promise.all([
                adapter.getForeignStatesAsync(ns + '.cam_*.name'),
                adapter.getForeignStatesAsync(ns + '.cam_*.urls.mjpeg'),
                adapter.getForeignStatesAsync(ns + '.cam_*.urls.snapshot'),
                adapter.getForeignStatesAsync(ns + '.cam_*.status.online'),
                adapter.getForeignStatesAsync(ns + '.cam_*.control.ptz.up'),  // PTZ detection
                adapter.getForeignStatesAsync(ns + '.cam_*.status.recording'),
                adapter.getForeignStatesAsync(ns + '.cam_*.status.detected'),
                adapter.getForeignStatesAsync(ns + '.cam_*.status.alerted'),
                adapter.getForeignStatesAsync(ns + '.cam_*.data.width'),
                adapter.getForeignStatesAsync(ns + '.cam_*.data.height'),
                adapter.getForeignStatesAsync(ns + '.cam_*.color'),
            ]).then(([nameStates, mjpegStates, snapStates, onlineStates, ptzStates, recStates, detStates, alertStates, widthStates, heightStates, colorStates]) => {
                const cameras = {};

                Object.entries(nameStates || {}).forEach(([id, state]) => {
                    const rel    = id.slice(ns.length + 1);
                    const camKey = rel.split('.')[0];
                    const m      = camKey.match(/^cam_(\d+)/);
                    cameras[camKey] = {
                        name:        (state && state.val != null) ? String(state.val) : camKey,
                        oid:         m ? m[1] : null,
                        mjpegUrl:    null,
                        snapshotUrl: null,
                        online:      false,
                        hasPtz:      false,
                        recording:   false,
                        detected:    false,
                        alerted:     false,
                    };
                });

                Object.entries(mjpegStates || {}).forEach(([id, state]) => {
                    const camKey = id.slice(ns.length + 1).split('.')[0];
                    if (cameras[camKey] && state && state.val) cameras[camKey].mjpegUrl = String(state.val);
                });

                Object.entries(snapStates || {}).forEach(([id, state]) => {
                    const camKey = id.slice(ns.length + 1).split('.')[0];
                    if (cameras[camKey] && state && state.val) cameras[camKey].snapshotUrl = String(state.val);
                });

                Object.entries(onlineStates || {}).forEach(([id, state]) => {
                    const camKey = id.slice(ns.length + 1).split('.')[0];
                    if (cameras[camKey]) cameras[camKey].online = !!(state && state.val);
                });

                // PTZ: state exists → camera has PTZ
                Object.keys(ptzStates || {}).forEach(id => {
                    const camKey = id.slice(ns.length + 1).split('.')[0];
                    if (cameras[camKey]) cameras[camKey].hasPtz = true;
                });

                Object.entries(recStates || {}).forEach(([id, state]) => {
                    const camKey = id.slice(ns.length + 1).split('.')[0];
                    if (cameras[camKey]) cameras[camKey].recording = !!(state && state.val);
                });

                Object.entries(detStates || {}).forEach(([id, state]) => {
                    const camKey = id.slice(ns.length + 1).split('.')[0];
                    if (cameras[camKey]) cameras[camKey].detected = !!(state && state.val);
                });

                Object.entries(alertStates || {}).forEach(([id, state]) => {
                    const camKey = id.slice(ns.length + 1).split('.')[0];
                    if (cameras[camKey]) cameras[camKey].alerted = !!(state && state.val);
                });

                Object.entries(colorStates || {}).forEach(([id, state]) => {
                    const camKey = id.slice(ns.length + 1).split('.')[0];
                    if (cameras[camKey] && state && state.val) cameras[camKey].color = String(state.val);
                });

                // Fallback URLs if enableUrls was off
                if (base) {
                    Object.values(cameras).forEach(cam => {
                        if (!cam.mjpegUrl    && cam.oid) cam.mjpegUrl    = base + '/video.mjpg?oid=' + cam.oid;
                        if (!cam.snapshotUrl && cam.oid) cam.snapshotUrl = base + '/grab.jpg?oid='   + cam.oid;
                    });
                }

                // Replace stream URLs with proxy URLs when enableStreamProxy is on
                if (native.enableStreamProxy) {
                    Object.values(cameras).forEach(cam => {
                        if (cam.oid) {
                            cam.mjpegUrl    = '/' + ROUTE + '/api/mjpeg?oid=' + cam.oid;
                            cam.snapshotUrl = '/' + ROUTE + '/api/snap?oid='  + cam.oid;
                        }
                    });
                }

                // Build aspect from data.width / data.height states written by flattenWrite.
                // Reading from ioBroker states is reliable regardless of whether the web
                // extension runs in the same process as the main adapter.
                const wMap = {}, hMap = {};
                Object.entries(widthStates  || {}).forEach(([id, s]) => {
                    const k = id.slice(ns.length + 1).split('.')[0];
                    if (s && typeof s.val === 'number') wMap[k] = s.val;
                });
                Object.entries(heightStates || {}).forEach(([id, s]) => {
                    const k = id.slice(ns.length + 1).split('.')[0];
                    if (s && typeof s.val === 'number') hMap[k] = s.val;
                });
                Object.entries(cameras).forEach(([k, cam]) => {
                    const w = wMap[k], h = hMap[k];
                    cam.aspect = (w >= 100 && h >= 100 && w / h >= 0.3 && w / h <= 4) ? w + '/' + h : '';
                });

                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ instance: ns, base, cameras }));
            }).catch(err => {
                adapter.log.error('[agent-dvr] /api/cameras error: ' + err.message);
                res.status(500).json({ error: err.message });
            });
        });

        // ── Dashboard config endpoint ─────────────────────────────────────────
        app.get('/' + ROUTE + '/api/config', (req, res) => {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
                dashEnableRecordings: native.dashEnableRecordings !== false,
                dashDefaultView:     native.dashDefaultView     || 'live',
                dashShowOffline:     native.dashShowOffline     !== false,
                dashGridCols:        native.dashGridCols        || 0,
                dashTileAspect:      native.dashTileAspect      || '16/9',
                dashBtnsVisible:     !!native.dashBtnsVisible,
                dashRefreshSec:      native.dashRefreshSec      || 60,
                dashStreamReconnect: native.dashStreamReconnect !== false,
                dashColorBg:         native.dashColorBg         || '#080b0f',
                dashColorSurface:    native.dashColorSurface    || '#0d1117',
                dashColorAccent:     native.dashColorAccent     || '#2563eb',
                dashColorText:       native.dashColorText       || '#dde4ef',
                dashColorBorder:     native.dashColorBorder     || '#1e2a38',
                dashColorOnline:     native.dashColorOnline     || '#22c55e',
                dashColorOffline:    native.dashColorOffline    || '#ef4444',
                dashTagPosition:     native.dashTagPosition     || 'top-right',
                dashStreamType:      native.dashStreamType      || 'mjpeg',
                go2rtcUrl:           native.go2rtcUrl           || '',
                go2rtcMapping:       Array.isArray(native.go2rtcMapping) ? native.go2rtcMapping : [],
                cameraStreams:       (native.cameraStreams && typeof native.cameraStreams === 'object') ? native.cameraStreams : {},
                dashLiveSource:      native.dashLiveSource      || 'agentdvr',
            }));
        });

        // ── MJPEG stream proxy (optional: enableStreamProxy) ─────────────────
        app.get('/' + ROUTE + '/api/mjpeg', (req, res) => {
            const base = (native.serverIp && native.port) ? 'http://' + native.serverIp + ':' + native.port : '';
            if (!base) { res.status(503).end('AgentDVR not configured'); return; }
            const oid = String(req.query.oid || '');
            if (!oid || !/^\d+$/.test(oid)) { res.status(400).end('invalid oid'); return; }
            const url = base + '/video.mjpg?oid=' + oid;
            let target;
            try { target = new URL(url); } catch (_) { res.status(500).end(); return; }
            const mod = target.protocol === 'https:' ? https : http;
            const headers = {};
            if (this._authHeader) headers['Authorization'] = this._authHeader;
            const upReq = mod.get({ hostname: target.hostname, port: target.port, path: target.pathname + target.search, headers }, upstream => {
                res.setHeader('Content-Type', upstream.headers['content-type'] || 'multipart/x-mixed-replace');
                res.setHeader('Cache-Control', 'no-cache');
                res.setHeader('X-Accel-Buffering', 'no');
                upstream.pipe(res);
                upstream.on('error', () => { if (!res.headersSent) res.status(502).end(); else res.end(); });
            });
            upReq.setTimeout(0); // no timeout for infinite MJPEG stream
            upReq.on('error', () => { if (!res.headersSent) res.status(502).end(); else res.end(); });
            req.on('close', () => { try { upReq.destroy(); } catch (_) {} });
        });

        // ── Snapshot proxy (optional: enableStreamProxy) ──────────────────────
        app.get('/' + ROUTE + '/api/snap', (req, res) => {
            const base = (native.serverIp && native.port) ? 'http://' + native.serverIp + ':' + native.port : '';
            if (!base) { res.status(503).end('AgentDVR not configured'); return; }
            const oid = String(req.query.oid || '');
            if (!oid || !/^\d+$/.test(oid)) { res.status(400).end('invalid oid'); return; }
            const url = base + '/grab.jpg?oid=' + oid;
            let target;
            try { target = new URL(url); } catch (_) { res.status(500).end(); return; }
            const mod = target.protocol === 'https:' ? https : http;
            const headers = {};
            if (this._authHeader) headers['Authorization'] = this._authHeader;
            const upReq = mod.get({ hostname: target.hostname, port: target.port, path: target.pathname + target.search, headers }, upstream => {
                res.setHeader('Content-Type', upstream.headers['content-type'] || 'image/jpeg');
                res.setHeader('Cache-Control', 'no-cache');
                upstream.pipe(res);
                upstream.on('error', () => { if (!res.headersSent) res.status(502).end(); else res.end(); });
            });
            upReq.setTimeout(8000, () => upReq.destroy());
            upReq.on('error', () => { if (!res.headersSent) res.status(502).end(); else res.end(); });
            req.on('close', () => { try { upReq.destroy(); } catch (_) {} });
        });

        // ── FLV stream proxy (avoids browser CORS block for flv.js XHR) ────────
        app.get('/' + ROUTE + '/api/stream', (req, res) => {
            const base = (native.serverIp && native.port) ? 'http://' + native.serverIp + ':' + native.port : '';
            if (!base) { res.status(503).end('AgentDVR not configured'); return; }
            const oid = String(req.query.oid || '');
            if (!oid || !/^\d+$/.test(oid)) { res.status(400).end('invalid oid'); return; }
            const size = String(req.query.size || '');
            const sizeStr = /^\d{1,5}x\d{1,5}$/.test(size) ? '&size=' + size : '';
            const url = base + '/video.mp4?oid=' + oid + sizeStr;
            let target;
            try { target = new URL(url); } catch (_) { res.status(500).end(); return; }
            const mod = target.protocol === 'https:' ? https : http;
            const flvHeaders = {};
            if (this._authHeader) flvHeaders['Authorization'] = this._authHeader;
            const upReq = mod.get({ hostname: target.hostname, port: target.port, path: target.pathname + target.search, headers: flvHeaders }, upstream => {
                res.setHeader('Content-Type', 'video/x-flv');
                res.setHeader('Cache-Control', 'no-cache');
                res.setHeader('X-Accel-Buffering', 'no');
                upstream.pipe(res);
                upstream.on('error', () => { if (!res.headersSent) res.status(502).end(); else res.end(); });
            });
            upReq.setTimeout(8000, () => upReq.destroy());
            upReq.on('error', () => { if (!res.headersSent) res.status(502).end(); else res.end(); });
            req.on('close', () => { try { upReq.destroy(); } catch (_) {} });
        });

        // ── go2rtc streams proxy ─────────────────────────────────────────────
        app.get('/' + ROUTE + '/api/go2rtc/streams', (req, res) => {
            if (!native.go2rtcUrl) {
                res.setHeader('Content-Type', 'application/json');
                res.end('{"streams":[]}');
                return;
            }
            let target;
            try { target = new URL('/api/streams', native.go2rtcUrl); }
            catch (_) { res.setHeader('Content-Type', 'application/json'); res.end('{"streams":[]}'); return; }
            const mod = target.protocol === 'https:' ? https : http;
            const req2 = mod.get(target.toString(), r2 => {
                let body = '';
                r2.on('data', c => { body += c; });
                r2.on('end', () => {
                    try {
                        const streams = Object.keys(JSON.parse(body) || {});
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ streams }));
                    } catch (_) {
                        res.setHeader('Content-Type', 'application/json');
                        res.end('{"streams":[]}');
                    }
                });
            });
            req2.setTimeout(4000, () => { req2.destroy(); });
            req2.on('error', () => {
                if (!res.headersSent) {
                    res.setHeader('Content-Type', 'application/json');
                    res.end('{"streams":[]}');
                }
            });
        });

        // ── PTZ endpoint ─────────────────────────────────────────────────────
        app.get('/' + ROUTE + '/api/ptz', (req, res) => {
            const camKey = String(req.query.camKey || '');
            const dir    = String(req.query.dir   || '');
            const val    = req.query.val === '1';
            const DIRS   = new Set(['left','upLeft','up','upRight','right','downRight','down','downLeft','zoomIn','zoomOut','stop','center']);
            if (!camKey || !/^cam_[a-zA-Z0-9_-]+$/.test(camKey) || !DIRS.has(dir)) {
                res.status(400).json({ error: 'invalid params' }); return;
            }
            adapter.setForeignStateAsync(ns + '.' + camKey + '.control.ptz.' + dir, { val, ack: false })
                .then(() => { res.setHeader('Content-Type', 'application/json'); res.end('{"ok":true}'); })
                .catch(err => { adapter.log.warn('[agent-dvr] ptz error: ' + err.message); res.status(500).json({ error: err.message }); });
        });

        // ── Record control endpoint ───────────────────────────────────────────
        app.get('/' + ROUTE + '/api/record', (req, res) => {
            const camKey = String(req.query.camKey || '');
            const action = String(req.query.action || '');
            if (!camKey || !/^cam_[a-zA-Z0-9_-]+$/.test(camKey) || !['start','stop'].includes(action)) {
                res.status(400).json({ error: 'invalid params' }); return;
            }
            const cmd = action === 'start' ? 'record' : 'recordStop';
            adapter.setForeignStateAsync(ns + '.' + camKey + '.control.' + cmd, { val: true, ack: false })
                .then(() => { res.setHeader('Content-Type', 'application/json'); res.end('{"ok":true}'); })
                .catch(err => { adapter.log.warn('[agent-dvr] record error: ' + err.message); res.status(500).json({ error: err.message }); });
        });


        // ── Recordings endpoint — reads events.json state, no AgentDVR call ─
        app.get('/' + ROUTE + '/api/recordings', (req, res) => {
            const camKey = String(req.query.camKey || '');
            if (!camKey || !/^cam_[a-zA-Z0-9_-]+$/.test(camKey)) {
                res.status(400).json({ error: 'invalid camKey' });
                return;
            }
            adapter.getForeignStateAsync(ns + '.' + camKey + '.events.json')
                .then(state => {
                    const raw = (state && state.val) ? String(state.val) : '[]';
                    let items;
                    try { items = JSON.parse(raw); } catch (_) { items = []; }
                    if (Array.isArray(items)) {
                        items = items.map(rec => {
                            const out = Object.assign({}, rec);
                            // Always proxy video through /api/media to strip Content-Disposition: attachment
                            // and normalise the MIME type — required for inline <video> playback
                            if (typeof out.video === 'string' && out.video.startsWith('http')) {
                                try {
                                    const u = new URL(out.video);
                                    const oid = u.searchParams.get('oid');
                                    const fn  = u.searchParams.get('fn');
                                    if (oid && fn) out.video = '/' + ROUTE + '/api/media?oid=' + encodeURIComponent(oid) + '&fn=' + encodeURIComponent(fn);
                                } catch (_) { /* keep original */ }
                            }
                            if (!native.enableStreamProxy) return out;
                            // When stream proxy is on, also proxy thumbnails
                            if (typeof out.thumb === 'string' && out.thumb.startsWith('http')) {
                                try {
                                    const u = new URL(out.thumb);
                                    const oid = u.searchParams.get('oid');
                                    const fn  = u.searchParams.get('fn');
                                    if (oid && fn) out.thumb = '/' + ROUTE + '/api/thumb?oid=' + encodeURIComponent(oid) + '&fn=' + encodeURIComponent(fn);
                                } catch (_) { /* keep original */ }
                            }
                            return out;
                        });
                    }
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(items));
                })
                .catch(err => {
                    adapter.log.warn('[agent-dvr] /api/recordings error: ' + err.message);
                    res.status(500).json({ error: err.message });
                });
        });

        // ── Delete recording (proxied to AgentDVR, requires v7.7.8.0+) ───────
        app.get('/' + ROUTE + '/api/deleterecording', (req, res) => {
            const base = (native.serverIp && native.port) ? 'http://' + native.serverIp + ':' + native.port : '';
            if (!base) { res.status(503).json({ error: 'AgentDVR not configured' }); return; }
            const oid = String(req.query.oid || '');
            const fn  = String(req.query.fn  || '');
            if (!oid || !/^\d+$/.test(oid) || !fn) { res.status(400).json({ error: 'invalid params' }); return; }
            const url = base + '/command/deleterecording?oid=' + oid + '&ot=2&fn=' + encodeURIComponent(fn);
            let target;
            try { target = new URL(url); } catch (_) { res.status(500).json({ error: 'invalid url' }); return; }
            const mod = target.protocol === 'https:' ? https : http;
            const headers = {};
            if (this._authHeader) headers['Authorization'] = this._authHeader;
            let body = '';
            const upReq = mod.get({ hostname: target.hostname, port: target.port, path: target.pathname + target.search, headers }, upstream => {
                upstream.setEncoding('utf8');
                upstream.on('data', chunk => { body += chunk; });
                upstream.on('end', () => {
                    res.setHeader('Content-Type', 'application/json');
                    res.status(upstream.statusCode || 200).end(body || '{}');
                });
                upstream.on('error', () => { if (!res.headersSent) res.status(502).json({ error: 'upstream error' }); });
            });
            upReq.setTimeout(10000, () => upReq.destroy());
            upReq.on('error', () => { if (!res.headersSent) res.status(502).json({ error: 'connection failed' }); });
        });

        // ── Webhook — triggers a full adapter poll ────────────────────────────
        app.get('/' + ROUTE + '/webhook', (req, res) => {
            adapter.setForeignStateAsync(ns + '.system.control.refresh', { val: true, ack: false })
                .then(() => res.json({ ok: true }))
                .catch(err => res.status(500).json({ error: err.message }));
        });

        // ── System stats ─────────────────────────────────────────────────────
        app.get('/' + ROUTE + '/api/systemstats', (req, res) => {
            const base = (native.serverIp && native.port) ? 'http://' + native.serverIp + ':' + native.port : '';
            if (!base) { res.status(503).json({ error: 'AgentDVR not configured' }); return; }
            const url = base + '/command/getSystemStats';
            let target;
            try { target = new URL(url); } catch (_) { res.status(500).json({ error: 'invalid url' }); return; }
            const mod = target.protocol === 'https:' ? https : http;
            const headers = {};
            if (this._authHeader) headers['Authorization'] = this._authHeader;
            let body = '';
            const upReq = mod.get({ hostname: target.hostname, port: target.port, path: target.pathname + target.search, headers }, upstream => {
                upstream.setEncoding('utf8');
                upstream.on('data', chunk => { body += chunk; });
                upstream.on('end', () => {
                    res.setHeader('Content-Type', 'application/json');
                    res.status(upstream.statusCode || 200).end(body || '{}');
                });
                upstream.on('error', () => { if (!res.headersSent) res.status(502).json({ error: 'upstream error' }); });
            });
            upReq.setTimeout(5000, () => upReq.destroy());
            upReq.on('error', () => { if (!res.headersSent) res.status(502).json({ error: 'connection failed' }); });
        });

        // ── PTZ preset list ──────────────────────────────────────────────────
        app.get('/' + ROUTE + '/api/ptzpresets', (req, res) => {
            const base = (native.serverIp && native.port) ? 'http://' + native.serverIp + ':' + native.port : '';
            if (!base) { res.status(503).json({ error: 'AgentDVR not configured' }); return; }
            const oid = String(req.query.oid || '');
            if (!oid || !/^\d+$/.test(oid)) { res.status(400).json({ error: 'invalid params' }); return; }
            const url = base + '/command/ptzpresets?oid=' + oid + '&ot=2';
            let target;
            try { target = new URL(url); } catch (_) { res.status(500).json({ error: 'invalid url' }); return; }
            const mod = target.protocol === 'https:' ? https : http;
            const headers = {};
            if (this._authHeader) headers['Authorization'] = this._authHeader;
            let body = '';
            const upReq = mod.get({ hostname: target.hostname, port: target.port, path: target.pathname + target.search, headers }, upstream => {
                upstream.setEncoding('utf8');
                upstream.on('data', chunk => { body += chunk; });
                upstream.on('end', () => {
                    res.setHeader('Content-Type', 'application/json');
                    res.status(upstream.statusCode || 200).end(body || '{}');
                });
                upstream.on('error', () => { if (!res.headersSent) res.status(502).json({ error: 'upstream error' }); });
            });
            upReq.setTimeout(5000, () => upReq.destroy());
            upReq.on('error', () => { if (!res.headersSent) res.status(502).json({ error: 'connection failed' }); });
        });

        // ── PTZ preset navigate ───────────────────────────────────────────────
        app.get('/' + ROUTE + '/api/ptzpreset', (req, res) => {
            const base = (native.serverIp && native.port) ? 'http://' + native.serverIp + ':' + native.port : '';
            if (!base) { res.status(503).json({ error: 'AgentDVR not configured' }); return; }
            const oid    = String(req.query.oid    || '');
            const preset = String(req.query.preset || '');
            if (!oid || !/^\d+$/.test(oid) || !preset) { res.status(400).json({ error: 'invalid params' }); return; }
            const url = base + '/command/ptzpreset?oid=' + oid + '&ot=2&preset=' + encodeURIComponent(preset);
            let target;
            try { target = new URL(url); } catch (_) { res.status(500).json({ error: 'invalid url' }); return; }
            const mod = target.protocol === 'https:' ? https : http;
            const headers = {};
            if (this._authHeader) headers['Authorization'] = this._authHeader;
            let body = '';
            const upReq = mod.get({ hostname: target.hostname, port: target.port, path: target.pathname + target.search, headers }, upstream => {
                upstream.setEncoding('utf8');
                upstream.on('data', chunk => { body += chunk; });
                upstream.on('end', () => {
                    res.setHeader('Content-Type', 'application/json');
                    res.status(upstream.statusCode || 200).end(body || '{}');
                });
                upstream.on('error', () => { if (!res.headersSent) res.status(502).json({ error: 'upstream error' }); });
            });
            upReq.setTimeout(5000, () => upReq.destroy());
            upReq.on('error', () => { if (!res.headersSent) res.status(502).json({ error: 'connection failed' }); });
        });

        // ── Recording thumbnail proxy (optional: enableStreamProxy) ──────────
        app.get('/' + ROUTE + '/api/thumb', (req, res) => {
            const base = (native.serverIp && native.port) ? 'http://' + native.serverIp + ':' + native.port : '';
            if (!base) { res.status(503).end('AgentDVR not configured'); return; }
            const oid = String(req.query.oid || '');
            const fn  = String(req.query.fn  || '');
            if (!oid || !/^\d+$/.test(oid) || !fn) { res.status(400).end('invalid params'); return; }
            const url = base + '/fileThumb.jpg?oid=' + oid + '&fn=' + encodeURIComponent(fn);
            let target;
            try { target = new URL(url); } catch (_) { res.status(500).end(); return; }
            const mod = target.protocol === 'https:' ? https : http;
            const headers = {};
            if (this._authHeader) headers['Authorization'] = this._authHeader;
            const upReq = mod.get({ hostname: target.hostname, port: target.port, path: target.pathname + target.search, headers }, upstream => {
                res.setHeader('Content-Type', upstream.headers['content-type'] || 'image/jpeg');
                res.setHeader('Cache-Control', 'max-age=86400');
                upstream.pipe(res);
                upstream.on('error', () => { if (!res.headersSent) res.status(502).end(); else res.end(); });
            });
            upReq.setTimeout(8000, () => upReq.destroy());
            upReq.on('error', () => { if (!res.headersSent) res.status(502).end(); else res.end(); });
            req.on('close', () => { try { upReq.destroy(); } catch (_) {} });
        });

        // ── Recording video proxy (optional: enableStreamProxy) ──────────────
        app.get('/' + ROUTE + '/api/media', (req, res) => {
            const base = (native.serverIp && native.port) ? 'http://' + native.serverIp + ':' + native.port : '';
            if (!base) { res.status(503).end('AgentDVR not configured'); return; }
            const oid = String(req.query.oid || '');
            const fn  = String(req.query.fn  || '');
            if (!oid || !/^\d+$/.test(oid) || !fn) { res.status(400).end('invalid params'); return; }
            const url = base + '/streamFile.cgi?oid=' + oid + '&ot=2&fn=' + encodeURIComponent(fn);
            let target;
            try { target = new URL(url); } catch (_) { res.status(500).end(); return; }
            const mod = target.protocol === 'https:' ? https : http;
            const headers = {};
            if (this._authHeader) headers['Authorization'] = this._authHeader;
            // Forward Range header so the browser can seek in the video
            if (req.headers['range']) headers['Range'] = req.headers['range'];
            const upReq = mod.get({ hostname: target.hostname, port: target.port, path: target.pathname + target.search, headers }, upstream => {
                const status = upstream.statusCode || 200;
                // Normalise non-standard MIME type and never forward Content-Disposition
                // so the browser plays the video inline instead of downloading it
                const ct = (upstream.headers['content-type'] || 'video/mp4')
                    .replace(/video\/mkv\b/i, 'video/x-matroska');
                res.setHeader('Content-Type', ct);
                res.setHeader('Accept-Ranges', 'bytes');
                if (upstream.headers['content-range'])  res.setHeader('Content-Range',  upstream.headers['content-range']);
                if (upstream.headers['content-length']) res.setHeader('Content-Length', upstream.headers['content-length']);
                res.setHeader('Cache-Control', 'no-cache');
                res.status(status);
                upstream.pipe(res);
                upstream.on('error', () => { if (!res.headersSent) res.status(502).end(); else res.end(); });
            });
            upReq.setTimeout(0); // no timeout for potentially large video files
            upReq.on('error', () => { if (!res.headersSent) res.status(502).end(); else res.end(); });
            req.on('close', () => { try { upReq.destroy(); } catch (_) {} });
        });

        // ── Static file handler ───────────────────────────────────────────────
        app.use('/' + ROUTE, (req, res) => {
            let rel = (req.url || '/').split('?')[0];
            if (rel === '/' || rel === '') rel = '/index.html';

            const file = path.resolve(path.join(WWW, rel));

            if (!file.startsWith(WWW + path.sep) && file !== path.join(WWW, 'index.html')) {
                res.status(403).end();
                return;
            }

            fs.readFile(file, (err, data) => {
                if (err) { res.status(404).end('Not found'); return; }
                const ext = path.extname(file).toLowerCase();
                res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
                // HTML must never be cached so updates are visible immediately
                if (ext === '.html') res.setHeader('Cache-Control', 'no-store');
                res.end(data);
            });
        });

        adapter.log.info('[agent-dvr] Web UI: /' + ROUTE + '/');

        // ── WebSocket proxy for go2rtc (bypasses browser cross-origin block) ─
        server.on('upgrade', (req, socket, head) => {
            if (!(req.url || '').startsWith('/' + ROUTE + '/api/ws')) return;
            if (!native.go2rtcUrl) {
                socket.write('HTTP/1.1 503 Service Unavailable\r\n\r\n');
                socket.destroy();
                return;
            }
            const qs  = (req.url.split('?')[1] || '');
            const src = new URLSearchParams(qs).get('src') || '';
            let target;
            try { target = new URL('/api/ws?src=' + encodeURIComponent(src), native.go2rtcUrl.replace(/\/+$/, '')); }
            catch (_) { socket.write('HTTP/1.1 400 Bad Request\r\n\r\n'); socket.destroy(); return; }

            const port = parseInt(target.port) || (target.protocol === 'https:' ? 443 : 80);
            const upstream = net.connect(port, target.hostname, () => {
                const lines = [
                    'GET ' + target.pathname + target.search + ' HTTP/1.1',
                    'Host: ' + target.hostname + ':' + port,
                    'Upgrade: websocket',
                    'Connection: Upgrade',
                    'Sec-WebSocket-Key: ' + (req.headers['sec-websocket-key'] || ''),
                    'Sec-WebSocket-Version: 13',
                    '', '',
                ];
                upstream.write(lines.join('\r\n'));
                if (head && head.length) upstream.write(head);
                upstream.pipe(socket);
                socket.pipe(upstream);
            });
            upstream.on('error', err => {
                adapter.log.warn('[agent-dvr] go2rtc WS proxy error: ' + err.message);
                if (!socket.destroyed) { socket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n'); socket.destroy(); }
            });
            socket.on('error', () => { if (!upstream.destroyed) upstream.destroy(); });
            socket.on('close', () => { if (!upstream.destroyed) upstream.destroy(); });
        });
    }

    unload() { return Promise.resolve(); }

    welcomePage() {
        return {
            link:  ROUTE + '/',
            name:  'AgentDVR',
            img:   'adapter/agent-dvr/agent-dvr.png',
            color: '#2196f3',
            order: 10,
        };
    }
}

module.exports = AgentDvrWeb;
