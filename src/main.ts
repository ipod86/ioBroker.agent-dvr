import * as utils from '@iobroker/adapter-core';
import * as http from 'http';

// =====================================================================
//  Agent DVR -> ioBroker Adapter
//  API reference: https://ispysoftware.github.io/Agent_API/ (v7.5)
// =====================================================================

// ---- Types ----

interface ApiResult {
	ok: boolean;
	data?: string;
	error?: string;
}

interface AgentDvrEvent {
	fn?: string;
	tg?: string;
	c?: number;
	d?: number | string;
	sb?: number;
	[key: string]: unknown;
}

interface Device {
	oid: number | string;
	ot: number;
	name: string;
	raw: Record<string, unknown>;
}

type RegistryKind = 'cam' | 'sys' | 'ptz' | 'ptzHold' | 'push';

interface RegistryEntry {
	kind: RegistryKind;
	path?: string | null;
	params?: string[];
	oid?: number | string;
	ot?: number;
	dir?: number;
	fid?: string;
}

// ---- Commands ----

const CAM_COMMANDS = [
	{ id: 'record', path: '/command/record', params: ['oid', 'ot'], name: 'Start recording' },
	{ id: 'recordStop', path: '/command/recordStop', params: ['oid', 'ot'], name: 'Stop recording' },
	{ id: 'recordRestart', path: '/command/recordRestart', params: ['oid', 'ot'], name: 'Restart recording' },
	{ id: 'triggerRecord', path: '/command/triggerRecord', params: ['oid', 'ot'], name: 'Trigger recording (timeout)' },
	{ id: 'snapshot', path: '/command/snapshot', params: ['oid'], name: 'Take snapshot' },
	{ id: 'detect', path: '/command/detect', params: ['oid', 'ot'], name: 'Trigger motion detection' },
	{ id: 'alertOn', path: '/command/alertOn', params: ['oid', 'ot'], name: 'Arm alerts' },
	{ id: 'alertOff', path: '/command/alertOff', params: ['oid', 'ot'], name: 'Disarm alerts' },
	{ id: 'switchOn', path: '/command/switchOn', params: ['oid', 'ot'], name: 'Switch device on' },
	{ id: 'switchOff', path: '/command/switchOff', params: ['oid', 'ot'], name: 'Switch device off' },
	{ id: 'objectDetectOn', path: '/command/objectdetecton', params: ['oid', 'ot'], name: 'Enable object detection' },
	{
		id: 'objectDetectOff',
		path: '/command/objectdetectoff',
		params: ['oid', 'ot'],
		name: 'Disable object detection',
	},
	{ id: 'recOnAlert', path: '/command/recordOnAlertOn', params: ['oid', 'ot'], name: 'Record on alert: on' },
	{ id: 'recOnDetect', path: '/command/recordOnDetectOn', params: ['oid', 'ot'], name: 'Record on detect: on' },
	{ id: 'purge', path: '/command/purge', params: ['oid', 'ot'], name: 'Purge folder (caution!)' },
] as const;

const SYS_COMMANDS = [
	{ id: 'arm', path: '/command/arm', name: 'Arm system' },
	{ id: 'disarm', path: '/command/disarm', name: 'Disarm system' },
	{ id: 'allOn', path: '/command/allOn', name: 'All devices on' },
	{ id: 'allOff', path: '/command/allOff', name: 'All devices off' },
	{ id: 'reloadConfig', path: '/command/reloadConfig', name: 'Reload config' },
	{ id: 'reloadObjects', path: '/command/reloadObjects', name: 'Reload objects' },
	{ id: 'runStorageMgmt', path: '/command/runStorageMgmt', name: 'Run storage management' },
	{ id: 'blockExternal', path: '/command/blockExternal', name: 'Block external access' },
	{ id: 'unblockExternal', path: '/command/unblockExternal', name: 'Unblock external access' },
	{ id: 'restart', path: '/command/restart', name: 'Restart Agent DVR' },
	{ id: 'refresh', path: null, name: 'Refresh data now' },
] as const;

const PTZ_DIRS = [
	{ id: 'left', dir: 1, hold: true },
	{ id: 'upLeft', dir: 2, hold: true },
	{ id: 'up', dir: 3, hold: true },
	{ id: 'upRight', dir: 4, hold: true },
	{ id: 'right', dir: 5, hold: true },
	{ id: 'downRight', dir: 6, hold: true },
	{ id: 'down', dir: 7, hold: true },
	{ id: 'downLeft', dir: 8, hold: true },
	{ id: 'zoomIn', dir: 9, hold: true },
	{ id: 'zoomOut', dir: 10, hold: true },
	{ id: 'stop', dir: 11, hold: false },
	{ id: 'center', dir: 0, hold: false },
] as const;

const SKIP_KEYS = ['icons', 'image', 'thumbnail', 'base64'];

// ---- Module-level helpers ----

function sanitize(s: unknown): string {
	return (
		String(s)
			.replace(/[\s.[\]*?"'`,;:/\\]+/g, '_')
			.replace(/[^A-Za-z0-9_-]/g, '_')
			.replace(/_+/g, '_')
			.replace(/^_+|_+$/g, '') || 'x'
	);
}

function asJson(data: unknown): Record<string, unknown> | null {
	if (data == null) {
		return null;
	}
	if (typeof data === 'object') {
		return data as Record<string, unknown>;
	}
	if (typeof data === 'string') {
		try {
			return JSON.parse(data) as Record<string, unknown>;
		} catch {
			return null;
		}
	}
	return null;
}

function toStr(v: unknown): string {
	if (v == null) {
		return '';
	}
	if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
		return String(v);
	}
	return Object.prototype.toString.call(v);
}

function escHtml(s: unknown): string {
	return toStr(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function parseSizeGb(s: unknown): number | null {
	if (s == null) {
		return null;
	}
	const m = toStr(s)
		.trim()
		.match(/([\d.,]+)\s*([KMGT]?B)?/i);
	if (!m) {
		return null;
	}
	let v = parseFloat(m[1].replace(',', '.'));
	if (isNaN(v)) {
		return null;
	}
	const u = (m[2] || 'GB').toUpperCase();
	if (u === 'TB') {
		v *= 1024;
	} else if (u === 'MB') {
		v /= 1024;
	} else if (u === 'KB') {
		v /= 1048576;
	} else if (u === 'B') {
		v /= 1073741824;
	}
	return Math.round(v * 100) / 100;
}

function findWH(obj: unknown, depth: number): [number, number] | null {
	if (!obj || typeof obj !== 'object' || depth > 5) {
		return null;
	}
	const o = obj as Record<string, unknown>;
	for (const [kw, kh] of [
		['width', 'height'],
		['w', 'h'],
		['sourceWidth', 'sourceHeight'],
		['videoWidth', 'videoHeight'],
		['imageWidth', 'imageHeight'],
	]) {
		const w = o[kw],
			h = o[kh];
		if (typeof w === 'number' && typeof h === 'number' && w >= 100 && h >= 100 && w <= 12000 && h <= 12000) {
			const r = w / h;
			if (r >= 0.3 && r <= 4) {
				return [w, h];
			}
		}
	}
	for (const k of Object.keys(o)) {
		const g = findWH(o[k], depth + 1);
		if (g) {
			return g;
		}
	}
	return null;
}

function detectOt(elem: Record<string, unknown>): number {
	const v = elem.typeID ?? elem.ot ?? elem.objectTypeID ?? elem.type;
	return v === 1 || v === 2 ? v : 2;
}

function findDevices(json: Record<string, unknown>): Device[] {
	const list = Array.isArray(json.objectList) ? json.objectList : [];
	const out: Device[] = [];
	for (const e of list) {
		if (!e || typeof e !== 'object') {
			continue;
		}
		const el = e as Record<string, unknown>;
		const rawId = el.id ?? el.oid;
		if (rawId === undefined || rawId === null) {
			continue;
		}
		const id = rawId as number | string;
		const name = typeof el.name === 'string' ? el.name : `obj_${id}`;
		out.push({ oid: id, ot: detectOt(el), name, raw: el });
	}
	return out;
}

// ---- HTML/CSS gallery helpers ----

function galleryCss(minCol: number, maxW: number): string {
	return (
		`.advgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(${minCol}px,1fr));gap:12px;max-width:100%}` +
		`.advgrid .advlb{display:none}` +
		`.advcell{display:flex;flex-direction:column;cursor:pointer;text-decoration:none;color:inherit;font-family:inherit}` +
		`.advimg{position:relative;display:block;border-radius:8px;overflow:hidden;background:rgba(127,127,127,.15)}` +
		`.advimg img{width:100%;height:auto;display:block}` +
		`.advimgfix img{height:100%;object-fit:cover}` +
		`.advtag{position:absolute;background:rgba(0,0,0,.55);color:#fff;font-size:.6rem;padding:2px 4px;border-radius:3px;line-height:1;max-width:85%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}` +
		`.advplay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .15s;background:rgba(0,0,0,.2)}` +
		`.advplay::before{content:"";border-style:solid;border-width:11px 0 11px 18px;border-color:transparent transparent transparent #fff;filter:drop-shadow(0 1px 2px rgba(0,0,0,.6))}` +
		`.advcell:hover .advplay{opacity:1}` +
		`.advcap{font-size:.72rem;margin-top:4px;line-height:1.25;opacity:.85}` +
		`.advmodal{display:none;position:fixed;inset:0;z-index:99999;align-items:center;justify-content:center}` +
		`.advgrid .advlb:checked + .advthumb + .advmodal{display:flex}` +
		`.advbackdrop{position:absolute;inset:0;background:transparent;cursor:pointer}` +
		`.advbox{position:relative;z-index:1;display:flex;flex-direction:column;gap:8px;max-width:min(92vw,${maxW}px);background:#1c1c1e;padding:12px;border-radius:14px;box-shadow:0 16px 48px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.08)}` +
		`.advvideo{width:100%;max-height:80vh;border-radius:8px;background:#000;display:block}` +
		`.advclose{position:absolute;top:18px;right:18px;width:32px;height:32px;border-radius:50%;background:rgba(0,0,0,.65);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:15px;z-index:2;border:2px solid rgba(255,255,255,.35)}` +
		`.advinfo{color:#fff;font-size:.8rem;text-align:center}` +
		`.advinfo a{color:#8ab4f8}` +
		`.advempty{padding:24px;text-align:center;opacity:.7;font-family:inherit}`
	);
}

function galleryCssJs(minCol: number): string {
	return (
		`.advroot{font-family:inherit;color:inherit}` +
		`.advbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:10px}` +
		`.advsearchjs{flex:1 1 160px;min-width:120px;padding:6px 10px;border-radius:8px;border:1px solid rgba(127,127,127,.4);background:rgba(127,127,127,.08);color:inherit;font:inherit}` +
		`.advtagsjs{display:flex;flex-wrap:wrap;gap:6px}` +
		`.advtagbtn{padding:4px 10px;border-radius:999px;border:1px solid rgba(127,127,127,.4);background:transparent;color:inherit;cursor:pointer;font:inherit;font-size:.8rem}` +
		`.advtagbtn.on{background:#2d6cdf;color:#fff;border-color:#2d6cdf}` +
		`.advgridjs{display:grid;grid-template-columns:repeat(auto-fill,minmax(${minCol}px,1fr));gap:12px}` +
		`.advcelljs{display:flex;flex-direction:column;cursor:pointer}` +
		`.advimgjs{position:relative;display:block;border-radius:8px;overflow:hidden;background:rgba(127,127,127,.15)}` +
		`.advimgjs img{width:100%;height:auto;display:block}` +
		`.advimgjs.advimgfix img{height:100%;object-fit:cover}` +
		`.advtagjs{position:absolute;background:rgba(0,0,0,.55);color:#fff;font-size:.6rem;padding:2px 4px;border-radius:3px;line-height:1;max-width:85%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}` +
		`.advplayjs{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .15s;background:rgba(0,0,0,.2)}` +
		`.advplayjs::before{content:"";border-style:solid;border-width:11px 0 11px 18px;border-color:transparent transparent transparent #fff;filter:drop-shadow(0 1px 2px rgba(0,0,0,.6))}` +
		`.advcelljs:hover .advplayjs{opacity:1}` +
		`.advcapjs{font-size:.72rem;margin-top:4px;line-height:1.25;opacity:.85}` +
		`.advemptyjs{padding:24px;text-align:center;opacity:.7}`
	);
}

// Client-side browser code for the JS widget variant.
// Stored as a string: TypeScript never type-checks browser code running in DOM context.
const ADV_CLIENT_CODE = `
(function(){
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
var MODAL_CSS='.advmodaljs{display:none;position:fixed;inset:0;z-index:99999;align-items:center;justify-content:center}.advbackdropjs{position:absolute;inset:0;background:transparent;cursor:pointer}.advboxjs{position:relative;z-index:1;display:flex;flex-direction:column;gap:8px;max-width:min(92vw,900px);background:#1c1c1e;padding:12px;border-radius:14px;box-shadow:0 16px 48px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.08)}.advvideojs{width:100%;max-height:80vh;border-radius:8px;background:#000;display:block}.advclosejs{position:absolute;top:18px;right:18px;width:32px;height:32px;border-radius:50%;background:rgba(0,0,0,.65);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:15px;z-index:2;border:2px solid rgba(255,255,255,.35)}.advinfojs{color:#fff;font-size:.8rem;text-align:center}';
var modalEl=null,modalVideo=null,modalInfo=null,modalBox=null;
function getModal(){
  if(modalEl&&document.body.contains(modalEl))return modalEl;
  if(!document.getElementById('advmodalcss')){var st=document.createElement('style');st.id='advmodalcss';st.textContent=MODAL_CSS;document.head.appendChild(st);}
  modalEl=document.createElement('div');modalEl.className='advmodaljs';
  var bd=document.createElement('div');bd.className='advbackdropjs';
  modalBox=document.createElement('div');modalBox.className='advboxjs';
  var cl=document.createElement('span');cl.className='advclosejs';cl.textContent='✕';
  modalVideo=document.createElement('video');modalVideo.className='advvideojs';
  modalVideo.setAttribute('controls','');modalVideo.setAttribute('preload','none');modalVideo.setAttribute('playsinline','');
  modalInfo=document.createElement('div');modalInfo.className='advinfojs';
  modalBox.appendChild(cl);modalBox.appendChild(modalVideo);modalBox.appendChild(modalInfo);
  modalEl.appendChild(bd);modalEl.appendChild(modalBox);
  document.body.appendChild(modalEl);
  bd.addEventListener('click',closeModal);cl.addEventListener('click',closeModal);
  return modalEl;
}
function openSrc(src,label,maxW){
  var m=getModal();
  if(maxW)modalBox.style.maxWidth='min(92vw,'+maxW+'px)';
  modalVideo.setAttribute('src',src);modalInfo.textContent=label;m.style.display='flex';
}
function closeModal(){
  if(!modalEl)return;
  try{modalVideo.pause();}catch(e){}
  modalVideo.removeAttribute('src');try{modalVideo.load();}catch(e){}
  modalEl.style.display='none';
}
document.addEventListener('keydown',function(e){if(e.key==='Escape'||e.keyCode===27)closeModal();});
function initRoot(root){
  var dataEl=root.querySelector('script.advdata');
  if(!dataEl)return;
  var D;try{D=JSON.parse(dataEl.textContent);}catch(e){return;}
  var cfg=D.cfg||{},items=D.items||[],live=D.live||null;
  var grid=root.querySelector('.advgridjs'),search=root.querySelector('.advsearchjs'),tagsBox=root.querySelector('.advtagsjs');
  var state={q:'',tag:''};
  var tagset={};
  items.forEach(function(it){String(it.tag||'').split(/[,\\s]+/).forEach(function(t){if(t)tagset[t]=1;});});
  var tags=Object.keys(tagset);
  if(cfg.show_tags&&tags.length){
    var mk=function(label,val){
      var b=document.createElement('button');b.className='advtagbtn';b.textContent=label;b.setAttribute('data-tag',val);
      b.addEventListener('click',function(){state.tag=state.tag===val?'':val;updateTagBtns();render();});
      tagsBox.appendChild(b);
    };
    mk('All','');tags.forEach(function(t){mk(t,t);});
  }
  function updateTagBtns(){var bs=tagsBox.querySelectorAll('.advtagbtn');for(var i=0;i<bs.length;i++)bs[i].classList.toggle('on',bs[i].getAttribute('data-tag')===state.tag);}
  updateTagBtns();
  if(search)search.addEventListener('input',function(){state.q=this.value.toLowerCase();render();});
  function badge(it){if(!(cfg.show_tags&&it.tag))return '';var pos=String(cfg.tag_position||'bottom-left').split('-');return '<span class="advtagjs" style="'+pos[0]+':5px;'+pos[1]+':5px">'+esc(it.tag)+'</span>';}
  function render(){
    var html='';
    if(live){var ar=cfg.live_aspect||'',arStyle=ar?' style="aspect-ratio:'+ar.replace('/',' / ')+'"':'',arCls=ar?' advimgfix':'';
      html+='<div class="advcelljs" data-live="1"><span class="advimgjs'+arCls+'"'+arStyle+'><img loading="lazy" src="'+esc(live.thumb)+'"><span class="advtagjs" style="top:5px;left:5px">&#9679; LIVE</span><span class="advplayjs"></span></span><span class="advcapjs">'+esc(live.name)+'</span></div>';}
    items.forEach(function(it,i){
      if(state.tag&&String(it.tag||'').toLowerCase().indexOf(state.tag.toLowerCase())<0)return;
      if(state.q){var hay=((it.date||'')+' '+(it.time||'')+' '+(it.tag||'')).toLowerCase();if(hay.indexOf(state.q)<0)return;}
      html+='<div class="advcelljs" data-i="'+i+'"><span class="advimgjs"><img loading="lazy" src="'+esc(it.thumb)+'">'+badge(it)+'<span class="advplayjs"></span></span><span class="advcapjs">'+esc(it.date)+' '+esc(it.time)+'<br>'+esc(it.dur)+'s &middot; '+esc(it.size)+' MB</span></div>';
    });
    grid.innerHTML=html||'<div class="advemptyjs">No recordings</div>';
    var cells=grid.querySelectorAll('.advcelljs');
    for(var k=0;k<cells.length;k++)(function(cell){
      cell.addEventListener('click',function(){
        if(cell.getAttribute('data-live')==='1'){openSrc(live.video,(live.name||'')+' · Live',cfg.max_modal_width);return;}
        var it=items[parseInt(cell.getAttribute('data-i'),10)],maxW=Number(cfg.max_modal_width)||900;
        if(cfg.player_url){var u=cfg.player_url.replace(/{video}/g,encodeURIComponent(it.video)).replace(/{videoRaw}/g,it.video).replace(/{fn}/g,encodeURIComponent(it.fn||'')).replace(/{date}/g,encodeURIComponent(it.date)).replace(/{time}/g,encodeURIComponent(it.time)).replace(/{duration}/g,encodeURIComponent(it.dur)).replace(/{size}/g,encodeURIComponent(it.size)).replace(/{tags}/g,encodeURIComponent(it.tag));window.open(u,'_blank');}
        else{openSrc(it.video,esc(it.date)+' '+esc(it.time)+(it.dur!=null?' · '+it.dur+'s':'')+(it.size!=null?' · '+it.size+' MB':'')+(it.tag?' · '+it.tag:''),maxW);}
      });
    })(cells[k]);
  }
  render();
}
function scan(){var roots=document.querySelectorAll('.advroot');for(var i=0;i<roots.length;i++)if(!roots[i].__adv){roots[i].__adv=1;initRoot(roots[i]);}}
window.ADVscan=scan;scan();
})();
`.trim();

// ---- Adapter class ----

class AgentDvr extends utils.Adapter {
	private pollTimer: ioBroker.Interval | undefined = undefined;
	private refreshTimer: ioBroker.Timeout | undefined = undefined;
	private authHeader: string | null = null;
	private baseUrl = '';

	private readonly ensuredFolders = new Set<string>();
	private readonly registry = new Map<string, RegistryEntry>();
	private readonly ptzActive = new Map<string | number, string>();
	private readonly widgetSig: Record<string, string> = {};
	private readonly lastEventFn: Record<string | number, string> = {};
	private readonly camAspect: Record<string | number, string> = {};
	private readonly devById = new Map<string | number, Device>();
	private readonly eventBusy: Record<string | number, boolean> = {};

	public constructor(options: Partial<utils.AdapterOptions> = {}) {
		super({ ...options, name: 'agent-dvr' });
		this.on('ready', this.onReady.bind(this));
		this.on('stateChange', this.onStateChange.bind(this));
		this.on('unload', this.onUnload.bind(this));
	}

	// ---- lifecycle ----

	private async onReady(): Promise<void> {
		void this.setState('info.connection', false, true);

		const pollSeconds = Math.max(5, Math.min(3600, this.config.pollSeconds || 30));
		this.baseUrl = `http://${this.config.ip}:${this.config.port || 8090}`;

		if (this.config.user || this.config.pass) {
			this.authHeader = `Basic ${Buffer.from(`${this.config.user}:${this.config.pass}`).toString('base64')}`;
		}

		await this.buildSystem();
		try {
			await this.poll();
		} catch (e) {
			this.log.warn(`First poll error: ${(e as Error).message}`);
		}

		this.pollTimer = this.setInterval(
			() => this.poll().catch(e => this.log.warn(`Poll error: ${(e as Error).message}`)),
			pollSeconds * 1000,
		);

		this.subscribeStates('*');
		this.log.info(`Agent DVR adapter ready. Polling ${this.baseUrl} every ${pollSeconds}s.`);
	}

	private onUnload(callback: () => void): void {
		try {
			if (this.pollTimer !== undefined) {
				this.clearInterval(this.pollTimer);
				this.pollTimer = undefined;
			}
			if (this.refreshTimer !== undefined) {
				this.clearTimeout(this.refreshTimer);
				this.refreshTimer = undefined;
			}
		} catch {
			/* ignore */
		}
		callback();
	}

	private onStateChange(id: string, state: ioBroker.State | null | undefined): void {
		if (!state || state.ack !== false) {
			return;
		}
		const relId = this.getRelId(id);
		const entry = this.registry.get(relId);
		if (entry) {
			this.runCommand(relId, entry, state.val as boolean).catch(e =>
				this.log.warn(`Command error: ${(e as Error).message}`),
			);
		}
	}

	// ---- helpers ----

	private getRelId(fullId: string): string {
		return fullId.startsWith(`${this.namespace}.`) ? fullId.slice(this.namespace.length + 1) : fullId;
	}

	private apiGet(path: string): Promise<ApiResult> {
		return new Promise(resolve => {
			const timeout = Math.max(1000, Math.min(30000, this.config.httpTimeoutMs || 8000));
			const opts: http.RequestOptions = {
				hostname: this.config.ip,
				port: this.config.port || 8090,
				path,
				method: 'GET',
				timeout,
			};
			if (this.authHeader) {
				opts.headers = { Authorization: this.authHeader };
			}
			try {
				const req = http.request(opts, res => {
					let data = '';
					res.on('data', (c: Buffer) => {
						data += c.toString();
					});
					res.on('end', () => {
						if (res.statusCode && res.statusCode >= 400) {
							resolve({ ok: false, error: `HTTP ${res.statusCode}` });
						} else {
							resolve({ ok: true, data });
						}
					});
					res.on('error', (e: Error) => resolve({ ok: false, error: e.message }));
				});
				req.on('error', (e: Error) => resolve({ ok: false, error: e.message }));
				req.on('timeout', () => {
					req.destroy();
					resolve({ ok: false, error: 'timeout' });
				});
				req.end();
			} catch (e) {
				resolve({ ok: false, error: String((e as Error).message || e) });
			}
		});
	}

	private async ensureFolder(id: string, name: string, type: 'device' | 'channel' = 'channel'): Promise<void> {
		if (this.ensuredFolders.has(id)) {
			return;
		}
		await this.setObjectNotExistsAsync(id, { type, common: { name }, native: {} });
		this.ensuredFolders.add(id);
	}

	private async ensurePath(fullId: string): Promise<void> {
		const parts = fullId.split('.');
		let acc = parts[0];
		for (let i = 1; i < parts.length - 1; i++) {
			acc += `.${parts[i]}`;
			if (!this.ensuredFolders.has(acc)) {
				await this.setObjectNotExistsAsync(acc, { type: 'channel', common: { name: parts[i] }, native: {} });
				this.ensuredFolders.add(acc);
			}
		}
	}

	private guessRole(id: string, val: unknown): ioBroker.CommonType {
		if (typeof val === 'string' && /^https?:\/\//i.test(val)) {
			return 'string';
		}
		return 'string';
	}

	private async writeLeaf(id: string, val: unknown): Promise<void> {
		const t = typeof val;
		let common: ioBroker.StateCommon;
		if (t === 'boolean') {
			common = { name: id.split('.').pop() || id, type: 'boolean', role: 'indicator', read: true, write: false };
		} else if (t === 'number') {
			common = { name: id.split('.').pop() || id, type: 'number', role: 'value', read: true, write: false };
		} else {
			const role = typeof val === 'string' && /^https?:\/\//i.test(val) ? 'text.url' : 'text';
			common = { name: id.split('.').pop() || id, type: 'string', role, read: true, write: false };
		}
		if (!this.ensuredFolders.has(id)) {
			await this.ensurePath(id);
			await this.setObjectNotExistsAsync(id, { type: 'state', common, native: {} });
			this.ensuredFolders.add(id);
		}
		await this.setStateAsync(id, { val: (val === undefined ? null : val) as ioBroker.StateValue, ack: true });
	}

	private async flattenWrite(obj: unknown, prefix: string, depth: number): Promise<void> {
		const maxDepth = Math.max(1, Math.min(10, this.config.maxDepth || 6));
		const maxArray = Math.max(1, Math.min(500, this.config.maxArray || 30));
		if (depth > maxDepth) {
			return;
		}
		if (obj === null || obj === undefined) {
			await this.writeLeaf(prefix, obj);
			return;
		}
		if (typeof obj === 'object') {
			if (Array.isArray(obj)) {
				if (obj.length > maxArray) {
					await this.writeLeaf(`${prefix}.count`, obj.length);
					return;
				}
				for (let i = 0; i < obj.length; i++) {
					await this.flattenWrite(obj[i], `${prefix}.${i}`, depth + 1);
				}
			} else {
				for (const k of Object.keys(obj)) {
					if (SKIP_KEYS.includes(k)) {
						continue;
					}
					await this.flattenWrite((obj as Record<string, unknown>)[k], `${prefix}.${sanitize(k)}`, depth + 1);
				}
			}
		} else {
			await this.writeLeaf(prefix, obj);
		}
	}

	private async ensureControl(
		id: string,
		name: string,
		entry: RegistryEntry,
		role: 'button' | 'switch',
	): Promise<void> {
		if (!this.ensuredFolders.has(id)) {
			await this.ensurePath(id);
			await this.setObjectNotExistsAsync(id, {
				type: 'state',
				common: { name, type: 'boolean', role, read: role === 'switch', write: true, def: false },
				native: {},
			});
			await this.setStateAsync(id, { val: false, ack: true });
			this.ensuredFolders.add(id);
		}
		this.registry.set(id, entry);
	}

	private ensureButton(id: string, name: string, entry: RegistryEntry): Promise<void> {
		return this.ensureControl(id, name, entry, 'button');
	}

	private async ensureFlag(id: string, name: string): Promise<void> {
		if (this.ensuredFolders.has(id)) {
			return;
		}
		await this.ensurePath(id);
		await this.setObjectNotExistsAsync(id, {
			type: 'state',
			common: { name, type: 'boolean', role: 'indicator', read: true, write: false, def: false },
			native: {},
		});
		this.ensuredFolders.add(id);
		await this.setStateAsync(id, { val: false, ack: true });
	}

	private async pulse(id: string): Promise<void> {
		await this.setStateAsync(id, { val: true, ack: true });
		this.setTimeout(() => this.setStateAsync(id, { val: false, ack: true }).catch(() => {}), 1500);
	}

	// ---- system structure ----

	private async buildSystem(): Promise<void> {
		await this.ensureFolder('system', 'System', 'channel');
		await this.writeLeaf('system.online', false);
		await this.writeLeaf('system.lastUpdate', '');
		await this.writeLeaf('system.lastPoll', 0);
		await this.writeLeaf('system.cameraCount', 0);

		if (this.config.enableSystemControls) {
			await this.ensureFolder('system.control', 'Control', 'channel');
			for (const c of SYS_COMMANDS) {
				await this.ensureButton(`system.control.${c.id}`, c.name, { kind: 'sys', path: c.path });
			}
		}
	}

	// ---- camera aspect detection ----

	private async detectAspect(d: Device): Promise<void> {
		if (this.camAspect[d.oid] !== undefined) {
			return;
		}
		let wh = findWH(d.raw, 0);
		if (!wh) {
			const res = await this.apiGet(`/command/getObject?oid=${d.oid}&ot=2`);
			const j = asJson(res.data);
			if (j) {
				wh = findWH(j, 0);
			}
		}
		this.camAspect[d.oid] = wh ? `${wh[0]}/${wh[1]}` : '';
		if (wh) {
			this.log.debug(`cam ${d.oid} resolution ${wh[0]}x${wh[1]} -> AR ${this.camAspect[d.oid]}`);
		}
	}

	// ---- device folder name ----

	private deviceFolder(d: Device): string {
		return `${d.ot === 1 ? 'mic' : 'cam'}_${sanitize(d.oid)}_${sanitize(d.name)}`;
	}

	// ---- build device data points ----

	private async buildDevice(d: Device): Promise<void> {
		const fid = this.deviceFolder(d);
		this.devById.set(d.oid, d);

		await this.ensureFolder(fid, d.name, 'device');
		if (d.ot === 2) {
			await this.detectAspect(d);
		}
		await this.flattenWrite(d.raw, fid, 0);

		await this.ensureFolder(`${fid}.control`, 'Control', 'channel');
		for (const c of CAM_COMMANDS) {
			if (c.id === 'snapshot' && d.ot !== 2) {
				continue;
			}
			await this.ensureButton(`${fid}.control.${c.id}`, c.name, {
				kind: 'cam',
				path: c.path,
				params: [...c.params],
				oid: d.oid,
				ot: d.ot,
			});
		}

		if (this.config.enablePtz && d.ot === 2) {
			await this.ensureFolder(`${fid}.control.ptz`, 'PTZ', 'channel');
			for (const p of PTZ_DIRS) {
				const cid = `${fid}.control.ptz.${p.id}`;
				if (p.hold) {
					await this.ensureControl(
						cid,
						`PTZ ${p.id} (hold)`,
						{ kind: 'ptzHold', oid: d.oid, dir: p.dir },
						'switch',
					);
				} else {
					await this.ensureButton(cid, `PTZ ${p.id}`, { kind: 'ptz', oid: d.oid, dir: p.dir });
				}
			}
		}

		if (this.config.enableUrls && d.ot === 2) {
			await this.ensureFolder(`${fid}.urls`, 'URLs', 'channel');
			await this.writeLeaf(`${fid}.urls.snapshot`, `${this.baseUrl}/grab.jpg?oid=${d.oid}`);
			await this.writeLeaf(`${fid}.urls.photo`, `${this.baseUrl}/photo.jpg?oid=${d.oid}`);
			await this.writeLeaf(`${fid}.urls.mjpeg`, `${this.baseUrl}/video.mjpg?oids=${d.oid}`);
			await this.writeLeaf(`${fid}.urls.mp4`, `${this.baseUrl}/video.mp4?oids=${d.oid}`);
		}

		await this.updateCameraEvents(d, fid);
	}

	// ---- event formatting ----

	private fmtEvent(
		ev: Record<string, unknown>,
		oid: number | string,
	): {
		fn: string;
		sizeMB: number;
		dur: string;
		tag: string;
		date: string;
		time: string;
		thumb: string;
		video: string;
	} {
		const e = ev as AgentDvrEvent;
		const fn = e.fn ?? '';
		const dot = fn.lastIndexOf('.');
		const jpg = `${dot > 0 ? fn.slice(0, dot) : fn}_large.jpg`;
		const sizeMB = e.sb ? Math.round((Number(e.sb) / 1048576) * 100) / 100 : 0;
		const dur = e.d != null ? String(e.d) : '';
		const tag = e.tg ?? '';
		const ms = (parseFloat(String(e.c ?? 0)) - 621355968000000000) / 10000;
		const dt = new Date(ms);
		const two = (n: number): string => String(n).padStart(2, '0');
		const date = `${two(dt.getDate())}.${two(dt.getMonth() + 1)}.`;
		const time = `${two(dt.getHours())}:${two(dt.getMinutes())}`;
		const thumb = `${this.baseUrl}/fileThumb.jpg?oid=${oid}&fn=${encodeURIComponent(jpg)}`;
		const video = `${this.baseUrl}/streamFile.cgi?oid=${oid}&ot=2&fn=${encodeURIComponent(fn)}`;
		return { fn, sizeMB, dur, tag, date, time, thumb, video };
	}

	// ---- gallery HTML builders ----

	private buildGalleryHtml(d: Device, events: Record<string, unknown>[]): string {
		return (this.config.widgetMode || 'nojs') === 'js'
			? this.buildGalleryHtmlJs(d, events)
			: this.buildGalleryHtmlNojs(d, events);
	}

	private buildGalleryHtmlNojs(d: Device, events: Record<string, unknown>[]): string {
		const oid = d.oid;
		const minCol = this.config.widgetMinCol || 150;
		const maxW = this.config.widgetMaxModalWidth || 900;
		const showTags = this.config.widgetShowTags;
		const pos = (this.config.widgetTagPosition || 'bottom-left').split('-');
		const tagStyle = `${pos[0]}:5px;${pos[1]}:5px`;
		const playerUrl = (this.config.widgetPlayerUrl || '').trim();
		const PAUSE_ATTR = ` onchange="if(!this.checked){var m=this.nextElementSibling.nextElementSibling,v=m&&m.querySelector('video');if(v){v.pause();}}"`;

		const items = events
			.map((ev, i) => {
				const p = this.fmtEvent(ev, oid);
				const id = `adv${sanitize(oid)}_${i}`;
				const badge =
					showTags && p.tag ? `<span class="advtag" style="${tagStyle}">${escHtml(p.tag)}</span>` : '';
				const inner =
					`<span class="advimg"><img src="${p.thumb}" loading="lazy" alt="">${badge}<span class="advplay"></span></span>` +
					`<span class="advcap">${escHtml(p.date)} ${escHtml(p.time)}<br>${escHtml(p.dur)}s &middot; ${escHtml(p.sizeMB)} MB</span>`;
				if (playerUrl) {
					const href = playerUrl
						.replace(/{video}/g, encodeURIComponent(p.video))
						.replace(/{videoRaw}/g, p.video)
						.replace(/{fn}/g, encodeURIComponent(p.fn))
						.replace(/{date}/g, encodeURIComponent(p.date))
						.replace(/{time}/g, encodeURIComponent(p.time))
						.replace(/{duration}/g, encodeURIComponent(p.dur))
						.replace(/{size}/g, encodeURIComponent(String(p.sizeMB)))
						.replace(/{tags}/g, encodeURIComponent(p.tag));
					return `<a class="advcell" href="${escHtml(href)}" target="_blank" rel="noopener">${inner}</a>`;
				}
				return (
					`<input class="advlb" type="checkbox" id="${id}"${PAUSE_ATTR}>` +
					`<label class="advcell advthumb" for="${id}">${inner}</label>` +
					`<div class="advmodal"><label class="advbackdrop" for="${id}"></label>` +
					`<div class="advbox"><label class="advclose" for="${id}">&#10005;</label>` +
					`<video class="advvideo" controls preload="none" playsinline src="${p.video}"></video>` +
					`<div class="advinfo">${escHtml(p.date)} ${escHtml(p.time)} &middot; ${escHtml(p.dur)}s &middot; ${escHtml(p.sizeMB)} MB${
						p.tag ? ` &middot; ${escHtml(p.tag)}` : ''
					} &middot; <a href="${p.video}" download target="_blank">Download</a></div></div></div>`
				);
			})
			.join('');

		const grid = items ? `<div class="advgrid">${items}</div>` : `<div class="advempty">No recordings</div>`;
		return `<style>${galleryCss(minCol, maxW)}</style>${grid}`;
	}

	private buildGalleryHtmlJs(d: Device, events: Record<string, unknown>[]): string {
		const oid = d.oid;
		const minCol = this.config.widgetMinCol || 150;
		const maxW = this.config.widgetMaxModalWidth || 900;
		const items = events.map(ev => {
			const p = this.fmtEvent(ev, oid);
			return {
				fn: p.fn,
				date: p.date,
				time: p.time,
				dur: p.dur,
				size: p.sizeMB,
				tag: p.tag,
				thumb: p.thumb,
				video: p.video,
			};
		});
		const cfg = {
			min_col: minCol,
			show_tags: !!this.config.widgetShowTags,
			max_modal_width: maxW,
			live_aspect: this.camAspect[oid] || this.config.widgetLiveAspect || '',
			player_url: (this.config.widgetPlayerUrl || '').trim(),
			tag_position: this.config.widgetTagPosition || 'bottom-left',
		};
		const data = JSON.stringify({ items, live: null, cfg }).replace(/</g, '\\u003c');
		const boot = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
		return (
			`<style>${galleryCssJs(minCol)}</style>` +
			`<div class="advroot"><script type="application/json" class="advdata">${data}</script>` +
			`<div class="advbar"><input class="advsearchjs" type="text" placeholder="Search …"><div class="advtagsjs"></div></div>` +
			`<div class="advgridjs"></div></div>` +
			`<script type="text/plain" class="advcode">${ADV_CLIENT_CODE}</script>` +
			`<img alt="" src="${boot}" style="display:none" onload="(function(){if(window.ADVscan){window.ADVscan();return;}var c=document.querySelector('script.advcode');if(!c)return;var s=document.createElement('script');s.textContent=c.textContent;document.body.appendChild(s);})()">`
		);
	}

	private buildOverviewHtml(cams: Device[]): string {
		const ts = Date.now();
		const minCol = this.config.widgetMinCol || 150;
		const maxW = this.config.widgetMaxModalWidth || 900;
		const PAUSE_ATTR = ` onchange="if(!this.checked){var m=this.nextElementSibling.nextElementSibling,v=m&&m.querySelector('video');if(v){v.pause();}}"`;
		const tiles = cams
			.map(d => {
				const oid = d.oid;
				const id = `advlive${sanitize(oid)}`;
				const grab = `${this.baseUrl}/grab.jpg?oid=${oid}&ot=2&maintainAR=1&ts=${ts}`;
				const webm = `${this.baseUrl}/video.webm?oid=${oid}&ot=2`;
				const name = escHtml(d.name || `Camera ${oid}`);
				const arRaw = this.camAspect[oid] || this.config.widgetLiveAspect || '';
				const ar = arRaw ? String(arRaw).replace('/', ' / ') : '';
				const fix = ar ? ' advimgfix' : '';
				const arStyle = ar ? ` style="aspect-ratio:${ar}"` : '';
				const inner =
					`<span class="advimg${fix}"${arStyle}><img src="${grab}" loading="lazy" alt="">` +
					`<span class="advtag" style="top:5px;left:5px">&#9679; LIVE</span><span class="advplay"></span></span>` +
					`<span class="advcap">${name}</span>`;
				return (
					`<input class="advlb" type="checkbox" id="${id}"${PAUSE_ATTR}>` +
					`<label class="advcell advthumb" for="${id}">${inner}</label>` +
					`<div class="advmodal"><label class="advbackdrop" for="${id}"></label>` +
					`<div class="advbox"><label class="advclose" for="${id}">&#10005;</label>` +
					`<video class="advvideo" controls preload="none" playsinline src="${webm}"></video>` +
					`<div class="advinfo">${name} &middot; Live</div></div></div>`
				);
			})
			.join('');
		const grid = tiles ? `<div class="advgrid">${tiles}</div>` : `<div class="advempty">No cameras</div>`;
		return `<style>${galleryCss(minCol, maxW)}</style>${grid}`;
	}

	// ---- event data points ----

	private async writeEventDps(d: Device, fid: string, events: Record<string, unknown>[]): Promise<void> {
		const oid = d.oid;
		await this.ensureFolder(`${fid}.events`, 'Events', 'channel');
		await this.ensureFolder(`${fid}.events.last`, 'Last event', 'channel');

		const two = (n: number): string => String(n).padStart(2, '0');
		const now = new Date();
		const td = `${two(now.getDate())}.${two(now.getMonth() + 1)}.`;
		const todayCount = events.filter(ev => this.fmtEvent(ev, oid).date === td).length;

		await this.writeLeaf(`${fid}.events.count`, events.length);
		await this.writeLeaf(`${fid}.events.today`, todayCount);

		if (events.length) {
			const p = this.fmtEvent(events[0], oid);
			const tsMs = (parseFloat(String((events[0] as AgentDvrEvent).c ?? 0)) - 621355968000000000) / 10000;
			await this.writeLeaf(`${fid}.events.last.time`, `${p.date} ${p.time}`);
			await this.writeLeaf(`${fid}.events.last.timestamp`, Math.round(tsMs));
			await this.writeLeaf(`${fid}.events.last.tag`, p.tag);
			await this.writeLeaf(`${fid}.events.last.duration`, p.dur ? parseFloat(p.dur) : 0);
			await this.writeLeaf(`${fid}.events.last.size_mb`, p.sizeMB);
			await this.writeLeaf(`${fid}.events.last.thumb`, p.thumb);
			await this.writeLeaf(`${fid}.events.last.video`, p.video);
		}

		await this.ensureFlag(`${fid}.events.new`, 'New event');

		if (this.config.enablePush) {
			const pid = `${fid}.events.pushTrigger`;
			if (!this.ensuredFolders.has(pid)) {
				await this.ensurePath(pid);
				await this.setObjectNotExistsAsync(pid, {
					type: 'state',
					common: {
						name: 'Push trigger (AgentDVR action)',
						type: 'string',
						role: 'text',
						read: true,
						write: true,
						def: '',
					},
					native: {},
				});
				await this.setStateAsync(pid, { val: '', ack: true });
				this.ensuredFolders.add(pid);
			}
			this.registry.set(pid, { kind: 'push', oid, fid });
		}

		const ignore = (this.config.eventTagsIgnore || 'detected')
			.split(',')
			.map(s => s.trim().toLowerCase())
			.filter(Boolean);
		const tokensOf = (s: string): string[] =>
			s
				.toLowerCase()
				.split(/[,\s]+/)
				.filter(Boolean);

		for (const kw of (this.config.eventTags || '')
			.split(',')
			.map(s => s.trim())
			.filter(Boolean)) {
			await this.ensureFlag(`${fid}.events.detected_${sanitize(kw)}`, `Detected: ${kw}`);
		}

		if (this.config.eventTagsDynamic) {
			const seen = new Set<string>();
			for (const ev of events) {
				tokensOf((ev as AgentDvrEvent).tg ?? '').forEach(t => seen.add(t));
			}
			for (const t of seen) {
				if (ignore.includes(t)) {
					continue;
				}
				await this.ensureFlag(`${fid}.events.detected_${sanitize(t)}`, `Detected: ${t}`);
			}
		}

		let newCount = 0;
		if (events.length) {
			const prev = this.lastEventFn[oid];
			if (prev !== undefined) {
				const i = events.findIndex(e => (e as AgentDvrEvent).fn === prev);
				newCount = i === -1 ? events.length : i;
			}
			this.lastEventFn[oid] = (events[0] as AgentDvrEvent).fn ?? '';
		}

		if (newCount > 0) {
			await this.pulse(`${fid}.events.new`);
			const tags = new Set<string>();
			for (let i = 0; i < newCount && i < events.length; i++) {
				tokensOf((events[i] as AgentDvrEvent).tg ?? '').forEach(t => tags.add(t));
			}
			for (const t of tags) {
				if (ignore.includes(t)) {
					continue;
				}
				const tid = `${fid}.events.detected_${sanitize(t)}`;
				await this.ensureFlag(tid, `Detected: ${t}`);
				await this.pulse(tid);
			}
			this.log.debug(`${newCount} new event(s) cam ${oid} [${[...tags].join(',')}]`);
		}
	}

	// ---- camera events + widget ----

	private async updateCameraEvents(d: Device, fid: string): Promise<void> {
		if (d.ot !== 2) {
			return;
		}
		if (!this.config.enableWidget && !this.config.enableEventDps) {
			return;
		}
		if (this.eventBusy[d.oid]) {
			return;
		}
		this.eventBusy[d.oid] = true;
		try {
			const evRes = await this.apiGet(`/q/getEvents?oid=${d.oid}&ot=2`);
			const evJson = asJson(evRes.data);
			if (!evJson) {
				return;
			}
			const events = (
				Array.isArray(evJson.events) ? evJson.events : Array.isArray(evJson) ? evJson : []
			) as Record<string, unknown>[];

			if (this.config.enableEventDps) {
				await this.writeEventDps(d, fid, events);
			}

			if (this.config.enableWidget) {
				const wId = `${fid}.widget`;
				if (!this.ensuredFolders.has(wId)) {
					await this.ensurePath(wId);
					await this.setObjectNotExistsAsync(wId, {
						type: 'state',
						common: {
							name: 'HTML gallery widget',
							type: 'string',
							role: 'html',
							read: true,
							write: false,
							def: '',
						},
						native: {},
					});
					this.ensuredFolders.add(wId);
				}
				const ev = events.slice(0, Math.max(1, this.config.widgetAnzahl || 50));
				const f = (ev[0] ?? {}) as AgentDvrEvent;
				const l = (ev[ev.length - 1] ?? {}) as AgentDvrEvent;
				const sig = `${ev.length}|${f.fn ?? ''}|${l.fn ?? ''}`;
				if (this.widgetSig[wId] !== sig) {
					await this.setStateAsync(wId, { val: this.buildGalleryHtml(d, ev), ack: true });
					this.widgetSig[wId] = sig;
				}
			}
		} finally {
			this.eventBusy[d.oid] = false;
		}
	}

	private pushRefresh(oid: number | string): void {
		const d = this.devById.get(oid);
		if (!d) {
			this.log.warn(`Push: camera ${oid} unknown (available after first poll)`);
			return;
		}
		const fid = this.deviceFolder(d);
		for (const ms of [0, 1500, 3500, 6000]) {
			this.setTimeout(
				() =>
					this.updateCameraEvents(d, fid).catch(e =>
						this.log.warn(`Push refresh error: ${(e as Error).message}`),
					),
				ms,
			);
		}
	}

	// ---- main poll ----

	private async poll(): Promise<void> {
		const res = await this.apiGet('/command/getObjects');
		const json = asJson(res.data);

		if (!res.ok || !json) {
			await this.setStateAsync('info.connection', false, true);
			await this.setStateAsync('system.online', { val: false, ack: true });
			this.log.warn(`AgentDVR unreachable: ${res.error || 'invalid response'}`);
			return;
		}

		await this.setStateAsync('info.connection', true, true);
		await this.setStateAsync('system.online', { val: true, ack: true });

		if (json.settings) {
			await this.flattenWrite(json.settings, 'system.settings', 0);
		}

		if (this.config.storeRawJson) {
			const clean: Record<string, unknown> = { ...json };
			delete clean.icons;
			await this.writeLeaf('system.raw_getObjects', JSON.stringify(clean).slice(0, 60000));
		}

		const devices = findDevices(json);
		await this.setStateAsync('system.cameraCount', { val: devices.filter(d => d.ot === 2).length, ack: true });

		for (const d of devices) {
			await this.buildDevice(d);
		}

		const stats = asJson((await this.apiGet('/command/getSystemStats')).data);
		if (stats) {
			await this.flattenWrite(stats, 'system.stats', 0);
			const gb = parseSizeGb(stats.disk_free);
			if (gb !== null) {
				await this.writeLeaf('system.disk_free_gb', gb);
			}
		}

		const status = asJson((await this.apiGet('/command/getStatus')).data);
		if (status) {
			await this.flattenWrite(status, 'system.status', 0);
		}

		if (this.config.enableOverview) {
			const cams = devices.filter(d => d.ot === 2);
			const ovId = 'overview';
			if (!this.ensuredFolders.has(ovId)) {
				await this.setObjectNotExistsAsync(ovId, {
					type: 'state',
					common: {
						name: 'Overview (all cameras)',
						type: 'string',
						role: 'html',
						read: true,
						write: false,
						def: '',
					},
					native: {},
				});
				this.ensuredFolders.add(ovId);
			}
			await this.setStateAsync(ovId, { val: this.buildOverviewHtml(cams), ack: true });
		}

		await this.setStateAsync('system.lastUpdate', { val: new Date().toISOString(), ack: true });
		await this.setStateAsync('system.lastPoll', { val: Date.now(), ack: true });
	}

	private scheduleRefresh(): void {
		if (this.refreshTimer !== undefined) {
			this.clearTimeout(this.refreshTimer);
			this.refreshTimer = undefined;
		}
		this.refreshTimer = this.setTimeout(
			() => this.poll().catch(e => this.log.warn(`Refresh error: ${(e as Error).message}`)),
			1500,
		);
	}

	// ---- command execution ----

	private ptzUrl(oid: number | string, dir: number): string {
		return `/ptz.cgi?oid=${encodeURIComponent(String(oid))}&dir=${dir}`;
	}

	private buildCommandUrl(entry: RegistryEntry): string {
		if (entry.kind === 'ptz') {
			return this.ptzUrl(entry.oid!, entry.dir!);
		}
		if (entry.kind === 'sys') {
			return entry.path as string;
		}
		const qs: string[] = [];
		for (const p of entry.params || []) {
			if (p === 'oid') {
				qs.push(`oid=${encodeURIComponent(String(entry.oid))}`);
			} else if (p === 'ot') {
				qs.push(`ot=${encodeURIComponent(String(entry.ot))}`);
			}
		}
		return (entry.path || '') + (qs.length ? `?${qs.join('&')}` : '');
	}

	private async clearPtzSiblings(stateId: string): Promise<void> {
		const prefix = stateId.slice(0, stateId.lastIndexOf('.') + 1);
		for (const p of PTZ_DIRS) {
			if (!p.hold) {
				continue;
			}
			const sid = prefix + p.id;
			if (sid !== stateId) {
				await this.setStateAsync(sid, { val: false, ack: true });
			}
		}
	}

	private async runCommand(relId: string, entry: RegistryEntry, val: boolean): Promise<void> {
		if (entry.kind === 'push') {
			this.log.info(`Push trigger cam ${entry.oid}`);
			await this.setStateAsync(relId, { val: '', ack: true });
			this.pushRefresh(entry.oid!);
			return;
		}

		if (entry.kind === 'ptzHold') {
			const oid = entry.oid!;
			const startMove = async (): Promise<void> => {
				await this.clearPtzSiblings(relId);
				await this.apiGet(this.ptzUrl(oid, entry.dir!));
				this.ptzActive.set(oid, relId);
				await this.setStateAsync(relId, { val: true, ack: true });
			};
			const stopMove = async (): Promise<void> => {
				await this.apiGet(this.ptzUrl(oid, 11));
				if (this.ptzActive.get(oid) === relId) {
					this.ptzActive.delete(oid);
				}
				await this.setStateAsync(relId, { val: false, ack: true });
			};
			if (val) {
				if (this.ptzActive.get(oid) === relId) {
					await stopMove();
				} else {
					await startMove();
				}
			} else {
				await stopMove();
			}
			this.scheduleRefresh();
			return;
		}

		if (!val) {
			return;
		}

		if (entry.kind === 'sys' && entry.path === null) {
			await this.poll().catch(e => this.log.warn(`Manual refresh error: ${(e as Error).message}`));
			await this.setStateAsync(relId, { val: false, ack: true });
			return;
		}

		const url = this.buildCommandUrl(entry);
		const cmdRes = await this.apiGet(url);
		if (cmdRes.ok) {
			this.log.debug(`OK: ${url}`);
		} else {
			this.log.warn(`Command failed (${url}): ${cmdRes.error}`);
		}

		await this.setStateAsync(relId, { val: false, ack: true });
		this.scheduleRefresh();
	}
}

if (require.main !== module) {
	module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new AgentDvr(options);
} else {
	(() => new AgentDvr())();
}
