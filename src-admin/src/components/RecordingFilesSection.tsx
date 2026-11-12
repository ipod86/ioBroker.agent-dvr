import React, { useCallback, useEffect, useState } from 'react';
import { I18n } from '@iobroker/adapter-react-v5';
import { Alert, Box, Button, Checkbox, CircularProgress, FormControlLabel, Grid, Typography } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import FormField, { SectionHeader } from './FormField';

interface Props {
	native: any;
	onChange: (k: string, v: any) => void;
	socket?: any;
	instance: number;
}

interface FfmpegInfo {
	found: boolean;
	version: string;
	path: string;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
	return Promise.race([p, new Promise<null>(resolve => setTimeout(() => resolve(null), ms))]);
}

// Settings for "recordings in the ioBroker file storage" with the ffmpeg status of the running instance.
const RecordingFilesSection: React.FC<Props> = ({ native, onChange, socket, instance }) => {
	const target = `agent-dvr.${instance}`;
	const [alive, setAlive] = useState<boolean | null>(null);
	const [ff, setFf] = useState<FfmpegInfo | null>(null);
	const [busy, setBusy] = useState(false);
	const [cams, setCams] = useState<{ key: string; name: string }[]>([]);

	const detect = useCallback(
		async (path?: string): Promise<void> => {
			if (!socket) {
				return;
			}
			setBusy(true);
			try {
				const st = await socket.getState(`system.adapter.${target}.alive`);
				const isAlive = !!st?.val;
				setAlive(isAlive);
				if (!isAlive) {
					setFf(null);
					return;
				}
				const res: any = await withTimeout(
					socket.sendTo(target, 'detectFfmpeg', path !== undefined ? { path } : null),
					15000,
				);
				setFf(res && typeof res.found === 'boolean' ? res : null);
				const camRes: any = await withTimeout(socket.sendTo(target, 'getAgentDvrCameras', null), 5000);
				if (Array.isArray(camRes?.cameras)) {
					setCams(camRes.cameras);
				}
			} catch {
				setFf(null);
			} finally {
				setBusy(false);
			}
		},
		[socket, target],
	);

	useEffect(() => {
		void detect();
	}, [detect]);

	const sel: string[] = Array.isArray(native.recordingFileCams) ? native.recordingFileCams : [];
	const allCams = sel.length === 0;
	// selected cameras that AgentDVR no longer reports stay visible, so they can be unchecked
	const listed = cams.length
		? [
				...cams,
				...sel
					.filter(k => !cams.some(c => c.key === k))
					.map(k => ({ key: k, name: I18n.t('cfgRecordingCamGone', k) })),
			]
		: sel.map(k => ({ key: k, name: k }));

	return (
		<div>
			<SectionHeader textKey="hdrRecordingFiles" />
			<Grid
				container
				spacing={1}
			>
				<Grid
					item
					xs={12}
				>
					<FormField
						type="checkbox"
						labelKey="cfgEnableRecordingFiles"
						helpKey="cfgEnableRecordingFiles_tt"
						value={!!native.enableRecordingFiles}
						onChange={v => onChange('enableRecordingFiles', v)}
					/>
				</Grid>
				{native.enableRecordingFiles && (
					<>
						{native.enableRecordingFiles && native.enableEventDps === false && (
							<Grid
								item
								xs={12}
							>
								<Alert severity="warning">{I18n.t('cfgRecordingNeedsEventDps')}</Alert>
							</Grid>
						)}
						{native.enableRecordingFiles && (
							<Grid
								item
								xs={12}
								sm={6}
								md={3}
							>
								<FormField
									type="select"
									labelKey="cfgRecordingFileCount"
									helpKey="cfgRecordingFileCount_tt"
									value={String(native.recordingFileCount ?? 1)}
									onChange={v => onChange('recordingFileCount', parseInt(v, 10) || 1)}
									options={[
										{ value: '1', labelKey: '1' },
										{ value: '2', labelKey: '2' },
										{ value: '3', labelKey: '3' },
									]}
								/>
							</Grid>
						)}
						<Grid
							item
							xs={12}
							sm={6}
							md={3}
						>
							<FormField
								type="number"
								labelKey="cfgRecordingMaxSizeMb"
								helpKey="cfgRecordingMaxSizeMb_tt"
								value={native.recordingMaxSizeMb ?? 50}
								min={1}
								max={2000}
								onChange={v =>
									onChange('recordingMaxSizeMb', Math.max(1, Math.min(2000, Math.round(v))))
								}
							/>
							{(native.recordingMaxSizeMb ?? 50) > 50 && (
								<Typography
									variant="caption"
									color="warning.main"
									display="block"
									sx={{ mt: -1.5 }}
								>
									{I18n.t('cfgRecordingTelegramLimit')}
								</Typography>
							)}
						</Grid>
						<Grid
							item
							xs={12}
							sm={6}
							md={3}
						>
							<FormField
								type="number"
								labelKey="cfgRecordingTimeoutSec"
								helpKey="cfgRecordingTimeoutSec_tt"
								value={native.recordingTimeoutSec ?? 120}
								min={10}
								max={900}
								onChange={v =>
									onChange('recordingTimeoutSec', Math.max(10, Math.min(900, Math.round(v))))
								}
							/>
						</Grid>
						{native.enableRecordingFiles && (
							<Grid
								item
								xs={12}
							>
								<Typography
									variant="subtitle2"
									sx={{ mt: 1 }}
								>
									{I18n.t('cfgRecordingCams')}
								</Typography>
								<FormControlLabel
									control={
										<Checkbox
											checked={allCams}
											onChange={e =>
												onChange(
													'recordingFileCams',
													e.target.checked ? [] : cams.map(c => c.key),
												)
											}
											disabled={!allCams && !cams.length}
										/>
									}
									label={I18n.t('cfgRecordingCamsAll')}
								/>
								{!allCams || cams.length ? (
									<Box sx={{ display: 'flex', flexWrap: 'wrap', ml: 3 }}>
										{listed.map(c => (
											<FormControlLabel
												key={c.key}
												control={
													<Checkbox
														size="small"
														disabled={allCams}
														checked={allCams || sel.includes(c.key)}
														onChange={e =>
															onChange(
																'recordingFileCams',
																e.target.checked
																	? [...sel.filter(k => k !== c.key), c.key]
																	: sel.filter(k => k !== c.key),
															)
														}
													/>
												}
												label={c.name}
											/>
										))}
									</Box>
								) : null}
								{!cams.length && (
									<Typography
										variant="caption"
										display="block"
										color="text.secondary"
									>
										{I18n.t('cfgRecordingCamsNotRunning')}
									</Typography>
								)}
							</Grid>
						)}
						<Grid
							item
							xs={12}
							sm={6}
							md={4}
						>
							<FormField
								type="checkbox"
								labelKey="cfgRecordingMp4"
								helpKey="cfgRecordingMp4_tt"
								value={native.recordingMp4 !== false}
								onChange={v => onChange('recordingMp4', v)}
							/>
						</Grid>
						<Grid
							item
							xs={12}
							sm={6}
							md={4}
						>
							<FormField
								type="text"
								labelKey="cfgFfmpegPath"
								helpKey="cfgFfmpegPath_tt"
								value={native.ffmpegPath ?? ''}
								onChange={v => onChange('ffmpegPath', v)}
							/>
						</Grid>
						<Grid
							item
							xs={12}
						>
							<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
								<Box sx={{ flex: 1, minWidth: 240 }}>
									{alive === false || !socket ? (
										<Alert severity="info">{I18n.t('ffmpegNotRunning')}</Alert>
									) : ff?.found ? (
										<Alert severity="success">{I18n.t('ffmpegFound', ff.version, ff.path)}</Alert>
									) : ff ? (
										<Alert severity="warning">{I18n.t('ffmpegNotFound')}</Alert>
									) : (
										<Alert severity="info">{I18n.t('ffmpegChecking')}</Alert>
									)}
								</Box>
								<Button
									variant="outlined"
									startIcon={busy ? <CircularProgress size={16} /> : <RefreshIcon />}
									disabled={busy || !socket}
									onClick={() => void detect(native.ffmpegPath ?? '')}
								>
									{I18n.t('ffmpegSearchAgain')}
								</Button>
							</Box>
						</Grid>
					</>
				)}
			</Grid>
		</div>
	);
};

export default RecordingFilesSection;
