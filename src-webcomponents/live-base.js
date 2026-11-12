/* Gemeinsame Basis der Live-Komponenten (eine Kamera / alle Kameras): Schnappschuss-Kacheln, die sich
   im Browser im eingestellten Intervall erneuern, und ein Klick öffnet den Live-Stream im Player. */
import { IobWebComponent } from '@iobroker/web-components/element';
import {
	SnapshotTimer,
	TXT,
	createPlayer,
	css,
	effectiveSettings,
	esc,
	labelsOf,
	liveTile,
	parseState,
} from './common.js';

/**
 * Base of the live components
 */
export class AgentDvrLiveBase extends IobWebComponent {
	/**
	 * Shadow root, player and snapshot timer
	 */
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
		this.shadowRoot.innerHTML = `<style></style><div class="root"></div>`;
		this._player = createPlayer(this.shadowRoot);
		this._timer = new SnapshotTimer(this.shadowRoot);
		this._key = '';
		this._cams = [];
		this._cfg = null;
	}

	/**
	 * @param {Record<string, any>} _s settings
	 * @returns {{instance: string, camera: string, missing: object}} what to show; camera "" = all cameras
	 */
	_target(_s) {
		return { instance: '', camera: '', missing: TXT.pickInstance };
	}

	/** @returns {boolean} a single camera filling the component */
	_single() {
		return false;
	}

	/**
	 * @param {Record<string, unknown>} s settings
	 * @returns {string[]} widget_config of the instance
	 */
	getStateIds(s) {
		const t = this._target(s);
		return t.instance ? [`${t.instance}.widget_config`] : [];
	}

	/**
	 * Draws the tiles
	 */
	render() {
		const s = this.settings || {};
		const t = this._target(s);
		const root = this.shadowRoot.querySelector('.root');
		const config = t.instance ? parseState(this.states[`${t.instance}.widget_config`]) : null;
		const c = effectiveSettings(s, config);
		const style = this.shadowRoot.querySelector('style');
		const styleText = css(c || {}, !!s.follow, this.editMode);
		if (style.textContent !== styleText) {
			style.textContent = styleText;
		}
		if (t.missing) {
			return this._msg(root, this.text(t.missing));
		}
		if (!c || !config || !Array.isArray(config.cameras)) {
			return this._msg(root, this.text(TXT.waiting));
		}
		const cams = t.camera ? config.cameras.filter(cam => cam.id === t.camera) : config.cameras;
		const key = JSON.stringify([c, cams, config.labels, this.systemLang]);
		this._timer.set(c.liveRefreshSec);
		if (key === this._key) {
			return;
		}
		this._key = key;
		this._cfg = c;
		this._cams = cams;
		if (!cams.length) {
			return this._msg(root, this.text(t.camera ? TXT.noCamera : TXT.noCameras));
		}
		const labels = labelsOf(config, this.systemLang);
		const tiles = cams.map(cam => liveTile(cam, c, labels)).join('');
		root.innerHTML = this._single() ? `<div class="single">${tiles}</div>` : `<div class="grid">${tiles}</div>`;
		if (this._single()) {
			// die Kachel füllt die Fläche, das Seitenverhältnis gilt dann nur für den Player
			const img = root.querySelector('.img');
			img && img.removeAttribute('style');
			img && img.classList.remove('fix');
		}
		for (const cell of root.querySelectorAll('.cell')) {
			cell.addEventListener('click', () => this._open(cell.getAttribute('data-cam')));
		}
	}

	/**
	 * @param {HTMLElement} root container
	 * @param {string} text message
	 */
	_msg(root, text) {
		this._key = '';
		this._timer.stop();
		root.innerHTML = `<div class="msg">${esc(text)}</div>`;
	}

	/**
	 * @param {string} id folder of the camera
	 */
	_open(id) {
		const cam = this._cams.find(x => x.id === id);
		if (!cam || this.editMode) {
			return;
		}
		this._player.open(cam.live, `${esc(cam.name)} &middot; Live`, cam.aspect || this._cfg.liveAspect || '');
	}

	/**
	 * Back in the document: draw again (restarts the timer)
	 */
	connectedCallback() {
		super.connectedCallback && super.connectedCallback();
		// Timer nach dem Wiedereinhängen neu starten
		this._key = '';
	}

	/**
	 * Out of the document: stop the timer, close the player
	 */
	disconnectedCallback() {
		super.disconnectedCallback && super.disconnectedCallback();
		this._timer.stop();
		this._player.el.open && this._player.el.close();
	}
}
