/* Web-Komponente <iob-agent-dvr-recordings>: die Aufnahmen-Galerie einer Kamera von agent-dvr in Aura,
   vis-2, devices und admin - mit den Widget-Einstellungen der Instanz oder eigenen Einstellungen.
   Gezeichnet im Browser aus <kamera>.widget_data und <instanz>.widget_config. */
import { IobWebComponent, defineWebComponent } from '@iobroker/web-components/element';
import {
	TXT,
	createPlayer,
	css,
	effectiveSettings,
	esc,
	labelsOf,
	openExternal,
	parseState,
	splitId,
} from './common.js';

class AgentDvrRecordings extends IobWebComponent {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
		this.shadowRoot.innerHTML = `<style></style><div class="root"></div>`;
		this._player = createPlayer(this.shadowRoot);
		this._view = { q: '', tag: null };
		this._key = '';
		this._items = [];
		this._cfg = null;
		this._labels = {};
	}

	_target(s) {
		return splitId(s.mode === 'custom' ? s.camera : s.widget);
	}

	getStateIds(s) {
		const t = this._target(s);
		return t.instance && t.camera ? [`${t.instance}.widget_config`, `${t.instance}.${t.camera}.widget_data`] : [];
	}

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
		if (!t.instance || !t.camera) {
			this._key = '';
			return this._msg(root, this.text(s.mode === 'custom' ? TXT.pickCamera : TXT.pickWidget));
		}
		const data = parseState(this.states[`${t.instance}.${t.camera}.widget_data`]);
		if (!c || !data) {
			this._key = '';
			return this._msg(root, this.text(TXT.waiting));
		}
		const key = JSON.stringify([c, this.states[`${t.instance}.${t.camera}.widget_data`]?.ts, this.systemLang]);
		if (key === this._key) {
			return;
		}
		const settingsChanged = !this._cfg || JSON.stringify(this._cfg) !== JSON.stringify(c);
		this._key = key;
		this._cfg = c;
		this._labels = labelsOf(config, this.systemLang);
		// wie im Adapter: die neuesten N Aufnahmen, auf Wunsch die älteste zuerst
		let items = (Array.isArray(data.recordings) ? data.recordings : []).slice(
			0,
			Math.max(1, Number(c.count) || 50),
		);
		if (c.sortNewest === false) {
			items = items.reverse();
		}
		this._items = items;
		if (settingsChanged) {
			this._view = { q: '', tag: null };
		}
		this._draw(root);
	}

	_msg(root, text) {
		root.innerHTML = `<div class="msg">${esc(text)}</div>`;
	}

	_draw(root) {
		const c = this._cfg;
		const L = this._labels;
		const js = c.widgetMode === 'js';
		let bar = '';
		if (js) {
			if (this._view.tag === null) {
				this._view.tag = String(c.defaultTag || '').trim();
			}
			const tags = new Set();
			for (const it of this._items) {
				String(it.tag || '')
					.split(/[,\s]+/)
					.forEach(x => x && tags.add(x));
			}
			const btn = (label, val) =>
				`<button class="tagbtn${this._view.tag === val ? ' on' : ''}" data-tag="${esc(val)}">${esc(label)}</button>`;
			const tagBtns = c.showTags && tags.size ? btn(L.all, '') + [...tags].map(x => btn(x, x)).join('') : '';
			const search =
				c.showSearch !== false
					? `<input class="search" type="text" placeholder="${esc(L.search)}" value="${esc(this._view.q)}">`
					: '';
			if (search || tagBtns) {
				bar = `<div class="bar">${search}<div class="tags">${tagBtns}</div></div>`;
			}
		}
		root.innerHTML = `${bar}<div class="grid"></div>`;
		const input = root.querySelector('.search');
		if (input) {
			input.addEventListener('input', () => {
				this._view.q = input.value;
				this._drawGrid(root);
			});
		}
		for (const b of root.querySelectorAll('.tagbtn')) {
			b.addEventListener('click', () => {
				const val = b.getAttribute('data-tag') || '';
				this._view.tag = this._view.tag === val ? '' : val;
				for (const o of root.querySelectorAll('.tagbtn')) {
					o.classList.toggle('on', (o.getAttribute('data-tag') || '') === this._view.tag);
				}
				this._drawGrid(root);
			});
		}
		this._drawGrid(root);
	}

	_drawGrid(root) {
		const c = this._cfg;
		const L = this._labels;
		const js = c.widgetMode === 'js';
		const q = js ? this._view.q.toLowerCase() : '';
		const tag = js ? String(this._view.tag || '').toLowerCase() : '';
		const pos = String(c.tagPosition || 'bottom-left').split('-');
		let html = '';
		this._items.forEach((it, i) => {
			if (
				tag &&
				String(it.tag || '')
					.toLowerCase()
					.indexOf(tag) < 0
			) {
				return;
			}
			if (q && `${it.date || ''} ${it.time || ''} ${it.tag || ''}`.toLowerCase().indexOf(q) < 0) {
				return;
			}
			const badge =
				c.showTags && it.tag
					? `<span class="tag" style="${pos[0]}:5px;${pos[1]}:5px">${esc(it.tag)}</span>`
					: '';
			html +=
				`<div class="cell" data-i="${i}"><span class="img"><img loading="lazy" alt="" src="${esc(it.thumb)}">${badge}` +
				`<span class="play"></span></span><span class="cap">${esc(it.date)} ${esc(it.time)}<br>${esc(it.dur)}s &middot; ${esc(
					it.size,
				)} MB</span></div>`;
		});
		const grid = root.querySelector('.grid');
		if (!html) {
			grid.outerHTML = `<div class="grid"></div><div class="empty">${esc(L.noRecordings)}</div>`;
			return;
		}
		const empty = root.querySelector('.empty');
		empty && empty.remove();
		grid.innerHTML = html;
		for (const cell of grid.querySelectorAll('.cell')) {
			cell.addEventListener('click', () => this._open(this._items[Number(cell.getAttribute('data-i'))]));
		}
	}

	_open(it) {
		if (!it || this.editMode) {
			return;
		}
		const c = this._cfg;
		if (c.playerUrl) {
			return openExternal(String(c.playerUrl), it);
		}
		const info =
			`${esc(it.date)} ${esc(it.time)}${it.dur ? ` &middot; ${esc(it.dur)}s` : ''}` +
			`${it.size != null ? ` &middot; ${esc(it.size)} MB` : ''}${it.tag ? ` &middot; ${esc(it.tag)}` : ''}` +
			` &middot; <a href="${esc(it.video)}" download target="_blank" rel="noopener">${esc(this._labels.download)}</a>`;
		this._player.open(it.video, info);
	}

	disconnectedCallback() {
		super.disconnectedCallback && super.disconnectedCallback();
		this._player.el.open && this._player.el.close();
	}
}

defineWebComponent('iob-agent-dvr-recordings', AgentDvrRecordings);
