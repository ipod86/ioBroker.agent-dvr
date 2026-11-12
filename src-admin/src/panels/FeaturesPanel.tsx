import React, { useEffect, useState } from 'react';
import { Grid } from '@mui/material';
import FormField, { SectionHeader } from '../components/FormField';
import RecordingFilesSection from '../components/RecordingFilesSection';

interface Props {
	native: any;
	onChange: (k: string, v: any) => void;
	socket?: any;
	instance: number;
}

const FeaturesPanel: React.FC<Props> = ({ native, onChange, socket, instance }) => {
	const [webs, setWebs] = useState<{ value: string; labelKey: string }[]>([]);
	useEffect(() => {
		socket
			?.getAdapterInstances('web')
			.then((list: any[]) =>
				setWebs(
					list.map(o => {
						const id = o._id.replace('system.adapter.', '');
						return {
							value: id,
							labelKey: `${id} (${o.native?.secure ? 'https' : 'http'} :${o.native?.port})`,
						};
					}),
				),
			)
			.catch(() => setWebs([]));
	}, [socket]);
	return (
		<div>
			<SectionHeader textKey="hdrControls" />
			<Grid
				container
				spacing={1}
			>
				<Grid
					item
					xs={12}
					sm={6}
					md={4}
				>
					<FormField
						type="checkbox"
						labelKey="cfgEnableSystemControls"
						helpKey="cfgEnableSystemControls_tt"
						value={native.enableSystemControls}
						onChange={v => onChange('enableSystemControls', v)}
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
						labelKey="cfgEnablePtz"
						helpKey="cfgEnablePtz_tt"
						value={native.enablePtz}
						onChange={v => onChange('enablePtz', v)}
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
						labelKey="cfgEnableUrls"
						helpKey="cfgEnableUrls_tt"
						value={native.enableUrls}
						onChange={v => onChange('enableUrls', v)}
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
						labelKey="cfgEnableSnapshotB64"
						helpKey="cfgEnableSnapshotB64_tt"
						value={native.enableSnapshotB64}
						onChange={v => onChange('enableSnapshotB64', v)}
					/>
				</Grid>
			</Grid>
			<SectionHeader textKey="hdrEvents" />
			<Grid
				container
				spacing={1}
			>
				<Grid
					item
					xs={12}
					sm={6}
					md={4}
				>
					<FormField
						type="checkbox"
						labelKey="cfgEnableEventDps"
						helpKey="cfgEnableEventDps_tt"
						value={native.enableEventDps}
						onChange={v => onChange('enableEventDps', v)}
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
						labelKey="cfgEnableAlertPhotos"
						helpKey="cfgEnableAlertPhotos_tt"
						value={native.enableAlertPhotos ?? true}
						onChange={v => onChange('enableAlertPhotos', v)}
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
						labelKey="cfgPhotoWebInstance"
						helpKey="cfgPhotoWebInstance_tt"
						value={native.photoWebInstance ?? ''}
						onChange={v => onChange('photoWebInstance', v)}
						options={[{ value: '', labelKey: 'cfgPhotoWebAuto' }, ...webs]}
					/>
				</Grid>
			</Grid>
			<RecordingFilesSection
				native={native}
				onChange={onChange}
				socket={socket}
				instance={instance}
			/>
			<SectionHeader textKey="hdrDisplay" />
			<Grid
				container
				spacing={1}
			>
				<Grid
					item
					xs={12}
					sm={6}
					md={4}
				>
					<FormField
						type="checkbox"
						labelKey="cfgEnableOverview"
						helpKey="cfgEnableOverview_tt"
						value={native.enableOverview}
						onChange={v => onChange('enableOverview', v)}
					/>
				</Grid>
			</Grid>
			<SectionHeader textKey="hdrProxy" />
			<Grid
				container
				spacing={1}
			>
				<Grid
					item
					xs={12}
					sm={6}
					md={4}
				>
					<FormField
						type="checkbox"
						labelKey="cfgEnableStreamProxy"
						helpKey="cfgEnableStreamProxy_tt"
						value={native.enableStreamProxy}
						onChange={v => onChange('enableStreamProxy', v)}
					/>
				</Grid>
			</Grid>
			<SectionHeader textKey="hdrDebug" />
			<Grid
				container
				spacing={1}
			>
				<Grid
					item
					xs={12}
					sm={6}
					md={4}
				>
					<FormField
						type="checkbox"
						labelKey="cfgStoreRawJson"
						helpKey="cfgStoreRawJson_tt"
						value={native.storeRawJson}
						onChange={v => onChange('storeRawJson', v)}
					/>
				</Grid>
			</Grid>
		</div>
	);
};

export default FeaturesPanel;
