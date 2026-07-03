import React from 'react';
import { Grid } from '@mui/material';
import FormField from '../components/FormField';

interface Props {
	native: any;
	onChange: (k: string, v: any) => void;
}

const AdvancedPanel: React.FC<Props> = ({ native, onChange }) => (
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
				labelKey="cfgMaxDepth"
				value={native.maxDepth ?? 6}
				min={1}
				max={10}
				onChange={v => onChange('maxDepth', v)}
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
				labelKey="cfgMaxArray"
				value={native.maxArray ?? 30}
				min={1}
				max={500}
				onChange={v => onChange('maxArray', v)}
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
				labelKey="cfgEventTagsDynamic"
				value={native.eventTagsDynamic}
				onChange={v => onChange('eventTagsDynamic', v)}
			/>
		</Grid>
		<Grid
			item
			xs={12}
			sm={6}
			md={6}
			lg={4}
		>
			<FormField
				type="text"
				labelKey="cfgEventTagsIgnore"
				value={native.eventTagsIgnore ?? ''}
				onChange={v => onChange('eventTagsIgnore', v)}
			/>
		</Grid>
		<Grid
			item
			xs={12}
			sm={6}
			md={6}
			lg={4}
		>
			<FormField
				type="text"
				labelKey="cfgEventTags"
				value={native.eventTags ?? ''}
				onChange={v => onChange('eventTags', v)}
			/>
		</Grid>
	</Grid>
);

export default AdvancedPanel;
