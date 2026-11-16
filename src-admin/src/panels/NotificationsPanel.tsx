import React, { useEffect, useState } from 'react';
import { I18n } from '@iobroker/adapter-react-v5';
import { Alert, Checkbox, FormControlLabel, FormGroup, Grid, Typography } from '@mui/material';
import FormField, { SectionHeader } from '../components/FormField';

interface Props {
	native: any;
	onChange: (k: string, v: any) => void;
	socket?: any;
	instance?: number;
}

interface Cam {
	oid: string;
	name: string;
}

const Check: React.FC<{ native: any; onChange: Props['onChange']; attr: string; help?: string }> = ({
	native,
	onChange,
	attr,
	help,
}) => (
	<Grid
		item
		xs={12}
		md={6}
	>
		<FormField
			type="checkbox"
			labelKey={`cfg_${attr}`}
			helpKey={help}
			value={!!native[attr]}
			onChange={v => onChange(attr, v)}
		/>
	</Grid>
);

/**
 * Settings of the notifications (ioBroker notification system, forwarded by the notification-manager)
 *
 * @param props properties of the panel
 * @param props.native adapter settings
 * @param props.onChange changes one setting
 * @param props.socket connection to the adapter
 * @param props.instance instance number
 */
const NotificationsPanel: React.FC<Props> = ({ native, onChange, socket, instance }) => {
	const eventsOff = !native.enableEventDps && !native.enableWidget;
	const [cams, setCams] = useState<Cam[] | null>(null);

	// cameras of the running instance; the ids stay valid when a camera is renamed in Agent DVR
	useEffect(() => {
		if (!socket) {
			return;
		}
		let gone = false;
		const target = `agent-dvr.${instance ?? 0}`;
		const timeout = new Promise<null>(resolve => setTimeout(() => resolve(null), 5000));
		void Promise.race([socket.sendTo(target, 'getAgentDvrCameras', null), timeout])
			.then((res: any) => {
				if (!gone) {
					setCams(
						Array.isArray(res?.cameras)
							? res.cameras
									.filter((c: any) => c.oid !== undefined)
									.map((c: any) => ({ oid: String(c.oid), name: c.name }))
							: [],
					);
				}
			})
			.catch(() => !gone && setCams([]));
		return () => {
			gone = true;
		};
	}, [socket, instance]);

	const off: string[] = Array.isArray(native.notifyCamerasOff) ? native.notifyCamerasOff.map(String) : [];
	// unchecked cameras that Agent DVR no longer reports stay visible, so they can be checked again
	const listed: Cam[] = [
		...(cams ?? []),
		...off
			.filter(id => !(cams ?? []).some(c => c.oid === id))
			.map(id => ({ oid: id, name: I18n.t('notifyCamGone', id) })),
	];
	const toggle = (id: string, on: boolean): void =>
		onChange('notifyCamerasOff', on ? off.filter(x => x !== id) : [...off, id]);
	return (
		<Grid
			container
			spacing={1}
		>
			<Grid
				item
				xs={12}
			>
				<Alert severity="info">{I18n.t('notifyIntro')}</Alert>
			</Grid>

			<Grid
				item
				xs={12}
			>
				<SectionHeader textKey="notifyHeaderConnection" />
			</Grid>
			<Check
				native={native}
				onChange={onChange}
				attr="notifyCameraOffline"
				help="cfg_notifyCameraOffline_help"
			/>
			<Check
				native={native}
				onChange={onChange}
				attr="notifyCameraOnline"
				help="cfg_notifyCameraOnline_help"
			/>
			<Check
				native={native}
				onChange={onChange}
				attr="notifyServerOffline"
				help="cfg_notifyServerOffline_help"
			/>
			<Grid
				item
				xs={12}
				sm={6}
				md={4}
				lg={3}
			>
				<FormField
					type="number"
					labelKey="cfg_notifyOfflineMinutes"
					helpKey="cfg_notifyOfflineMinutes_help"
					value={native.notifyOfflineMinutes ?? 10}
					min={1}
					max={1440}
					onChange={v => onChange('notifyOfflineMinutes', v)}
				/>
			</Grid>

			<Grid
				item
				xs={12}
			>
				<SectionHeader textKey="notifyHeaderDetections" />
			</Grid>
			{eventsOff && (
				<Grid
					item
					xs={12}
				>
					<Alert severity="warning">{I18n.t('notifyEventsOff')}</Alert>
				</Grid>
			)}
			<Check
				native={native}
				onChange={onChange}
				attr="notifyPerson"
			/>
			<Check
				native={native}
				onChange={onChange}
				attr="notifyAnimal"
			/>
			<Check
				native={native}
				onChange={onChange}
				attr="notifyVehicle"
			/>
			<Check
				native={native}
				onChange={onChange}
				attr="notifyOtherTags"
				help="cfg_notifyOtherTags_help"
			/>
			<Check
				native={native}
				onChange={onChange}
				attr="notifyNewRecording"
			/>

			<Grid
				item
				xs={12}
			>
				<SectionHeader textKey="notifyHeaderCameras" />
			</Grid>
			<Grid
				item
				xs={12}
			>
				<Typography
					variant="body2"
					sx={{ color: 'text.secondary', mb: 1 }}
				>
					{I18n.t('notifyCamerasHelp')}
				</Typography>
				{cams === null ? (
					<Typography variant="body2">{I18n.t('notifyCamsLoading')}</Typography>
				) : listed.length === 0 ? (
					<Alert severity="info">{I18n.t('notifyCamsNone')}</Alert>
				) : (
					<FormGroup>
						{listed.map(c => (
							<FormControlLabel
								key={c.oid}
								control={
									<Checkbox
										checked={!off.includes(c.oid)}
										onChange={e => toggle(c.oid, e.target.checked)}
									/>
								}
								label={c.name}
							/>
						))}
					</FormGroup>
				)}
			</Grid>
		</Grid>
	);
};

export default NotificationsPanel;
