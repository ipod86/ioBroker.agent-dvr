import React from 'react';
import type { GenericAppProps, GenericAppState } from '@iobroker/adapter-react-v5';
import { GenericApp, AdminConnection, I18n } from '@iobroker/adapter-react-v5';
import { ThemeProvider, StyledEngineProvider } from '@mui/material/styles';
import { Box, Tab, Tabs } from '@mui/material';
import ConnectionPanel from './panels/ConnectionPanel';
import FeaturesPanel from './panels/FeaturesPanel';
import WidgetPanel from './panels/WidgetPanel';
import DashboardPanel from './panels/DashboardPanel';
import AdvancedPanel from './panels/AdvancedPanel';

import en from '../../admin/i18n/en.json';
import de from '../../admin/i18n/de.json';

interface AppState extends GenericAppState {
	tab: number;
}

class App extends GenericApp<GenericAppProps, AppState> {
	constructor(props: GenericAppProps) {
		super(props, {
			encryptedFields: ['pass'],
			Connection: AdminConnection,
			translations: { en, de },
		} as any);
	}

	render(): React.JSX.Element {
		if (!this.state.loaded) {
			return super.render();
		}

		const tab = (this.state as any).tab ?? 0;
		const native = this.state.native as any;

		const handleChange = (key: string, value: any): void => {
			this.setState({
				native: { ...native, [key]: value },
				changed: this.getIsChanged({ ...native, [key]: value }),
			});
		};

		return (
			<StyledEngineProvider injectFirst>
				<ThemeProvider theme={this.state.theme}>
					<Box
						sx={{
							display: 'flex',
							flexDirection: 'column',
							height: '100%',
							overflow: 'hidden',
							bgcolor: 'background.default',
							color: 'text.primary',
						}}
					>
						<Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
							<Tabs
								value={tab}
								onChange={(_, v) => this.setState({ tab: v } as any)}
							>
								<Tab label={I18n.t('tabConnection')} />
								<Tab label={I18n.t('tabFeatures')} />
								<Tab label={I18n.t('tabWidget')} />
								<Tab label={I18n.t('tabDashboard')} />
								<Tab label={I18n.t('tabAdvanced')} />
							</Tabs>
						</Box>
						<Box sx={{ flex: 1, overflowY: 'auto', p: 2, pb: 12 }}>
							{tab === 0 && (
								<ConnectionPanel
									native={native}
									onChange={handleChange}
								/>
							)}
							{tab === 1 && (
								<FeaturesPanel
									native={native}
									onChange={handleChange}
								/>
							)}
							{tab === 2 && (
								<WidgetPanel
									native={native}
									onChange={handleChange}
								/>
							)}
							{tab === 3 && (
								<DashboardPanel
									native={native}
									onChange={handleChange}
									socket={(this as any).socket}
									instance={(this as any).instance ?? 0}
								/>
							)}
							{tab === 4 && (
								<AdvancedPanel
									native={native}
									onChange={handleChange}
								/>
							)}
						</Box>
						{this.renderError()}
						{this.renderSaveCloseButtons()}
					</Box>
				</ThemeProvider>
			</StyledEngineProvider>
		);
	}
}

export default App;
