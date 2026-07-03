import React, { useState, useEffect, useCallback } from 'react';
import { I18n } from '@iobroker/adapter-react-v5';
import {
    Grid, Box, Typography, CircularProgress, Alert,
    Table, TableHead, TableBody, TableRow, TableCell, TableContainer, Paper,
    Select, MenuItem, FormControl, Chip, IconButton, Tooltip,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import FormField, { SectionHeader, ColorField } from '../components/FormField';

interface Camera {
    key: string;
    name: string;
}

interface Props {
    native: any;
    onChange: (k: string, v: any) => void;
    socket: any;
    instance: number;
}

function parseCamerasFromObjects(json: any): Camera[] {
    const list = Array.isArray(json?.objectList) ? json.objectList : [];
    const out: Camera[] = [];
    for (const e of list) {
        if (!e || typeof e !== 'object') continue;
        const id = e.id ?? e.oid;
        if (id == null) continue;
        const rawName = typeof e.name === 'string' ? e.name : `obj_${id}`;
        const ot = e.typeID ?? e.ot ?? e.objectTypeID ?? e.type;
        const isCam = ot === 1 || ot === 2;
        if (!isCam) continue;
        const key = `cam_${id}_${rawName.replace(/[\s.[\]*?"'`,;:/\\]+/g, '_').replace(/[^A-Za-z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '') || 'x'}`;
        out.push({ key, name: rawName });
    }
    out.sort((a, b) => a.name.localeCompare(b.name));
    return out;
}

function parseStreamsFromApi(json: any): string[] {
    if (!json || typeof json !== 'object') return [];
    return Object.keys(json).sort();
}

const DashboardPanel: React.FC<Props> = ({ native, onChange, socket, instance }) => {
    const [cameras, setCameras] = useState<Camera[] | null>(null);
    const [streams, setStreams] = useState<string[]>([]);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const isGo2rtc = native.dashStreamType === 'go2rtc';

    const mapping: { camKey: string; stream: string }[] = Array.isArray(native.go2rtcMapping) ? native.go2rtcMapping : [];

    function setStreamForCam(camKey: string, stream: string): void {
        const existing = mapping.filter(m => m.camKey !== camKey);
        if (stream) {
            onChange('go2rtcMapping', [...existing, { camKey, stream }]);
        } else {
            onChange('go2rtcMapping', existing);
        }
    }

    function getStreamForCam(camKey: string): string {
        return mapping.find(m => m.camKey === camKey)?.stream ?? '';
    }

    const fetchData = useCallback(async () => {
        const ip = (native.ip || '').trim();
        const port = native.port || 8090;
        const go2rtcUrl = (native.go2rtcUrl || '').trim();

        if (!ip) {
            setCameras([]);
            setFetchError(I18n.t('cfgIp') + ' fehlt');
            return;
        }

        setLoading(true);
        setFetchError(null);

        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 4000);

            let cams: Camera[] = [];
            let strms: string[] = [];

            try {
                const res = await fetch(`http://${ip}:${port}/command/getObjects`, {
                    signal: controller.signal,
                    headers: native.user ? { Authorization: `Basic ${btoa(`${native.user}:${native.pass ?? ''}`)}` } : {},
                });
                if (res.ok) {
                    cams = parseCamerasFromObjects(await res.json());
                } else {
                    setFetchError(`AgentDVR: HTTP ${res.status}`);
                }
            } catch (e: any) {
                if (e?.name === 'AbortError') {
                    setFetchError('AgentDVR: Timeout (4 s)');
                } else {
                    setFetchError(`AgentDVR: ${e?.message || e} — CORS blockiert? Adapter neu starten und erneut laden.`);
                    try {
                        const result = await new Promise<any>(resolve => {
                            socket.sendTo(`agent-dvr.${instance}`, 'getAgentDvrCameras', null, resolve);
                        });
                        if (result?.cameras?.length) {
                            cams = result.cameras;
                            setFetchError(null);
                        }
                    } catch { /* ignore */ }
                }
            }
            clearTimeout(timer);

            if (go2rtcUrl) {
                try {
                    const r = await fetch(`${go2rtcUrl}/api/streams`);
                    if (r.ok) strms = parseStreamsFromApi(await r.json());
                } catch {
                    try {
                        const result = await new Promise<any>(resolve => {
                            socket.sendTo(`agent-dvr.${instance}`, 'getGo2rtcStreams', null, resolve);
                        });
                        if (Array.isArray(result?.streams)) strms = result.streams;
                    } catch { /* ignore */ }
                }
            }

            setCameras(cams);
            setStreams(strms);
        } finally {
            setLoading(false);
        }
    }, [native.ip, native.port, native.go2rtcUrl, native.user, native.pass, socket, instance]);

    useEffect(() => {
        if (isGo2rtc) {
            void fetchData();
        }
    }, [isGo2rtc]);

    return (
        <div>
            <SectionHeader textKey="hdrDashView" />
            <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={4} lg={3}>
                    <FormField type="select" labelKey="cfgDashDefaultView" helpKey="cfgDashDefaultView_tt" value={native.dashDefaultView ?? 'live'} onChange={v => onChange('dashDefaultView', v)}
                        options={[{ value: 'live', labelKey: 'cfgDashViewLive' }, { value: 'recordings', labelKey: 'cfgDashViewRec' }]} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <FormField type="checkbox" labelKey="cfgDashShowOffline" helpKey="cfgDashShowOffline_tt" value={native.dashShowOffline} onChange={v => onChange('dashShowOffline', v)} />
                </Grid>
            </Grid>

            <SectionHeader textKey="hdrDashGrid" />
            <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3} lg={2}>
                    <FormField type="number" labelKey="cfgDashGridCols" helpKey="cfgDashGridCols_tt" value={native.dashGridCols ?? 0} min={0} max={8} onChange={v => onChange('dashGridCols', v)} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <FormField type="checkbox" labelKey="cfgDashBtnsVisible" helpKey="cfgDashBtnsVisible_tt" value={native.dashBtnsVisible} onChange={v => onChange('dashBtnsVisible', v)} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <FormField type="select" labelKey="cfgDashTagPosition" helpKey="cfgDashTagPosition_tt" value={native.dashTagPosition ?? 'bottom-right'} onChange={v => onChange('dashTagPosition', v)}
                        options={[{ value: 'top-left', labelKey: 'cfgTagPosTopLeft' }, { value: 'top-right', labelKey: 'cfgTagPosTopRight' }, { value: 'bottom-left', labelKey: 'cfgTagPosBotLeft' }, { value: 'bottom-right', labelKey: 'cfgTagPosBotRight' }]} />
                </Grid>
            </Grid>

            <SectionHeader textKey="hdrDashStream" />
            <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={4} lg={3}>
                    <FormField type="number" labelKey="cfgDashRefreshSec" helpKey="cfgDashRefreshSec_tt" value={native.dashRefreshSec ?? 60} min={10} max={600} onChange={v => onChange('dashRefreshSec', v)} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <FormField type="checkbox" labelKey="cfgDashStreamReconnect" helpKey="cfgDashStreamReconnect_tt" value={native.dashStreamReconnect !== false} onChange={v => onChange('dashStreamReconnect', v)} />
                </Grid>
            </Grid>

            <SectionHeader textKey="hdrDashTheme" />
            <Grid container spacing={2}>
                {(['dashColorBg', 'dashColorSurface', 'dashColorAccent', 'dashColorText', 'dashColorBorder', 'dashColorOnline', 'dashColorOffline'] as const).map(k => (
                    <Grid key={k} item xs={12} sm={6} md={3} lg={2}>
                        <ColorField labelKey={`cfg${k.charAt(0).toUpperCase()}${k.slice(1)}`} helpKey={`cfg${k.charAt(0).toUpperCase()}${k.slice(1)}_tt`} value={(native as any)[k] ?? ''} onChange={v => onChange(k, v)} />
                    </Grid>
                ))}
            </Grid>

            <SectionHeader textKey="hdrGo2rtc" />
            <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={4} lg={4}>
                    <FormField type="select" labelKey="cfgDashStreamType" helpKey="cfgDashStreamType_tt" value={native.dashStreamType ?? 'mjpeg'} onChange={v => onChange('dashStreamType', v)}
                        options={[{ value: 'mjpeg', labelKey: 'cfgDashStreamMjpeg' }, { value: 'mp4', labelKey: 'cfgDashStreamMp4' }, { value: 'go2rtc', labelKey: 'cfgDashStreamGo2rtc' }]} />
                </Grid>
            </Grid>

            {isGo2rtc && (
                <>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={8} md={6} lg={5}>
                            <FormField type="text" labelKey="cfgGo2rtcUrl" helpKey="cfgGo2rtcUrl_tt" value={native.go2rtcUrl ?? ''} onChange={v => onChange('go2rtcUrl', v)} />
                        </Grid>
                        <Grid item xs={12} sm={6} md={4} lg={3}>
                            <FormField type="select" labelKey="cfgDashLiveSource" helpKey="cfgDashLiveSource_tt" value={native.dashLiveSource ?? 'agentdvr'} onChange={v => onChange('dashLiveSource', v)}
                                options={[{ value: 'agentdvr', labelKey: 'cfgDashLiveSrcAgentDvr' }, { value: 'go2rtc', labelKey: 'cfgDashLiveSrcGo2rtc' }]} />
                        </Grid>
                    </Grid>

                    {/* ── Camera → Stream Mapping ── */}
                    <Box sx={{ mt: 3, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="h6" sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 0.5, flex: 1 }}>
                            {I18n.t('cfgGo2rtcMapping')}
                        </Typography>
                        <Tooltip title="Neu laden">
                            <IconButton size="small" onClick={() => void fetchData()} disabled={loading}>
                                {loading ? <CircularProgress size={18} /> : <RefreshIcon />}
                            </IconButton>
                        </Tooltip>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                        {I18n.t('cfgGo2rtcMapping_tt')}
                    </Typography>

                    {fetchError && <Alert severity="warning" sx={{ mb: 2 }}>{fetchError}</Alert>}

                    {loading && <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}><CircularProgress size={16} /><Typography variant="caption">Lade Kameras und Streams…</Typography></Box>}

                    {cameras !== null && cameras.length === 0 && !loading && (
                        <Alert severity="info" sx={{ mb: 2 }}>
                            Keine Kameras gefunden — Adapter konfiguriert und mindestens einmal gepollt?
                        </Alert>
                    )}

                    {cameras !== null && cameras.length > 0 && (
                        <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell><strong>AgentDVR Kamera</strong></TableCell>
                                        <TableCell><strong>go2rtc Stream</strong></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {cameras.map(cam => (
                                        <TableRow key={cam.key} hover>
                                            <TableCell>
                                                <Box>
                                                    <Typography variant="body2">{cam.name}</Typography>
                                                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{cam.key}</Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell sx={{ minWidth: 200 }}>
                                                <FormControl size="small" fullWidth>
                                                    <Select
                                                        value={getStreamForCam(cam.key)}
                                                        onChange={e => setStreamForCam(cam.key, e.target.value as string)}
                                                        displayEmpty
                                                    >
                                                        <MenuItem value=""><em>— MJPEG / Snapshot —</em></MenuItem>
                                                        {streams.map(s => (
                                                            <MenuItem key={s} value={s}>{s}</MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}

                    {cameras !== null && streams.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="caption" color="text.secondary">go2rtc Streams: </Typography>
                            {streams.map(s => <Chip key={s} label={s} size="small" sx={{ mr: 0.5, mb: 0.5 }} />)}
                        </Box>
                    )}
                </>
            )}
        </div>
    );
};

export default DashboardPanel;
