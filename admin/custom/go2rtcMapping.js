/**
 * ioBroker jsonConfig custom component — go2rtc stream mapping table
 * Loaded by the admin when the Dashboard tab is opened in the adapter config.
 * Depends on: global React (provided by the admin page), props.socket (ioBroker socket).
 */
(function () {
    'use strict';

    window.customComponents = window.customComponents || {};

    var e = React.createElement;

    // ── Helper: normalize socket methods (Promise or callback-based) ────────

    function socketGetStates(socket, pattern) {
        try {
            var result = socket.getStates(pattern);
            if (result && typeof result.then === 'function') return result;
            return new Promise(function (resolve, reject) {
                socket.getStates(pattern, function (err, states) {
                    if (err) reject(err); else resolve(states || {});
                });
            });
        } catch (ex) { return Promise.reject(ex); }
    }

    function socketSendTo(socket, target, command, data) {
        try {
            var result = socket.sendTo(target, command, data);
            if (result && typeof result.then === 'function') return result;
            return new Promise(function (resolve) {
                socket.sendTo(target, command, data, function (res) { resolve(res); });
            });
        } catch (ex) { return Promise.resolve(null); }
    }

    // ── Component ───────────────────────────────────────────────────────────

    function Go2rtcMapping(props) {
        var useState   = React.useState;
        var useEffect  = React.useEffect;
        var useMemo    = React.useMemo;

        var _cameras   = useState(null);  // null = loading
        var cameras    = _cameras[0]; var setCameras = _cameras[1];
        var _streams   = useState([]);
        var streams    = _streams[0];     var setStreams  = _streams[1];
        var _error     = useState(null);
        var error      = _error[0];       var setError   = _error[1];

        var instanceStr = 'agent-dvr.' + (props.instance !== undefined ? String(props.instance) : '0');

        // Parse current mapping from data
        var mapping = useMemo(function () {
            try {
                var raw = props.data && props.data.go2rtcMapping;
                return raw ? JSON.parse(raw) : {};
            } catch (_) { return {}; }
        }, [props.data && props.data.go2rtcMapping]);

        useEffect(function () {
            if (!props.socket) { setCameras([]); return; }

            // Fetch cameras from ioBroker states + go2rtc streams via sendTo in parallel
            Promise.all([
                socketGetStates(props.socket, instanceStr + '.cam_*.name'),
                socketSendTo(props.socket, instanceStr, 'getGo2rtcStreams', null),
            ]).then(function (results) {
                var states  = results[0] || {};
                var g2result = results[1];

                // Build camera list from states: id pattern = agent-dvr.0.cam_xxx.name
                var cams = [];
                Object.entries(states).forEach(function (entry) {
                    var id    = entry[0];
                    var state = entry[1];
                    var match = id.match(/\.(cam_[^.]+)\.name$/);
                    if (match && state && state.val != null) {
                        cams.push({ key: match[1], name: String(state.val) });
                    }
                });
                cams.sort(function (a, b) { return a.name.localeCompare(b.name); });
                setCameras(cams);

                var strs = (g2result && Array.isArray(g2result.streams)) ? g2result.streams : [];
                setStreams(strs);
            }).catch(function (err) {
                setError(String(err && err.message ? err.message : err));
                setCameras([]);
            });
        }, [instanceStr]);

        function updateMapping(camKey, streamName) {
            var newMapping = Object.assign({}, mapping);
            if (streamName) {
                newMapping[camKey] = streamName;
            } else {
                delete newMapping[camKey];
            }
            if (props.onChange) props.onChange('go2rtcMapping', JSON.stringify(newMapping));
        }

        // Don't render if go2rtcEnabled is false
        if (!props.data || !props.data.go2rtcEnabled) return null;

        if (cameras === null) {
            return e('div', { style: { color: '#888', fontSize: '13px', padding: '6px 0' } },
                'Lade Kamera- und Stream-Liste…');
        }

        if (error) {
            return e('div', { style: { color: '#ef4444', fontSize: '13px', padding: '6px 0' } },
                'Fehler: ' + error);
        }

        var isDark = props.themeType === 'dark';
        var borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
        var mutedColor  = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';

        var headerStyle = {
            textAlign: 'left', padding: '5px 10px',
            fontSize: '12px', color: mutedColor, fontWeight: 600,
            borderBottom: '1px solid ' + borderColor,
        };
        var cellStyle = { padding: '6px 10px', fontSize: '13px', verticalAlign: 'middle' };
        var selectStyle = {
            background: 'transparent', border: '1px solid ' + borderColor,
            color: 'inherit', padding: '4px 8px', borderRadius: '4px',
            fontSize: '13px', minWidth: '180px', cursor: 'pointer',
        };

        var rows = (cameras || []).map(function (cam) {
            var currentStream = (typeof mapping[cam.key] === 'string') ? mapping[cam.key] : '';
            return e('tr', { key: cam.key, style: { borderBottom: '1px solid ' + borderColor } },
                e('td', { style: cellStyle }, cam.name),
                e('td', { style: cellStyle },
                    e('select', {
                        value: currentStream,
                        onChange: function (ev) { updateMapping(cam.key, ev.target.value); },
                        style: selectStyle,
                    },
                        e('option', { value: '' }, '— MJPEG / Snapshot —'),
                        streams.map(function (s) { return e('option', { key: s, value: s }, s); })
                    )
                )
            );
        });

        return e('div', { style: { width: '100%', marginTop: '4px' } },
            streams.length === 0 && e('div', {
                style: { color: '#f97316', fontSize: '12px', marginBottom: '8px' }
            }, '⚠ Keine go2rtc-Streams gefunden — go2rtc-URL prüfen und Adapter neu starten.'),
            !cameras.length && e('div', {
                style: { color: mutedColor, fontSize: '12px' }
            }, 'Keine Kameras in ioBroker gefunden — Adapter konfiguriert und gestartet?'),
            cameras.length > 0 && e('table', { style: { borderCollapse: 'collapse', width: '100%' } },
                e('thead', null,
                    e('tr', null,
                        e('th', { style: headerStyle }, 'AgentDVR-Kamera'),
                        e('th', { style: headerStyle }, 'go2rtc Stream')
                    )
                ),
                e('tbody', null, rows)
            )
        );
    }

    window.customComponents['Go2rtcMapping'] = Go2rtcMapping;
})();
