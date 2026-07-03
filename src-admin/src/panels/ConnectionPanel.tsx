import React from 'react';
import { Grid } from '@mui/material';
import FormField from '../components/FormField';

interface Props {
	native: any;
	onChange: (k: string, v: any) => void;
}

const ConnectionPanel: React.FC<Props> = ({ native, onChange }) => (
	<Grid
		container
		spacing={2}
	>
		<Grid
			item
			xs={12}
			sm={12}
			md={6}
			lg={4}
		>
			<FormField
				type="text"
				labelKey="cfgIp"
				value={native.ip ?? ''}
				onChange={v => onChange('ip', v)}
			/>
		</Grid>
		<Grid
			item
			xs={12}
			sm={6}
			md={4}
			lg={3}
		>
			<FormField
				type="number"
				labelKey="cfgPort"
				value={native.port ?? 8090}
				min={1}
				max={65535}
				onChange={v => onChange('port', v)}
			/>
		</Grid>
		<Grid
			item
			xs={12}
			sm={6}
			md={4}
			lg={3}
		>
			<FormField
				type="text"
				labelKey="cfgUser"
				value={native.user ?? ''}
				onChange={v => onChange('user', v)}
			/>
		</Grid>
		<Grid
			item
			xs={12}
			sm={6}
			md={4}
			lg={3}
		>
			<FormField
				type="password"
				labelKey="cfgPass"
				value={native.pass ?? ''}
				onChange={v => onChange('pass', v)}
			/>
		</Grid>
		<Grid
			item
			xs={12}
			sm={6}
			md={4}
			lg={3}
		>
			<FormField
				type="number"
				labelKey="cfgPollSeconds"
				helpKey="cfgPollSeconds"
				value={native.pollSeconds ?? 30}
				min={5}
				max={3600}
				onChange={v => onChange('pollSeconds', v)}
			/>
		</Grid>
		<Grid
			item
			xs={12}
			sm={6}
			md={4}
			lg={3}
		>
			<FormField
				type="number"
				labelKey="cfgHttpTimeoutMs"
				value={native.httpTimeoutMs ?? 8000}
				min={1000}
				max={30000}
				onChange={v => onChange('httpTimeoutMs', v)}
			/>
		</Grid>
	</Grid>
);

export default ConnectionPanel;
