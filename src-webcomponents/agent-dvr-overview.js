/* Web-Komponente <iob-agent-dvr-overview>: die Live-Übersicht aller Kameras einer agent-dvr-Instanz in Aura,
   vis-2, devices und admin - wie der Datenpunkt widget_live_overview, aber im Browser gezeichnet. */
import { defineWebComponent } from '@iobroker/web-components/element';
import { TXT, instanceOf } from './common.js';
import { AgentDvrLiveBase } from './live-base.js';

class AgentDvrOverview extends AgentDvrLiveBase {
	_target(s) {
		const instance = instanceOf(s.instance);
		return { instance, camera: '', missing: instance ? null : TXT.pickInstance };
	}
}

defineWebComponent('iob-agent-dvr-overview', AgentDvrOverview);
