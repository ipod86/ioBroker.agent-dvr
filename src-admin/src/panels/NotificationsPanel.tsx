import React from 'react';
import { I18n } from '@iobroker/adapter-react-v5';
import { Alert, Grid } from '@mui/material';
import FormField, { SectionHeader } from '../components/FormField';

interface Props {
	native: any;
	onChange: (k: string, v: any) => void;
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

/** Settings of the notifications (ioBroker notification system, forwarded by the notification-manager) */
const NotificationsPanel: React.FC<Props> = ({ native, onChange }) => {
	const eventsOff = !native.enableEventDps && !native.enableWidget;
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
				md={8}
			>
				<FormField
					type="text"
					labelKey="cfg_notifyCameras"
					helpKey="cfg_notifyCameras_help"
					value={native.notifyCameras ?? ''}
					onChange={v => onChange('notifyCameras', v)}
				/>
			</Grid>
		</Grid>
	);
};

export default NotificationsPanel;
