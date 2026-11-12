/* Web-Komponente <iob-agent-dvr-live>: die Live-Kachel einer Kamera von agent-dvr in Aura, vis-2, devices
   und admin. Der Schnappschuss erneuert sich im Browser, ein Klick öffnet den Live-Stream. */
import { defineWebComponent } from '@iobroker/web-components/element';
import { TXT, splitId } from './common.js';
import { AgentDvrLiveBase } from './live-base.js';

class AgentDvrLive extends AgentDvrLiveBase {
	_target(s) {
		const t = splitId(s.mode === 'custom' ? s.camera : s.widget);
		const missing = t.instance && t.camera ? null : s.mode === 'custom' ? TXT.pickCamera : TXT.pickWidget;
		return { ...t, missing };
	}

	_single() {
		return true;
	}
}

defineWebComponent('iob-agent-dvr-live', AgentDvrLive);
