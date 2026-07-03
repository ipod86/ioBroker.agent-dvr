import React from 'react';
import { Grid } from '@mui/material';
import FormField, { SectionHeader, ColorField } from '../components/FormField';

interface Props {
	native: any;
	onChange: (k: string, v: any) => void;
}

const WidgetPanel: React.FC<Props> = ({ native, onChange }) => (
	<div>
		<SectionHeader textKey="hdrWidgetGeneral" />
		<Grid
			container
			spacing={2}
		>
			<Grid
				item
				xs={12}
				sm={6}
				md={4}
			>
				<FormField
					type="checkbox"
					labelKey="cfgEnableWidget"
					helpKey="cfgEnableWidget_tt"
					value={native.enableWidget}
					onChange={v => onChange('enableWidget', v)}
				/>
			</Grid>
			<Grid
				item
				xs={12}
				sm={6}
				md={6}
				lg={5}
			>
				<FormField
					type="select"
					labelKey="cfgWidgetMode"
					helpKey="cfgWidgetMode_tt"
					value={native.widgetMode ?? 'nojs'}
					onChange={v => onChange('widgetMode', v)}
					options={[
						{ value: 'nojs', labelKey: 'cfgWidgetModeNojs' },
						{ value: 'js', labelKey: 'cfgWidgetModeJs' },
					]}
				/>
			</Grid>
		</Grid>

		<SectionHeader textKey="hdrWidgetLayout" />
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
					labelKey="cfgWidgetAnzahl"
					helpKey="cfgWidgetAnzahl_tt"
					value={native.widgetAnzahl ?? 20}
					min={1}
					max={500}
					onChange={v => onChange('widgetAnzahl', v)}
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
					labelKey="cfgWidgetMinCol"
					helpKey="cfgWidgetMinCol_tt"
					value={native.widgetMinCol ?? 150}
					min={80}
					max={600}
					onChange={v => onChange('widgetMinCol', v)}
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
					labelKey="cfgWidgetMaxModalWidth"
					helpKey="cfgWidgetMaxModalWidth_tt"
					value={native.widgetMaxModalWidth ?? 900}
					min={300}
					max={2000}
					onChange={v => onChange('widgetMaxModalWidth', v)}
				/>
			</Grid>
		</Grid>

		<SectionHeader textKey="hdrWidgetTags" />
		<Grid
			container
			spacing={2}
		>
			<Grid
				item
				xs={12}
				sm={6}
				md={4}
			>
				<FormField
					type="checkbox"
					labelKey="cfgWidgetShowTags"
					helpKey="cfgWidgetShowTags_tt"
					value={native.widgetShowTags}
					onChange={v => onChange('widgetShowTags', v)}
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
					labelKey="cfgWidgetTagPosition"
					helpKey="cfgWidgetTagPosition_tt"
					value={native.widgetTagPosition ?? 'bottom-left'}
					onChange={v => onChange('widgetTagPosition', v)}
					options={[
						{ value: 'top-left', labelKey: 'cfgTagPosTopLeft' },
						{ value: 'top-right', labelKey: 'cfgTagPosTopRight' },
						{ value: 'bottom-left', labelKey: 'cfgTagPosBotLeft' },
						{ value: 'bottom-right', labelKey: 'cfgTagPosBotRight' },
					]}
				/>
			</Grid>
		</Grid>

		<SectionHeader textKey="hdrWidgetFilter" />
		<Grid
			container
			spacing={2}
		>
			<Grid
				item
				xs={12}
				sm={6}
				md={4}
			>
				<FormField
					type="checkbox"
					labelKey="cfgWidgetSortNewest"
					helpKey="cfgWidgetSortNewest_tt"
					value={native.widgetSortNewest !== false}
					onChange={v => onChange('widgetSortNewest', v)}
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
					labelKey="cfgWidgetShowSearch"
					helpKey="cfgWidgetShowSearch_tt"
					value={native.widgetShowSearch}
					onChange={v => onChange('widgetShowSearch', v)}
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
					labelKey="cfgWidgetCompact"
					helpKey="cfgWidgetCompact_tt"
					value={native.widgetCompact}
					onChange={v => onChange('widgetCompact', v)}
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
					labelKey="cfgWidgetDefaultTag"
					helpKey="cfgWidgetDefaultTag_tt"
					value={native.widgetDefaultTag ?? ''}
					onChange={v => onChange('widgetDefaultTag', v)}
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
					type="select"
					labelKey="cfgWidgetThumbSize"
					helpKey="cfgWidgetThumbSize_tt"
					value={native.widgetThumbSize ?? 'medium'}
					onChange={v => onChange('widgetThumbSize', v)}
					options={[
						{ value: 'small', labelKey: 'cfgWidgetThumbSmall' },
						{ value: 'medium', labelKey: 'cfgWidgetThumbMedium' },
						{ value: 'large', labelKey: 'cfgWidgetThumbLarge' },
					]}
				/>
			</Grid>
		</Grid>

		<SectionHeader textKey="hdrWidgetPlayer" />
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
					type="text"
					labelKey="cfgWidgetLiveAspect"
					helpKey="cfgWidgetLiveAspect_tt"
					value={native.widgetLiveAspect ?? ''}
					onChange={v => onChange('widgetLiveAspect', v)}
				/>
			</Grid>
			<Grid
				item
				xs={12}
				sm={12}
				md={8}
			>
				<FormField
					type="text"
					labelKey="cfgWidgetPlayerUrl"
					helpKey="cfgWidgetPlayerUrl_tt"
					value={native.widgetPlayerUrl ?? ''}
					onChange={v => onChange('widgetPlayerUrl', v)}
				/>
			</Grid>
		</Grid>

		<SectionHeader textKey="hdrWidgetTheme" />
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
				<ColorField
					labelKey="cfgWidgetColorCardBg"
					helpKey="cfgWidgetColorCardBg_tt"
					value={native.widgetColorCardBg ?? ''}
					onChange={v => onChange('widgetColorCardBg', v)}
				/>
			</Grid>
			<Grid
				item
				xs={12}
				sm={6}
				md={3}
				lg={2}
			>
				<ColorField
					labelKey="cfgWidgetColorTagBg"
					helpKey="cfgWidgetColorTagBg_tt"
					value={native.widgetColorTagBg ?? ''}
					onChange={v => onChange('widgetColorTagBg', v)}
				/>
			</Grid>
			<Grid
				item
				xs={12}
				sm={6}
				md={3}
				lg={2}
			>
				<ColorField
					labelKey="cfgWidgetColorTagText"
					helpKey="cfgWidgetColorTagText_tt"
					value={native.widgetColorTagText ?? ''}
					onChange={v => onChange('widgetColorTagText', v)}
				/>
			</Grid>
			<Grid
				item
				xs={12}
				sm={6}
				md={3}
				lg={2}
			>
				<ColorField
					labelKey="cfgWidgetColorAccent"
					helpKey="cfgWidgetColorAccent_tt"
					value={native.widgetColorAccent ?? ''}
					onChange={v => onChange('widgetColorAccent', v)}
				/>
			</Grid>
			<Grid
				item
				xs={12}
				sm={6}
				md={3}
				lg={2}
			>
				<ColorField
					labelKey="cfgWidgetColorModalBg"
					helpKey="cfgWidgetColorModalBg_tt"
					value={native.widgetColorModalBg ?? ''}
					onChange={v => onChange('widgetColorModalBg', v)}
				/>
			</Grid>
			<Grid
				item
				xs={12}
				sm={6}
				md={3}
				lg={2}
			>
				<FormField
					type="number"
					labelKey="cfgWidgetBorderRadius"
					helpKey="cfgWidgetBorderRadius_tt"
					value={native.widgetBorderRadius ?? 4}
					min={0}
					max={32}
					onChange={v => onChange('widgetBorderRadius', v)}
				/>
			</Grid>
		</Grid>
	</div>
);

export default WidgetPanel;
