/* global document, window */
/* Gemeinsamer Code der Web-Komponenten von agent-dvr (Aufnahmen, Live-Kachel, Live-Übersicht).
   Die Komponenten zeichnen selbst im Browser - kein HTML-Datenpunkt, kein iframe. Ihre Daten:
   - <instanz>.widget_config: Widget-Einstellungen der Instanz, Kameras (Name, Seitenverhältnis,
     Schnappschuss- und Live-Link) und die Texte in der Systemsprache
   - <instanz>.<kamera>.widget_data: die Aufnahmen der Kamera
   Die Links sind dieselben AgentDVR-Links, die auch die HTML-Widgets in die Seite schreiben. */

/** Die Standardwerte der Widget-Einstellungen, wie in io-package.json (native) */
export const DEFAULTS = {
	widgetMode: 'nojs',
	count: 50,
	thumbSize: 'medium',
	minCol: 150,
	maxModalWidth: 900,
	showTags: true,
	tagPosition: 'bottom-left',
	sortNewest: true,
	showSearch: true,
	defaultTag: '',
	compact: false,
	playerUrl: '',
	liveAspect: '',
	liveRefreshSec: 0,
	colorCardBg: 'rgba(127,127,127,0.15)',
	colorTagBg: 'rgba(0,0,0,0.55)',
	colorTagText: '#ffffff',
	colorAccent: '#8ab4f8',
	colorModalBg: '#1c1c1e',
	borderRadius: 8,
};

const THUMB = { small: 120, medium: 180, large: 240 };

export const TXT = {
	pickWidget: {
		en: 'Please choose a widget in the settings.',
		de: 'Bitte in den Einstellungen ein Widget auswählen.',
	},
	pickCamera: {
		en: 'Please choose a camera in the settings.',
		de: 'Bitte in den Einstellungen eine Kamera auswählen.',
	},
	pickInstance: {
		en: 'Please choose an agent-dvr instance in the settings.',
		de: 'Bitte in den Einstellungen eine agent-dvr-Instanz auswählen.',
	},
	waiting: {
		en: 'Waiting for data of the adapter …',
		de: 'Warte auf Daten des Adapters …',
	},
	noCamera: {
		en: 'Camera not found',
		de: 'Kamera nicht gefunden',
	},
	noCameras: {
		en: 'No cameras',
		de: 'Keine Kameras',
	},
};

const LABELS = {
	en: { noRecordings: 'No recordings', search: 'Search …', all: 'All', download: 'Download', live: 'LIVE' },
	de: { noRecordings: 'Keine Aufnahmen', search: 'Suche …', all: 'Alle', download: 'Herunterladen', live: 'LIVE' },
};

/**
 * HTML escaping
 *
 * @param {unknown} s text
 * @returns {string} escaped
 */
export function esc(s) {
	return String(s == null ? '' : s).replace(
		/[&<>"]/g,
		c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
	);
}

/**
 * "agent-dvr.0.cam_8_Reolink.widget_live" -> { instance: "agent-dvr.0", camera: "cam_8_Reolink" }
 *
 * @param {string} id an object ID below the instance
 * @returns {{instance: string, camera: string}} parts
 */
export function splitId(id) {
	const p = String(id || '')
		.replace(/^system\.adapter\./, '')
		.split('.');
	return {
		instance: p.length >= 2 ? `${p[0]}.${p[1]}` : '',
		camera: p.length >= 3 && /^cam_/.test(p[2]) ? p[2] : '',
	};
}

/**
 * The instance of an instance field: "agent-dvr.0", "system.adapter.agent-dvr.0" or "0"
 *
 * @param {string} v value of the field
 * @returns {string} "agent-dvr.0" or ""
 */
export function instanceOf(v) {
	const s = String(v || '').replace(/^system\.adapter\./, '');
	if (/^\d+$/.test(s)) {
		return `agent-dvr.${s}`;
	}
	return /^[^.]+\.\d+$/.test(s) ? s : '';
}

/**
 * Parses a JSON state
 *
 * @param {{val?: unknown} | null | undefined} state the state
 * @returns {any} the object or null
 */
export function parseState(state) {
	const v = state && state.val;
	if (typeof v !== 'string' || !v) {
		return null;
	}
	try {
		return JSON.parse(v);
	} catch {
		return null;
	}
}

/**
 * The settings the widget uses: those of the instance (mode "adapter") or its own (mode "custom")
 *
 * @param {Record<string, any>} s settings of the component
 * @param {any} config widget_config of the instance
 * @returns {Record<string, any> | null} the settings, null while the instance has not sent them yet
 */
export function effectiveSettings(s, config) {
	if (s.mode === 'custom') {
		const own = { ...DEFAULTS };
		for (const [k, v] of Object.entries(s)) {
			if (v !== undefined && v !== null) {
				own[k] = v;
			}
		}
		// Thumbnail-Größe überschreibt die Spaltenbreite - wie im Adapter (effectiveMinCol)
		own.minCol = THUMB[own.thumbSize] || Number(own.minCol) || 150;
		return own;
	}
	if (!config || !config.settings) {
		return null;
	}
	return { ...DEFAULTS, ...config.settings };
}

/**
 * The texts of the widgets: from the instance (system language), else built in
 *
 * @param {any} config widget_config
 * @param {string} lang language of the system
 * @returns {Record<string, string>} labels
 */
export function labelsOf(config, lang) {
	return { ...(LABELS[lang] || LABELS.en), ...((config && config.labels) || {}) };
}

/**
 * The CSS of the widgets - the same look as the HTML widgets of the adapter
 *
 * @param {Record<string, any>} c effective settings
 * @param {boolean} follow take the colors of the visualization
 * @param {boolean} editMode no clicks while the host edits the page
 * @returns {string} CSS
 */
export function css(c, follow, editMode) {
	const gap = c.compact ? 6 : 12;
	const radius = `${Math.max(0, Number(c.borderRadius) || 0)}px`;
	const v = follow
		? {
				card: 'color-mix(in srgb, var(--iob-text, currentColor) 10%, transparent)',
				tagBg: 'var(--iob-primary)',
				tagText: 'var(--iob-primary-contrast)',
				accent: 'var(--iob-primary)',
				modal: 'var(--iob-paper)',
				info: 'var(--iob-text)',
			}
		: {
				card: c.colorCardBg || DEFAULTS.colorCardBg,
				tagBg: c.colorTagBg || DEFAULTS.colorTagBg,
				tagText: c.colorTagText || DEFAULTS.colorTagText,
				accent: c.colorAccent || DEFAULTS.colorAccent,
				modal: c.colorModalBg || DEFAULTS.colorModalBg,
				info: '#fff',
			};
	return (
		`:host{display:block;width:100%;height:100%;overflow:hidden;color:inherit;font:inherit}` +
		`.root{--adv-card-bg:${v.card};--adv-tag-bg:${v.tagBg};--adv-tag-color:${v.tagText};--adv-accent:${v.accent};` +
		`--adv-radius:${radius};width:100%;height:100%;box-sizing:border-box;overflow:auto;` +
		`${editMode ? 'pointer-events:none;' : ''}}` +
		`.bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:10px}` +
		`.search{flex:1 1 160px;min-width:120px;padding:6px 10px;border-radius:8px;border:1px solid rgba(127,127,127,.4);background:rgba(127,127,127,.08);color:inherit;font:inherit}` +
		`.tags{display:flex;flex-wrap:wrap;gap:6px}` +
		`.tagbtn{padding:4px 10px;border-radius:999px;border:1px solid rgba(127,127,127,.4);background:transparent;color:inherit;cursor:pointer;font:inherit;font-size:.8rem}` +
		`.tagbtn.on{background:var(--adv-accent);color:${follow ? 'var(--iob-primary-contrast)' : '#fff'};border-color:var(--adv-accent)}` +
		`.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(${Number(c.minCol) || 150}px,1fr));gap:${gap}px}` +
		`.cell{display:flex;flex-direction:column;cursor:pointer;min-width:0}` +
		`.img{position:relative;display:block;border-radius:var(--adv-radius);overflow:hidden;background:var(--adv-card-bg)}` +
		`.img img{width:100%;height:auto;display:block}` +
		`.img.fix img{height:100%;object-fit:cover}` +
		`.tag{position:absolute;background:var(--adv-tag-bg);color:var(--adv-tag-color);font-size:.6rem;padding:2px 4px;border-radius:3px;line-height:1;max-width:85%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}` +
		`.play{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .15s;background:rgba(0,0,0,.2)}` +
		`.play::before{content:"";border-style:solid;border-width:11px 0 11px 18px;border-color:transparent transparent transparent #fff;filter:drop-shadow(0 1px 2px rgba(0,0,0,.6))}` +
		`.cell:hover .play{opacity:1}` +
		`.cap{font-size:${c.compact ? '.65rem' : '.72rem'};margin-top:${c.compact ? 2 : 4}px;line-height:1.25;opacity:.85;overflow:hidden;text-overflow:ellipsis}` +
		`.empty,.msg{padding:24px;text-align:center;opacity:.7}` +
		// eine einzelne Live-Kachel füllt die Fläche der Komponente
		`.single{height:100%;display:flex;flex-direction:column}` +
		`.single .cell{flex:1 1 auto;min-height:0}` +
		`.single .img{flex:1 1 auto;min-height:0}` +
		`.single .img img{width:100%;height:100%;object-fit:contain}` +
		// Player: <dialog> liegt in der obersten Ebene, kein Rahmen der Visualisierung schneidet ihn ab
		`dialog{border:0;padding:12px;border-radius:14px;background:${v.modal};max-width:min(92vw,${Number(c.maxModalWidth) || 900}px);width:min(92vw,${Number(c.maxModalWidth) || 900}px);box-sizing:border-box;box-shadow:0 16px 48px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.08);overflow:visible}` +
		`dialog::backdrop{background:rgba(0,0,0,.35)}` +
		`.box{position:relative;display:flex;flex-direction:column;gap:8px}` +
		`video{width:100%;max-height:80vh;border-radius:8px;background:#000;display:block;object-fit:contain}` +
		`.close{position:absolute;top:6px;right:6px;width:32px;height:32px;border-radius:50%;background:rgba(0,0,0,.65);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:15px;z-index:2;border:2px solid rgba(255,255,255,.35)}` +
		`.info{color:${v.info};font-size:.8rem;text-align:center}` +
		`.info a{color:var(--adv-accent)}`
	);
}

/**
 * The player dialog of a component: one <dialog> in its shadow root
 *
 * @param {ShadowRoot} root shadow root of the component
 * @returns {{open: (src: string, infoHtml: string, aspect?: string) => void, el: HTMLDialogElement}} the player
 */
export function createPlayer(root) {
	const dlg = document.createElement('dialog');
	dlg.innerHTML =
		`<div class="box"><span class="close" role="button" aria-label="close">&#10005;</span>` +
		`<video controls preload="none" playsinline></video><div class="info"></div></div>`;
	const video = dlg.querySelector('video');
	const info = dlg.querySelector('.info');
	const close = () => dlg.open && dlg.close();
	dlg.querySelector('.close').addEventListener('click', close);
	// Klick neben den Player (auf den Hintergrund) schließt ihn
	dlg.addEventListener('click', e => e.target === dlg && close());
	dlg.addEventListener('close', () => {
		try {
			video.pause();
		} catch {
			/* ignore */
		}
		video.removeAttribute('src');
		video.removeAttribute('style');
		try {
			video.load();
		} catch {
			/* ignore */
		}
	});
	root.appendChild(dlg);
	return {
		el: dlg,
		open(src, infoHtml, aspect) {
			if (aspect) {
				// AgentDVR staucht das Live-Bild in ein festes Format - fill hebt das auf (wie im HTML-Widget)
				video.style.aspectRatio = aspect.replace('/', ' / ');
				video.style.objectFit = 'fill';
			}
			video.setAttribute('src', src);
			info.innerHTML = infoHtml;
			if (!dlg.open) {
				dlg.showModal();
			}
			video.play && video.play().catch(() => undefined);
		},
	};
}

/**
 * Opens an external player like the HTML widgets do
 *
 * @param {string} url template with {video}, {videoRaw}, {fn}, {date}, {time}, {duration}, {size}, {tags}
 * @param {any} it the recording
 */
export function openExternal(url, it) {
	const e = encodeURIComponent;
	const u = url
		.replace(/{video}/g, e(it.video))
		.replace(/{videoRaw}/g, it.video)
		.replace(/{fn}/g, e(it.fn || ''))
		.replace(/{date}/g, e(it.date))
		.replace(/{time}/g, e(it.time))
		.replace(/{duration}/g, e(it.dur))
		.replace(/{size}/g, e(String(it.size)))
		.replace(/{tags}/g, e(it.tag || ''));
	window.open(u, '_blank', 'noopener');
}

/**
 * HTML of a live tile (snapshot with LIVE badge and the name)
 *
 * @param {any} cam camera from widget_config
 * @param {Record<string, any>} c effective settings
 * @param {Record<string, string>} labels texts
 * @returns {string} HTML
 */
export function liveTile(cam, c, labels) {
	const ar = cam.aspect || c.liveAspect || '';
	const arCss = ar ? String(ar).replace('/', ' / ') : '';
	return (
		`<div class="cell" data-cam="${esc(cam.id)}"><span class="img${arCss ? ' fix' : ''}"${
			arCss ? ` style="aspect-ratio:${esc(arCss)}"` : ''
		}><img class="snap" alt="" src="${esc(`${cam.snapshot}&ts=${Date.now()}`)}" data-base="${esc(cam.snapshot)}">` +
		`<span class="tag" style="top:5px;left:5px">&#9679; ${esc(labels.live)}</span><span class="play"></span></span>` +
		`<span class="cap">${esc(cam.name)}</span></div>`
	);
}

/**
 * Snapshot refresh of the live tiles: only the image, so an open player stays open
 */
export class SnapshotTimer {
	/**
	 * @param {ShadowRoot} root shadow root with the tiles
	 */
	constructor(root) {
		this.root = root;
		this.timer = null;
		this.sec = 0;
	}

	/**
	 * @param {number} sec interval in s, 0 = off
	 */
	set(sec) {
		sec = Math.max(0, Number(sec) || 0);
		if (sec === this.sec && (this.timer || !sec)) {
			return;
		}
		this.stop();
		this.sec = sec;
		if (sec > 0) {
			this.timer = setInterval(() => {
				for (const img of this.root.querySelectorAll('img.snap')) {
					const base = img.getAttribute('data-base');
					if (base) {
						img.src = `${base}&ts=${Date.now()}`;
					}
				}
			}, sec * 1000);
		}
	}

	/**
	 * Stops the refresh
	 */
	stop() {
		clearInterval(this.timer);
		this.timer = null;
		this.sec = 0;
	}
}
