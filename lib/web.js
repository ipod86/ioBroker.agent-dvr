'use strict';

const fs   = require('node:fs');
const path = require('node:path');

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

        // ── REST API ─────────────────────────────────────────────────────────
        // Must be registered before the static file handler (Express matches in order)
        app.get('/' + ROUTE + '/api/cameras', (req, res) => {
            const base = (native.ip && native.port) ? 'http://' + native.ip + ':' + native.port : '';

            Promise.all([
                adapter.getForeignStatesAsync(ns + '.cam_*.name'),
                adapter.getForeignStatesAsync(ns + '.cam_*.urls.mjpeg'),
                adapter.getForeignStatesAsync(ns + '.cam_*.urls.snapshot'),
                adapter.getForeignStatesAsync(ns + '.cam_*.data.online'),
                adapter.getForeignStatesAsync(ns + '.cam_*.control.ptz.up'),  // PTZ detection
                adapter.getForeignStatesAsync(ns + '.cam_*.status.recording'),
            ]).then(([nameStates, mjpegStates, snapStates, onlineStates, ptzStates, recStates]) => {
                const cameras = {};

                Object.entries(nameStates || {}).forEach(([id, state]) => {
                    const rel    = id.slice(ns.length + 1);
                    const camKey = rel.split('.')[0];
                    const m      = camKey.match(/^cam_(\d+)_/);
                    cameras[camKey] = {
                        name:        (state && state.val != null) ? String(state.val) : camKey,
                        oid:         m ? m[1] : null,
                        mjpegUrl:    null,
                        snapshotUrl: null,
                        online:      false,
                        hasPtz:      false,
                        recording:   false,
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

                // Fallback URLs if enableUrls was off
                if (base) {
                    Object.values(cameras).forEach(cam => {
                        if (!cam.mjpegUrl    && cam.oid) cam.mjpegUrl    = base + '/video.mjpg?oid=' + cam.oid;
                        if (!cam.snapshotUrl && cam.oid) cam.snapshotUrl = base + '/grab.jpg?oid='   + cam.oid;
                    });
                }

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
                dashDefaultView:     native.dashDefaultView     || 'live',
                dashShowOffline:     native.dashShowOffline     !== false,
                dashGridCols:        native.dashGridCols        || 0,
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
            }));
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
                    const json = (state && state.val) ? String(state.val) : '[]';
                    res.setHeader('Content-Type', 'application/json');
                    res.end(json);
                })
                .catch(err => {
                    adapter.log.warn('[agent-dvr] /api/recordings error: ' + err.message);
                    res.status(500).json({ error: err.message });
                });
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
                res.end(data);
            });
        });

        adapter.log.info('[agent-dvr] Web UI: /' + ROUTE + '/');
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
