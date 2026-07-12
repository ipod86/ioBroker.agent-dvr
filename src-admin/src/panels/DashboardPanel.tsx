import React, { useState, useEffect, useCallback } from 'react';
import { I18n } from '@iobroker/adapter-react-v5';
import {
	Grid,
	Box,
	Typography,
	CircularProgress,
	Alert,
	Table,
	TableHead,
	TableBody,
	TableRow,
	TableCell,
	TableContainer,
	Paper,
	Select,
	MenuItem,
	FormControl,
	Divider,
	Chip,
	IconButton,
	Tooltip,
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
		if (!e || typeof e !== 'object') {
			continue;
		}
		const id = e.id ?? e.oid;
		if (id == null) {
			continue;
		}
		const rawName = typeof e.name === 'string' ? e.name : `obj_${id}`;
		const ot = e.typeID ?? e.ot ?? e.objectTypeID ?? e.type;
		if (ot !== 2) {
			continue;
		} // ot=2 = camera; ot=1 = microphone → exclude
		// Sanitize OID same as adapter's sanitize() + deviceFolder() to ensure key matches ioBroker state path
		const safeId = String(id)
			.replace(/[\s.[\]*?"'`,;:/\\]+/g, '_')
			.replace(/[^A-Za-z0-9_-]/g, '_');
		const key = `cam_${safeId}_${
			rawName
				.replace(/[\s.[\]*?"'`,;:/\\]+/g, '_')
				.replace(/[^A-Za-z0-9_-]/g, '_')
				.replace(/_+/g, '_')
				.replace(/^_+|_+$/g, '') || 'x'
		}`;
		out.push({ key, name: rawName });
	}
	out.sort((a, b) => a.name.localeCompare(b.name));
	return out;
}

function parseStreamsFromApi(json: any): string[] {
	if (!json || typeof json !== 'object') {
		return [];
	}
	return Object.keys(json).sort();
}

const DashboardPanel: React.FC<Props> = ({ native, onChange, socket, instance }) => {
	const [cameras, setCameras] = useState<Camera[] | null>(null);
	const [streams, setStreams] = useState<string[]>([]);
	const [fetchError, setFetchError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const cameraStreams: Record<string, string> = native.cameraStreams || {};
	const anyGo2rtc = Object.values(cameraStreams).some(v => v && v !== 'mjpeg' && v !== 'mp4');

	function getCameraStream(camKey: string): string {
		return cameraStreams[camKey] ?? 'mjpeg';
	}

	function setCameraStream(camKey: string, val: string): void {
		onChange('cameraStreams', { ...cameraStreams, [camKey]: val });
	}

	const fetchData = useCallback(async () => {
		const ip = (native.serverIp || '').trim();
		const port = native.port || 8090;
		let go2rtcUrl = (native.go2rtcUrl || '').trim();
		go2rtcUrl = go2rtcUrl.replace(/^https:\/\//i, 'http://');
		if (go2rtcUrl && !go2rtcUrl.startsWith('http://')) {
			go2rtcUrl = `http://${go2rtcUrl}`;
		}

		if (!ip) {
			setCameras([]);
			setFetchError(I18n.t('cfgIpMissing'));
			return;
		}

		setLoading(true);
		setFetchError(null);

		try {
			let cams: Camera[] = [];
			let strms: string[] = [];

			// --- Cameras from AgentDVR ---
			const controller = new AbortController();
			const timer = setTimeout(() => controller.abort(), 4000);
			try {
				const res = await fetch(`http://${ip}:${port}/command/getObjects`, {
					signal: controller.signal,
					headers: native.user
						? { Authorization: `Basic ${btoa(`${native.user}:${native.pass ?? ''}`)}` }
						: {},
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
					// Adapter-Fallback (HTTPS-Admin blockiert HTTP-Fetch)
					try {
						const result = await Promise.race([
							socket.sendTo(`agent-dvr.${instance}`, 'getAgentDvrCameras', null),
							new Promise<any>(resolve => setTimeout(() => resolve(null), 5000)),
						]);
						if (result?.cameras?.length) {
							cams = result.cameras;
						} else {
							setFetchError(`AgentDVR: ${e?.message || e}`);
						}
					} catch {
						setFetchError(`AgentDVR: ${e?.message || e}`);
					}
				}
			}
			clearTimeout(timer);

			// --- go2rtc Streams ---
			if (go2rtcUrl) {
				let browserOk = false;
				try {
					const g2ctrl = new AbortController();
					const g2timer = setTimeout(() => g2ctrl.abort(), 4000);
					const r = await fetch(`${go2rtcUrl}/api/streams`, { signal: g2ctrl.signal });
					clearTimeout(g2timer);
					if (r.ok) {
						strms = parseStreamsFromApi(await r.json());
						browserOk = true;
					}
				} catch {
					/* Mixed-Content / CORS → Adapter-Fallback */
				}

				if (!browserOk) {
					try {
						const rawResult = await Promise.race([
							socket.sendTo(`agent-dvr.${instance}`, 'getGo2rtcStreams', { url: go2rtcUrl }),
							new Promise<any>(resolve => setTimeout(() => resolve({ _timeout: true }), 6000)),
						]);
						if (rawResult?._timeout) {
							setFetchError(prev => `${prev ? `${prev} | ` : ''}go2rtc: Timeout`);
						} else if (Array.isArray(rawResult?.streams)) {
							strms = rawResult.streams;
							if (strms.length === 0 && rawResult.error) {
								setFetchError(prev => (prev ? `${prev} | ` : '') + rawResult.error);
							}
						}
					} catch {
						/* ignore */
					}
				}
			}

			setCameras(cams);
			setStreams(strms);
		} finally {
			setLoading(false);
		}
	}, [native.serverIp, native.port, native.go2rtcUrl, native.user, native.pass, socket, instance]);

	useEffect(() => {
		const t = setTimeout(() => void fetchData(), 600);
		return () => clearTimeout(t);
	}, [native.serverIp, native.port, native.go2rtcUrl, native.user, native.pass, fetchData]);

	return (
		<div>
			<SectionHeader textKey="hdrDashView" />
			<Grid
				container
				spacing={2}
			>
				<Grid
					item
					xs={12}
					sm={6}
					md={4}
					lg={3}
				>
					<FormField
						type="select"
						labelKey="cfgDashDefaultView"
						helpKey="cfgDashDefaultView_tt"
						value={native.dashDefaultView ?? 'live'}
						onChange={v => onChange('dashDefaultView', v)}
						options={[
							{ value: 'live', labelKey: 'cfgDashViewLive' },
							{ value: 'recordings', labelKey: 'cfgDashViewRec' },
						]}
					/>
				</Grid>
				<Grid
					item
					xs={12}
					sm={6}
					md={4}
				>
					<FormField
						type="checkbox"
						labelKey="cfgDashShowOffline"
						helpKey="cfgDashShowOffline_tt"
						value={native.dashShowOffline}
						onChange={v => onChange('dashShowOffline', v)}
					/>
				</Grid>
			</Grid>

			<SectionHeader textKey="hdrDashGrid" />
			<Grid
				container
				spacing={2}
			>
				<Grid
					item
					xs={12}
					sm={6}
					md={3}
					lg={2}
				>
					<FormField
						type="number"
						labelKey="cfgDashGridCols"
						helpKey="cfgDashGridCols_tt"
						value={native.dashGridCols ?? 0}
						min={0}
						max={8}
						onChange={v => onChange('dashGridCols', v)}
					/>
				</Grid>
				<Grid
					item
					xs={12}
					sm={6}
					md={4}
				>
					<FormField
						type="checkbox"
						labelKey="cfgDashBtnsVisible"
						helpKey="cfgDashBtnsVisible_tt"
						value={native.dashBtnsVisible}
						onChange={v => onChange('dashBtnsVisible', v)}
					/>
				</Grid>
				<Grid
					item
					xs={12}
					sm={6}
					md={4}
				>
					<FormField
						type="select"
						labelKey="cfgDashTagPosition"
						helpKey="cfgDashTagPosition_tt"
						value={native.dashTagPosition ?? 'bottom-right'}
						onChange={v => onChange('dashTagPosition', v)}
						options={[
							{ value: 'top-left', labelKey: 'cfgTagPosTopLeft' },
							{ value: 'top-right', labelKey: 'cfgTagPosTopRight' },
							{ value: 'bottom-left', labelKey: 'cfgTagPosBotLeft' },
							{ value: 'bottom-right', labelKey: 'cfgTagPosBotRight' },
						]}
					/>
				</Grid>
			</Grid>

			<SectionHeader textKey="hdrDashStream" />
			<Grid
				container
				spacing={2}
			>
				<Grid
					item
					xs={12}
					sm={6}
					md={4}
					lg={3}
				>
					<FormField
						type="number"
						labelKey="cfgDashRefreshSec"
						helpKey="cfgDashRefreshSec_tt"
						value={native.dashRefreshSec ?? 60}
						min={10}
						max={600}
						onChange={v => onChange('dashRefreshSec', v)}
					/>
				</Grid>
				<Grid
					item
					xs={12}
					sm={6}
					md={4}
				>
					<FormField
						type="checkbox"
						labelKey="cfgDashStreamReconnect"
						helpKey="cfgDashStreamReconnect_tt"
						value={native.dashStreamReconnect !== false}
						onChange={v => onChange('dashStreamReconnect', v)}
					/>
				</Grid>
			</Grid>

			<SectionHeader textKey="hdrDashTheme" />
			<Grid
				container
				spacing={2}
			>
				{(
					[
						'dashColorBg',
						'dashColorSurface',
						'dashColorAccent',
						'dashColorText',
						'dashColorBorder',
						'dashColorOnline',
						'dashColorOffline',
					] as const
				).map(k => (
					<Grid
						key={k}
						item
						xs={12}
						sm={6}
						md={3}
						lg={2}
					>
						<ColorField
							labelKey={`cfg${k.charAt(0).toUpperCase()}${k.slice(1)}`}
							helpKey={`cfg${k.charAt(0).toUpperCase()}${k.slice(1)}_tt`}
							value={native[k] ?? ''}
							onChange={v => onChange(k, v)}
						/>
					</Grid>
				))}
			</Grid>

			{/* ── Camera stream table ── */}
			<SectionHeader textKey="hdrCameraStreams" />
			<Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
				<Typography
					variant="subtitle2"
					color="text.secondary"
					sx={{ flex: 1 }}
				>
					{I18n.t('cfgGo2rtcMapping_tt')}
				</Typography>
				<Tooltip title={I18n.t('reload')}>
					<IconButton
						size="small"
						onClick={() => void fetchData()}
						disabled={loading}
					>
						{loading ? <CircularProgress size={18} /> : <RefreshIcon />}
					</IconButton>
				</Tooltip>
			</Box>

			{fetchError && (
				<Alert
					severity="warning"
					sx={{ mb: 1 }}
				>
					{fetchError}
				</Alert>
			)}

			{loading && (
				<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
					<CircularProgress size={16} />
					<Typography variant="caption">{I18n.t('loadingCamerasAndStreams')}</Typography>
				</Box>
			)}

			{cameras !== null && cameras.length === 0 && !loading && (
				<Alert
					severity="info"
					sx={{ mb: 2 }}
				>
					{I18n.t('cfgNoCamerasFound')}
				</Alert>
			)}

			{cameras !== null && cameras.length > 0 && (
				<TableContainer
					component={Paper}
					variant="outlined"
					sx={{ mb: 2 }}
				>
					<Table size="small">
						<TableHead>
							<TableRow>
								<TableCell>
									<strong>{I18n.t('cfgCameraColumn')}</strong>
								</TableCell>
								<TableCell>
									<strong>{I18n.t('cfgStreamSourceColumn')}</strong>
								</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{cameras.map(cam => (
								<TableRow
									key={cam.key}
									hover
								>
									<TableCell>
										<Box>
											<Typography variant="body2">{cam.name}</Typography>
											<Typography
												variant="caption"
												color="text.secondary"
												sx={{ fontFamily: 'monospace' }}
											>
												{cam.key}
											</Typography>
										</Box>
									</TableCell>
									<TableCell sx={{ minWidth: 240 }}>
										<FormControl
											size="small"
											fullWidth
										>
											<Select
												value={getCameraStream(cam.key)}
												onChange={e => setCameraStream(cam.key, e.target.value)}
											>
												<MenuItem value="mjpeg">
													<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
														MJPEG
														<Chip
															label="AgentDVR"
															size="small"
															variant="outlined"
														/>
													</Box>
												</MenuItem>
												<MenuItem value="mp4">
													<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
														MP4 / FLV (mit Ton)
														<Chip
															label="AgentDVR"
															size="small"
															variant="outlined"
														/>
													</Box>
												</MenuItem>
												{streams.length > 0 && <Divider />}
												{streams.map(s => (
													<MenuItem
														key={s}
														value={s}
													>
														<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
															{s}
															<Chip
																label="go2rtc"
																size="small"
																color="primary"
																variant="outlined"
															/>
														</Box>
													</MenuItem>
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
			{/* ── go2rtc URL — only visible when at least one camera uses go2rtc ── */}
			{anyGo2rtc && (
				<>
					<SectionHeader textKey="hdrGo2rtc" />
					<Grid
						container
						spacing={2}
					>
						<Grid
							item
							xs={12}
							sm={8}
							md={6}
							lg={5}
						>
							<FormField
								type="text"
								labelKey="cfgGo2rtcUrl"
								helpKey="cfgGo2rtcUrl_tt"
								value={native.go2rtcUrl ?? ''}
								onChange={v => onChange('go2rtcUrl', v)}
							/>
						</Grid>
					</Grid>
				</>
			)}
		</div>
	);
};

export default DashboardPanel;
