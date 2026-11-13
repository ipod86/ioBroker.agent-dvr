"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var utils = __toESM(require("@iobroker/adapter-core"));
var http = __toESM(require("node:http"));
var https = __toESM(require("node:https"));
var fs = __toESM(require("node:fs"));
var path = __toESM(require("node:path"));
var import_widget_i18n = require("./lib/widget-i18n");
var import_recording = require("./lib/recording");
const CAM_COMMANDS = [
  { id: "record", path: "/command/record", params: ["oid", "ot"], name: "Start recording" },
  { id: "recordStop", path: "/command/recordStop", params: ["oid", "ot"], name: "Stop recording" },
  { id: "recordRestart", path: "/command/recordRestart", params: ["oid", "ot"], name: "Restart recording" },
  { id: "triggerRecord", path: "/command/triggerRecord", params: ["oid", "ot"], name: "Trigger recording (timeout)" },
  { id: "snapshot", path: "/command/snapshot", params: ["oid"], name: "Take snapshot" },
  { id: "detect", path: "/command/detect", params: ["oid", "ot"], name: "Trigger motion detection" },
  { id: "alertOn", path: "/command/alertOn", params: ["oid", "ot"], name: "Arm alerts" },
  { id: "alertOff", path: "/command/alertOff", params: ["oid", "ot"], name: "Disarm alerts" },
  { id: "switchOn", path: "/command/switchOn", params: ["oid", "ot"], name: "Switch device on" },
  { id: "switchOff", path: "/command/switchOff", params: ["oid", "ot"], name: "Switch device off" },
  { id: "objectDetectOn", path: "/command/objectdetecton", params: ["oid", "ot"], name: "Enable object detection" },
  {
    id: "objectDetectOff",
    path: "/command/objectdetectoff",
    params: ["oid", "ot"],
    name: "Disable object detection"
  },
  { id: "recOnAlert", path: "/command/recordOnAlertOn", params: ["oid", "ot"], name: "Record on alert: on" },
  { id: "recOnDetect", path: "/command/recordOnDetectOn", params: ["oid", "ot"], name: "Record on detect: on" },
  { id: "scheduleOn", path: "/command/scheduleOn", params: ["oid", "ot"], name: "Enable schedule" },
  { id: "scheduleOff", path: "/command/scheduleOff", params: ["oid", "ot"], name: "Disable schedule" },
  { id: "detectorOn", path: "/command/switchDetector?on=true", params: ["oid", "ot"], name: "Enable detector" },
  { id: "detectorOff", path: "/command/switchDetector?on=false", params: ["oid", "ot"], name: "Disable detector" },
  { id: "purge", path: "/command/purge", params: ["oid", "ot"], name: "Purge folder (caution!)" }
];
const SYS_COMMANDS = [
  { id: "arm", path: "/command/arm", name: "Arm system" },
  { id: "disarm", path: "/command/disarm", name: "Disarm system" },
  { id: "allOn", path: "/command/allOn", name: "All devices on" },
  { id: "allOff", path: "/command/allOff", name: "All devices off" },
  { id: "reloadConfig", path: "/command/reloadConfig", name: "Reload config" },
  { id: "reloadObjects", path: "/command/reloadObjects", name: "Reload objects" },
  { id: "runStorageMgmt", path: "/command/runStorageMgmt", name: "Run storage management" },
  { id: "blockExternal", path: "/command/blockExternal", name: "Block external access" },
  { id: "unblockExternal", path: "/command/unblockExternal", name: "Unblock external access" },
  { id: "restart", path: "/command/restart", name: "Restart Agent DVR" },
  { id: "refresh", path: null, name: "Refresh data now" }
];
const PTZ_DIRS = [
  { id: "left", dir: 1, hold: true },
  { id: "upLeft", dir: 2, hold: true },
  { id: "up", dir: 3, hold: true },
  { id: "upRight", dir: 4, hold: true },
  { id: "right", dir: 5, hold: true },
  { id: "downRight", dir: 6, hold: true },
  { id: "down", dir: 7, hold: true },
  { id: "downLeft", dir: 8, hold: true },
  { id: "zoomIn", dir: 9, hold: true },
  { id: "zoomOut", dir: 10, hold: true },
  { id: "stop", dir: 11, hold: false },
  { id: "center", dir: 0, hold: false }
];
const SKIP_KEYS = ["icons", "image", "thumbnail", "base64"];
function sanitize(s) {
  return String(s).replace(/[\s.[\]*?"'`,;:/\\]+/g, "_").replace(/[^A-Za-z0-9_-]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "") || "x";
}
function asJson(data) {
  if (data == null) {
    return null;
  }
  if (typeof data === "object") {
    return data;
  }
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  return null;
}
function toStr(v) {
  if (v == null) {
    return "";
  }
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
    return String(v);
  }
  return Object.prototype.toString.call(v);
}
function escHtml(s) {
  return toStr(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function parseSizeGb(s) {
  if (s == null) {
    return null;
  }
  const m = toStr(s).trim().match(/([\d.,]+)\s*([KMGT]?B)?/i);
  if (!m) {
    return null;
  }
  let v = parseFloat(m[1].replace(",", "."));
  if (isNaN(v)) {
    return null;
  }
  const u = (m[2] || "GB").toUpperCase();
  if (u === "TB") {
    v *= 1024;
  } else if (u === "MB") {
    v /= 1024;
  } else if (u === "KB") {
    v /= 1048576;
  } else if (u === "B") {
    v /= 1073741824;
  }
  return Math.round(v * 100) / 100;
}
function findWH(obj, depth) {
  if (!obj || typeof obj !== "object" || depth > 5) {
    return null;
  }
  const o = obj;
  for (const [kw, kh] of [
    ["width", "height"],
    ["w", "h"],
    ["sourceWidth", "sourceHeight"],
    ["videoWidth", "videoHeight"],
    ["imageWidth", "imageHeight"]
  ]) {
    const w = o[kw], h = o[kh];
    if (typeof w === "number" && typeof h === "number" && w >= 100 && h >= 100 && w <= 12e3 && h <= 12e3) {
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
function detectOt(elem) {
  var _a, _b, _c;
  const v = (_c = (_b = (_a = elem.typeID) != null ? _a : elem.ot) != null ? _b : elem.objectTypeID) != null ? _c : elem.type;
  return v === 1 || v === 2 ? v : 2;
}
function findDevices(json) {
  var _a;
  const list = Array.isArray(json.objectList) ? json.objectList : [];
  const out = [];
  for (const e of list) {
    if (!e || typeof e !== "object") {
      continue;
    }
    const el = e;
    const rawId = (_a = el.id) != null ? _a : el.oid;
    if (rawId === void 0 || rawId === null) {
      continue;
    }
    const id = rawId;
    const name = typeof el.name === "string" ? el.name : `obj_${id}`;
    out.push({ oid: id, ot: detectOt(el), name, raw: el });
  }
  return out;
}
function advCssVars(c) {
  const cardBg = (c == null ? void 0 : c.cardBg) || "rgba(127,127,127,.15)";
  const tagBg = (c == null ? void 0 : c.tagBg) || "rgba(0,0,0,.55)";
  const tagText = (c == null ? void 0 : c.tagText) || "#fff";
  const accent = (c == null ? void 0 : c.accent) || "#8ab4f8";
  const modalBg = (c == null ? void 0 : c.modalBg) || "#1c1c1e";
  const radius = (c == null ? void 0 : c.radius) != null ? `${c.radius}px` : "8px";
  return `--adv-card-bg:${cardBg};--adv-tag-bg:${tagBg};--adv-tag-color:${tagText};--adv-accent:${accent};--adv-modal-bg:${modalBg};--adv-radius:${radius};`;
}
function galleryCss(minCol, maxW, compact = false, colors) {
  const gap = compact ? 6 : 12;
  return `.advgrid{${advCssVars(colors)}display:grid;grid-template-columns:repeat(auto-fill,minmax(${minCol}px,1fr));gap:${gap}px;max-width:100%}.advgrid .advlb{display:none}.advcell{display:flex;flex-direction:column;cursor:pointer;text-decoration:none;color:inherit;font-family:inherit}.advimg{position:relative;display:block;border-radius:var(--adv-radius);overflow:hidden;background:var(--adv-card-bg)}.advimg img{width:100%;height:auto;display:block}.advimgfix img{height:100%;object-fit:cover}.advtag{position:absolute;background:var(--adv-tag-bg);color:var(--adv-tag-color);font-size:.6rem;padding:2px 4px;border-radius:3px;line-height:1;max-width:85%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.advplay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .15s;background:rgba(0,0,0,.2)}.advplay::before{content:"";border-style:solid;border-width:11px 0 11px 18px;border-color:transparent transparent transparent #fff;filter:drop-shadow(0 1px 2px rgba(0,0,0,.6))}.advcell:hover .advplay{opacity:1}.advcap{font-size:${compact ? ".65rem" : ".72rem"};margin-top:${compact ? 2 : 4}px;line-height:1.25;opacity:.85}.advmodal{display:none;position:fixed;inset:0;z-index:99999;align-items:center;justify-content:center}.advgrid .advlb:checked + .advthumb + .advmodal{display:flex}.advbackdrop{position:absolute;inset:0;background:transparent;cursor:pointer}.advbox{position:relative;z-index:1;display:flex;flex-direction:column;gap:8px;max-width:min(92vw,${maxW}px);background:var(--adv-modal-bg);padding:12px;border-radius:14px;box-shadow:0 16px 48px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.08)}.advvideo{width:100%;max-height:80vh;border-radius:8px;background:#000;display:block;object-fit:contain}.advclose{position:absolute;top:18px;right:18px;width:32px;height:32px;border-radius:50%;background:rgba(0,0,0,.65);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:15px;z-index:2;border:2px solid rgba(255,255,255,.35)}.advinfo{color:#fff;font-size:.8rem;text-align:center}.advinfo a{color:var(--adv-accent)}.advempty{padding:24px;text-align:center;opacity:.7;font-family:inherit}`;
}
function galleryCssJs(minCol, compact = false, colors) {
  const gap = compact ? 6 : 12;
  return `.advroot{${advCssVars(colors)}font-family:inherit;color:inherit}.advbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:10px}.advsearchjs{flex:1 1 160px;min-width:120px;padding:6px 10px;border-radius:8px;border:1px solid rgba(127,127,127,.4);background:rgba(127,127,127,.08);color:inherit;font:inherit}.advtagsjs{display:flex;flex-wrap:wrap;gap:6px}.advtagbtn{padding:4px 10px;border-radius:999px;border:1px solid rgba(127,127,127,.4);background:transparent;color:inherit;cursor:pointer;font:inherit;font-size:.8rem}.advtagbtn.on{background:var(--adv-accent);color:#fff;border-color:var(--adv-accent)}.advgridjs{display:grid;grid-template-columns:repeat(auto-fill,minmax(${minCol}px,1fr));gap:${gap}px}.advcelljs{display:flex;flex-direction:column;cursor:pointer}.advimgjs{position:relative;display:block;border-radius:var(--adv-radius);overflow:hidden;background:var(--adv-card-bg)}.advimgjs img{width:100%;height:auto;display:block}.advimgjs.advimgfix img{height:100%;object-fit:cover}.advtagjs{position:absolute;background:var(--adv-tag-bg);color:var(--adv-tag-color);font-size:.6rem;padding:2px 4px;border-radius:3px;line-height:1;max-width:85%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.advplayjs{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .15s;background:rgba(0,0,0,.2)}.advplayjs::before{content:"";border-style:solid;border-width:11px 0 11px 18px;border-color:transparent transparent transparent #fff;filter:drop-shadow(0 1px 2px rgba(0,0,0,.6))}.advcelljs:hover .advplayjs{opacity:1}.advcapjs{font-size:${compact ? ".65rem" : ".72rem"};margin-top:${compact ? 2 : 4}px;line-height:1.25;opacity:.85}.advemptyjs{padding:24px;text-align:center;opacity:.7}`;
}
const ADV_CLIENT_CODE = `
(function(){
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
var MODAL_CSS='.advmodaljs{display:none;position:fixed;inset:0;z-index:99999;align-items:center;justify-content:center}.advbackdropjs{position:absolute;inset:0;background:transparent;cursor:pointer}.advboxjs{position:relative;z-index:1;display:flex;flex-direction:column;gap:8px;max-width:min(92vw,900px);background:#1c1c1e;padding:12px;border-radius:14px;box-shadow:0 16px 48px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.08)}.advvideojs{width:100%;max-height:80vh;border-radius:8px;background:#000;display:block;object-fit:contain}.advclosejs{position:absolute;top:18px;right:18px;width:32px;height:32px;border-radius:50%;background:rgba(0,0,0,.65);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:15px;z-index:2;border:2px solid rgba(255,255,255,.35)}.advinfojs{color:#fff;font-size:.8rem;text-align:center}';
var modalEl=null,modalVideo=null,modalInfo=null,modalBox=null;
function getModal(){
  if(modalEl&&document.body.contains(modalEl))return modalEl;
  if(!document.getElementById('advmodalcss')){var st=document.createElement('style');st.id='advmodalcss';st.textContent=MODAL_CSS;document.head.appendChild(st);}
  modalEl=document.createElement('div');modalEl.className='advmodaljs';
  var bd=document.createElement('div');bd.className='advbackdropjs';
  modalBox=document.createElement('div');modalBox.className='advboxjs';
  var cl=document.createElement('span');cl.className='advclosejs';cl.textContent='\u2715';
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
  var state={q:'',tag:cfg.default_tag||''};
  var tagset={};
  items.forEach(function(it){String(it.tag||'').split(/[,\\s]+/).forEach(function(t){if(t)tagset[t]=1;});});
  var tags=Object.keys(tagset);
  if(cfg.show_tags&&tags.length){
    var mk=function(label,val){
      var b=document.createElement('button');b.className='advtagbtn';b.textContent=label;b.setAttribute('data-tag',val);
      b.addEventListener('click',function(){state.tag=state.tag===val?'':val;updateTagBtns();render();});
      tagsBox.appendChild(b);
    };
    mk(cfg.labels&&cfg.labels.all||'All','');tags.forEach(function(t){mk(t,t);});
  }
  function updateTagBtns(){var bs=tagsBox.querySelectorAll('.advtagbtn');for(var i=0;i<bs.length;i++)bs[i].classList.toggle('on',bs[i].getAttribute('data-tag')===state.tag);}
  updateTagBtns();
  if(search)search.addEventListener('input',function(){state.q=this.value.toLowerCase();render();});
  function badge(it){if(!(cfg.show_tags&&it.tag))return '';var pos=String(cfg.tag_position||'bottom-left').split('-');return '<span class="advtagjs" style="'+pos[0]+':5px;'+pos[1]+':5px">'+esc(it.tag)+'</span>';}
  function render(){
    var html='';
    if(live){var ar=cfg.live_aspect||'',arStyle=ar?' style="aspect-ratio:'+ar.replace('/',' / ')+'"':'',arCls=ar?' advimgfix':'';
      html+='<div class="advcelljs" data-live="1"><span class="advimgjs'+arCls+'"'+arStyle+'><img loading="lazy" src="'+esc(live.thumb)+'"><span class="advtagjs" style="top:5px;left:5px">&#9679; '+(cfg.labels&&cfg.labels.live||'LIVE')+'</span><span class="advplayjs"></span></span><span class="advcapjs">'+esc(live.name)+'</span></div>';}
    items.forEach(function(it,i){
      if(state.tag&&String(it.tag||'').toLowerCase().indexOf(state.tag.toLowerCase())<0)return;
      if(state.q){var hay=((it.date||'')+' '+(it.time||'')+' '+(it.tag||'')).toLowerCase();if(hay.indexOf(state.q)<0)return;}
      html+='<div class="advcelljs" data-i="'+i+'"><span class="advimgjs"><img loading="lazy" src="'+esc(it.thumb)+'">'+badge(it)+'<span class="advplayjs"></span></span><span class="advcapjs">'+esc(it.date)+' '+esc(it.time)+'<br>'+esc(it.dur)+'s &middot; '+esc(it.size)+' MB</span></div>';
    });
    grid.innerHTML=html||'<div class="advemptyjs">'+(cfg.labels&&cfg.labels.noRecordings||'No recordings')+'</div>';
    var cells=grid.querySelectorAll('.advcelljs');
    for(var k=0;k<cells.length;k++)(function(cell){
      cell.addEventListener('click',function(){
        if(cell.getAttribute('data-live')==='1'){openSrc(live.video,(live.name||'')+' \xB7 Live',cfg.max_modal_width);return;}
        var it=items[parseInt(cell.getAttribute('data-i'),10)],maxW=Number(cfg.max_modal_width)||900;
        if(cfg.player_url){var u=cfg.player_url.replace(/{video}/g,encodeURIComponent(it.video)).replace(/{videoRaw}/g,it.video).replace(/{fn}/g,encodeURIComponent(it.fn||'')).replace(/{date}/g,encodeURIComponent(it.date)).replace(/{time}/g,encodeURIComponent(it.time)).replace(/{duration}/g,encodeURIComponent(it.dur)).replace(/{size}/g,encodeURIComponent(it.size)).replace(/{tags}/g,encodeURIComponent(it.tag));window.open(u,'_blank');}
        else{openSrc(it.video,esc(it.date)+' '+esc(it.time)+(it.dur!=null?' \xB7 '+it.dur+'s':'')+(it.size!=null?' \xB7 '+it.size+' MB':'')+(it.tag?' \xB7 '+it.tag:''),maxW);}
      });
    })(cells[k]);
  }
  render();
}
function scan(){var roots=document.querySelectorAll('.advroot');for(var i=0;i<roots.length;i++)if(!roots[i].__adv){roots[i].__adv=1;initRoot(roots[i]);}}
window.ADVscan=scan;scan();
})();
`.trim();
const ADV_BOOT_IMG = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
function advScriptBootstrap(scriptClass, scanFnName) {
  return `<img alt="" src="${ADV_BOOT_IMG}" style="display:none" onload="(function(){if(window.${scanFnName}){window.${scanFnName}();return;}var c=document.querySelector('script.${scriptClass}');if(!c)return;var s=document.createElement('script');s.textContent=c.textContent;document.body.appendChild(s);})()">`;
}
const ADV_LIVE_REFRESH_CODE = `
(function(){
function initRoot(root){
  if(root.__advLive)return;
  root.__advLive=1;
  var imgs=root.querySelectorAll('.advlivethumb');
  for(var i=0;i<imgs.length;i++)(function(img){
    var base=img.getAttribute('data-base');
    var sec=parseInt(img.getAttribute('data-refresh'),10)||0;
    if(!base||sec<=0)return;
    setInterval(function(){img.src=base+'&ts='+Date.now();},sec*1000);
  })(imgs[i]);
}
function scan(){var roots=document.querySelectorAll('.advgrid');for(var i=0;i<roots.length;i++)initRoot(roots[i]);}
window.ADVLiveScan=scan;scan();
})();
`.trim();
function advLiveRefreshScript() {
  return `<script type="text/plain" class="advlivecode">${ADV_LIVE_REFRESH_CODE}</script>${advScriptBootstrap("advlivecode", "ADVLiveScan")}`;
}
class AgentDvr extends utils.Adapter {
  pollTimer = void 0;
  pollBusy = false;
  _pollStopped = false;
  refreshTimer = void 0;
  authHeader = null;
  baseUrl = "";
  wt = (0, import_widget_i18n.getWidgetLabels)("en");
  ensuredFolders = /* @__PURE__ */ new Set();
  registry = /* @__PURE__ */ new Map();
  ptzActive = /* @__PURE__ */ new Map();
  ptzPresetNames = /* @__PURE__ */ new Map();
  widgetSig = {};
  widgetLastWrite = {};
  // last JSON written to the data states of the web components, to skip unchanged writes
  jsonLastWrite = {};
  profileSig = "";
  lastCamNames = [];
  lastEventFn = {};
  // tags per recent recording — AgentDVR often adds the AI tag (e.g. "people")
  // only after the recording was first listed, so late tags must still pulse
  eventTagsSeen = {};
  // last webhook alert pulse per camera — AgentDVR often calls the action twice per motion
  webhookLast = {};
  webBaseUrl = void 0;
  webBaseTimer = void 0;
  camAspect = {};
  devById = /* @__PURE__ */ new Map();
  eventBusy = {};
  // recordings in the file storage: detected ffmpeg, one save at a time per camera (+ the newest waiting one)
  ffmpeg = void 0;
  ffmpegDetecting = void 0;
  recBusy = {};
  recPending = {};
  audioDropLogged = false;
  noFfmpegLogged = false;
  noLocalPathLogged = false;
  // initial fill of the recording slots runs one camera after the other, after the start cleanup
  recGate = () => {
  };
  recChain = new Promise((resolve) => this.recGate = resolve);
  constructor(options = {}) {
    super({ ...options, name: "agent-dvr" });
    this.on("ready", this.onReady.bind(this));
    this.on("stateChange", this.onStateChange.bind(this));
    this.on("message", this.onMessage.bind(this));
    this.on("unload", this.onUnload.bind(this));
    this.on("objectChange", this.onObjectChange.bind(this));
  }
  // ---- lifecycle ----
  async ensureWebInstance() {
    var _a;
    const instanceId = `system.adapter.${this.namespace}`;
    const obj = await this.getForeignObjectAsync(instanceId);
    if (obj && !((_a = obj.native) == null ? void 0 : _a.webInstance)) {
      await this.extendForeignObjectAsync(instanceId, { native: { webInstance: "*" } });
      this.log.info("webInstance set \u2014 web adapter will reload the extension");
    }
  }
  async onReady() {
    var _a;
    void this.setState("info.connection", false, true);
    await this.ensureWebInstance();
    const sysConfig = await this.getForeignObjectAsync("system.config");
    const rawLang = (_a = sysConfig == null ? void 0 : sysConfig.common) == null ? void 0 : _a.language;
    this.wt = (0, import_widget_i18n.getWidgetLabels)(rawLang != null ? rawLang : "en");
    const pollSeconds = Math.max(5, Math.min(3600, this.config.pollSeconds || 30));
    this.baseUrl = `http://${this.config.serverIp}:${this.config.port || 8090}`;
    if (this.config.user || this.config.pass) {
      this.authHeader = `Basic ${Buffer.from(`${this.config.user}:${this.config.pass}`).toString("base64")}`;
    }
    await this.buildSystem();
    await this.setObjectNotExistsAsync("info.ffmpeg", {
      type: "state",
      common: {
        name: "ffmpeg (version and path)",
        type: "string",
        role: "text",
        read: true,
        write: false,
        def: ""
      },
      native: {}
    });
    void this.runFfmpegDetection();
    try {
      await this.poll();
    } catch (e) {
      this.log.warn(`First poll error: ${e.message}`);
    }
    void this.syncRecordingStorage().catch((e) => this.log.warn(`Recording cleanup: ${e.message}`)).finally(() => this.recGate());
    this.schedulePoll(pollSeconds * 1e3);
    this.subscribeStates("*");
    this.subscribeForeignObjects("system.adapter.web.*");
    this.subscribeForeignObjects("system.host.*");
    this.refreshPhotoUrls().catch((e) => this.log.warn(`Photo URL refresh: ${e.message}`));
    this.log.info(`Agent DVR adapter ready. Polling ${this.baseUrl} every ${pollSeconds}s.`);
  }
  onUnload(callback) {
    try {
      this._pollStopped = true;
      if (this.pollTimer !== void 0) {
        this.clearTimeout(this.pollTimer);
        this.pollTimer = void 0;
      }
      if (this.refreshTimer !== void 0) {
        this.clearTimeout(this.refreshTimer);
        this.refreshTimer = void 0;
      }
    } catch {
    }
    callback();
  }
  onMessage(obj) {
    var _a;
    if (!obj) {
      return;
    }
    if (obj.command === "getGo2rtcStreams") {
      const overrideUrl = typeof obj.message === "object" && obj.message !== null ? obj.message.url : void 0;
      void this.fetchGo2rtcStreams(overrideUrl).then((result) => {
        this.sendTo(obj.from, obj.command, result, obj.callback);
      });
    } else if (obj.command === "getAgentDvrCameras") {
      this.sendTo(obj.from, obj.command, { cameras: this.lastCamNames }, obj.callback);
    } else if (obj.command === "getCameras") {
      const opts = this.lastCamNames.map((c) => ({ value: `${this.namespace}.${c.key}`, label: c.name }));
      this.sendTo(obj.from, obj.command, opts, obj.callback);
    } else if (obj.command === "getWidgets") {
      const msg = (_a = obj.message) != null ? _a : {};
      const kind = msg.kind === "live" ? "live" : "recordings";
      const opts = this.config.enableWidget ? this.lastCamNames.map((c) => ({ value: `${this.namespace}.${c.key}.widget_${kind}`, label: c.name })) : [];
      this.sendTo(obj.from, obj.command, opts, obj.callback);
    } else if (obj.command === "getAvailableSources") {
      void this.fetchAvailableSources().then((result) => {
        this.sendTo(obj.from, obj.command, result, obj.callback);
      });
    } else if (obj.command === "detectFfmpeg") {
      const p = typeof obj.message === "object" && obj.message !== null && typeof obj.message.path === "string" ? obj.message.path : void 0;
      void this.runFfmpegDetection(p).then((info) => {
        if (obj.callback) {
          this.sendTo(obj.from, obj.command, info, obj.callback);
        }
      });
    } else if (obj.command === "sendRecording" || obj.command === "getRecording") {
      const msg = typeof obj.message === "object" && obj.message !== null ? obj.message : {};
      const job = obj.command === "sendRecording" ? this.sendRecording(msg) : this.getRecording(msg);
      void job.catch((e) => ({ ok: false, error: e.message })).then((result) => {
        if (!result.ok) {
          this.log.warn(`${obj.command}: ${result.error}`);
        }
        if (obj.callback) {
          this.sendTo(obj.from, obj.command, (0, import_recording.safeMessage)(result), obj.callback);
        }
      });
    }
  }
  async fetchAvailableSources() {
    const deadline = new Promise(
      (res) => this.setTimeout(() => res({ result: [{ source: "!", name: "Timeout" }] }), 5e3)
    );
    return Promise.race([this._doFetchAvailableSources(), deadline]);
  }
  async _doFetchAvailableSources() {
    const rows = [];
    for (const c of this.lastCamNames) {
      rows.push({ source: "AgentDVR", name: `${c.name} (${c.key})` });
    }
    const { streams } = await this.fetchGo2rtcStreams();
    for (const s of streams) {
      rows.push({ source: "go2rtc", name: s });
    }
    if (!rows.length) {
      rows.push({ source: "\u2014", name: "No sources found (adapter has not polled yet)" });
    }
    return { result: rows };
  }
  fetchGo2rtcStreams(overrideUrl) {
    if (!overrideUrl && !this.config.go2rtcEnabled) {
      return Promise.resolve({ streams: [], error: "go2rtc disabled" });
    }
    const url = (overrideUrl || this.config.go2rtcUrl || "").replace(/^https:\/\//i, "http://");
    if (!url) {
      return Promise.resolve({ streams: [], error: "go2rtcUrl not configured" });
    }
    let target;
    try {
      target = new URL("/api/streams", url);
    } catch {
      return Promise.resolve({ streams: [], error: `Invalid URL: ${url}` });
    }
    let httpReq;
    const fetch = new Promise((resolve) => {
      const mod = target.protocol === "https:" ? https : http;
      httpReq = mod.get(target.toString(), (res) => {
        let body = "";
        res.on("data", (c) => {
          body += c.toString();
        });
        res.on("end", () => {
          try {
            const parsed = JSON.parse(body);
            const streams = Object.keys(parsed || {});
            resolve({
              streams,
              error: streams.length === 0 ? "go2rtc reachable but no streams configured" : void 0
            });
          } catch {
            resolve({
              streams: [],
              error: `Invalid JSON response from go2rtc (HTTP ${res.statusCode})`
            });
          }
        });
        res.on("error", (e) => resolve({ streams: [], error: `Stream error: ${e.message}` }));
      });
      httpReq.on("error", (e) => resolve({ streams: [], error: `Connection error: ${e.message}` }));
    });
    const timeout = new Promise(
      (resolve) => this.setTimeout(() => {
        httpReq == null ? void 0 : httpReq.destroy();
        resolve({ streams: [], error: `Timeout fetching ${target.toString()}` });
      }, 3e3)
    );
    return Promise.race([fetch, timeout]);
  }
  onStateChange(id, state) {
    if (!state || state.ack !== false) {
      return;
    }
    const relId = this.getRelId(id);
    if (relId === "system.webhook") {
      this.onWebhook(state.val).catch((e) => this.log.warn(`Webhook error: ${e.message}`));
      return;
    }
    const entry = this.registry.get(relId);
    if (entry) {
      this.runCommand(relId, entry, state.val).catch(
        (e) => this.log.warn(`Command error: ${e.message}`)
      );
    }
  }
  // ---- helpers ----
  getRelId(fullId) {
    return fullId.startsWith(`${this.namespace}.`) ? fullId.slice(this.namespace.length + 1) : fullId;
  }
  apiGet(path2) {
    return new Promise((resolve) => {
      var _a;
      const rawTimeout = (_a = this.config.httpTimeoutMs) != null ? _a : 8e3;
      const timeout = Math.max(1e3, Math.min(3e4, rawTimeout));
      if (timeout !== rawTimeout) {
        this.log.debug(`httpTimeoutMs ${rawTimeout} clamped to ${timeout} ms`);
      }
      const opts = {
        hostname: this.config.serverIp,
        port: this.config.port || 8090,
        path: path2,
        method: "GET",
        timeout
      };
      if (this.authHeader) {
        opts.headers = { Authorization: this.authHeader };
      }
      try {
        const req = http.request(opts, (res) => {
          let data = "";
          res.on("data", (c) => {
            data += c.toString();
          });
          res.on("end", () => {
            if (res.statusCode && res.statusCode >= 400) {
              resolve({ ok: false, error: `HTTP ${res.statusCode}` });
            } else {
              resolve({ ok: true, data });
            }
          });
          res.on("error", (e) => resolve({ ok: false, error: e.message }));
        });
        req.on("error", (e) => resolve({ ok: false, error: e.message }));
        req.on("timeout", () => {
          req.destroy();
          resolve({ ok: false, error: "timeout" });
        });
        req.end();
      } catch (e) {
        resolve({ ok: false, error: String(e.message || e) });
      }
    });
  }
  apiGetBuffer(path2) {
    return new Promise((resolve) => {
      var _a;
      const rawTimeout = (_a = this.config.httpTimeoutMs) != null ? _a : 8e3;
      const timeout = Math.max(1e3, Math.min(3e4, rawTimeout));
      if (timeout !== rawTimeout) {
        this.log.debug(`httpTimeoutMs ${rawTimeout} clamped to ${timeout} ms`);
      }
      const opts = {
        hostname: this.config.serverIp,
        port: this.config.port || 8090,
        path: path2,
        method: "GET",
        timeout
      };
      if (this.authHeader) {
        opts.headers = { Authorization: this.authHeader };
      }
      try {
        const req = http.request(opts, (res) => {
          const chunks = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => {
            if (res.statusCode && res.statusCode >= 400) {
              resolve({ ok: false, error: `HTTP ${res.statusCode}` });
            } else {
              resolve({ ok: true, data: Buffer.concat(chunks) });
            }
          });
          res.on("error", (e) => resolve({ ok: false, error: e.message }));
        });
        req.on("error", (e) => resolve({ ok: false, error: e.message }));
        req.on("timeout", () => {
          req.destroy();
          resolve({ ok: false, error: "timeout" });
        });
        req.end();
      } catch (e) {
        resolve({ ok: false, error: String(e.message || e) });
      }
    });
  }
  async ensureFolder(id, name, type = "channel") {
    if (this.ensuredFolders.has(id)) {
      return;
    }
    await this.setObjectNotExistsAsync(id, { type, common: { name }, native: {} });
    this.ensuredFolders.add(id);
  }
  async ensurePath(fullId) {
    const parts = fullId.split(".");
    let acc = parts[0];
    for (let i = 1; i < parts.length - 1; i++) {
      acc += `.${parts[i]}`;
      if (!this.ensuredFolders.has(acc)) {
        await this.setObjectNotExistsAsync(acc, { type: "channel", common: { name: parts[i] }, native: {} });
        this.ensuredFolders.add(acc);
      }
    }
  }
  /**
   * Forgets `id` (and, for a deleted folder/channel, every cached child under it) from
   * ensuredFolders. Without this, a dynamically re-discovered entity (a drive that
   * briefly drops out of the API, a camera that reconnects) would skip
   * setObjectNotExistsAsync on its next write - its object was deleted by a prune pass,
   * but the cache still claims it was already created - and setState would then hit a
   * state with no object, surfacing as a controller "no existing object" warning.
   *
   * @param id the object id (or deleted folder/channel id) to forget
   */
  forgetEnsured(id) {
    const prefix = `${id}.`;
    for (const cached of this.ensuredFolders) {
      if (cached === id || cached.startsWith(prefix)) {
        this.ensuredFolders.delete(cached);
      }
    }
  }
  async writeLeaf(id, val, unit) {
    const t = typeof val;
    let common;
    if (t === "boolean") {
      common = { name: id.split(".").pop() || id, type: "boolean", role: "indicator", read: true, write: false };
    } else if (t === "number") {
      common = { name: id.split(".").pop() || id, type: "number", role: "value", read: true, write: false };
      if (unit) {
        common.unit = unit;
      }
    } else {
      const role = typeof val === "string" && /^https?:\/\//i.test(val) ? "text.url" : "text";
      common = { name: id.split(".").pop() || id, type: "string", role, read: true, write: false };
    }
    if (!this.ensuredFolders.has(id)) {
      await this.ensurePath(id);
      await this.setObjectNotExistsAsync(id, { type: "state", common, native: {} });
      this.ensuredFolders.add(id);
    }
    await this.setStateAsync(id, { val: val === void 0 ? null : val, ack: true });
  }
  async flattenWrite(obj, prefix, depth) {
    const maxDepth = Math.max(1, Math.min(10, this.config.maxDepth || 6));
    const maxArray = Math.max(1, Math.min(500, this.config.maxArray || 30));
    if (depth > maxDepth) {
      return;
    }
    if (obj === null || obj === void 0) {
      await this.writeLeaf(prefix, obj);
      return;
    }
    if (typeof obj === "object") {
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
          await this.flattenWrite(obj[k], `${prefix}.${sanitize(k)}`, depth + 1);
        }
      }
    } else {
      await this.writeLeaf(prefix, obj);
    }
  }
  async ensureControl(id, name, entry, role) {
    if (!this.ensuredFolders.has(id)) {
      await this.ensurePath(id);
      await this.setObjectNotExistsAsync(id, {
        type: "state",
        common: { name, type: "boolean", role, read: role === "switch", write: true, def: false },
        native: {}
      });
      await this.setStateAsync(id, { val: false, ack: true });
      this.ensuredFolders.add(id);
    }
    this.registry.set(id, entry);
  }
  ensureButton(id, name, entry) {
    return this.ensureControl(id, name, entry, "button");
  }
  async ensureLevel(id, name, entry, min, max) {
    if (!this.ensuredFolders.has(id)) {
      await this.ensurePath(id);
      await this.setObjectNotExistsAsync(id, {
        type: "state",
        common: { name, type: "number", role: "level", read: true, write: true, min, max },
        native: {}
      });
      await this.setStateAsync(id, { val: 0, ack: true });
      this.ensuredFolders.add(id);
    }
    this.registry.set(id, entry);
  }
  async ensureSelector(id, name, entry, states) {
    if (!this.ensuredFolders.has(id)) {
      await this.ensurePath(id);
      await this.setObjectNotExistsAsync(id, {
        type: "state",
        common: { name, type: "number", role: "level", read: true, write: true, states },
        native: {}
      });
      await this.setStateAsync(id, { val: 0, ack: true });
      this.ensuredFolders.add(id);
    }
    this.registry.set(id, entry);
  }
  async fetchSnapshotB64(oid, snapId) {
    const imgRes = await this.apiGetBuffer(`/photo.jpg?oid=${oid}`);
    if (imgRes.ok && imgRes.data) {
      await this.setStateAsync(snapId, {
        val: `data:image/jpeg;base64,${imgRes.data.toString("base64")}`,
        ack: true
      });
    }
  }
  async ensureFlag(id, name) {
    if (this.ensuredFolders.has(id)) {
      return;
    }
    await this.ensurePath(id);
    await this.setObjectNotExistsAsync(id, {
      type: "state",
      common: { name, type: "boolean", role: "indicator", read: true, write: false, def: false },
      native: {}
    });
    this.ensuredFolders.add(id);
    await this.setStateAsync(id, { val: false, ack: true });
  }
  async pulse(id) {
    await this.setStateAsync(id, { val: true, ack: true });
    this.setTimeout(() => this.setStateAsync(id, { val: false, ack: true }).catch(() => {
    }), 1500);
  }
  // ---- system structure ----
  async buildSystem() {
    await this.ensureFolder("system", "System", "channel");
    await this.writeLeaf("system.online", false);
    await this.writeLeaf("system.lastUpdate", "");
    await this.writeLeaf("system.lastPoll", 0);
    await this.writeLeaf("system.cameraCount", 0);
    if (!this.ensuredFolders.has("system.webhook")) {
      await this.setObjectNotExistsAsync("system.webhook", {
        type: "state",
        common: {
          name: "Last webhook call (JSON)",
          type: "string",
          role: "json",
          read: true,
          write: true
        },
        native: {}
      });
      this.ensuredFolders.add("system.webhook");
    }
    if (this.config.enableSystemControls) {
      await this.ensureFolder("system.control", "Control", "channel");
      for (const c of SYS_COMMANDS) {
        await this.ensureButton(`system.control.${c.id}`, c.name, { kind: "sys", path: c.path });
      }
      await this.ensureFolder("system.profile", "Profile", "channel");
      await this.ensureSelector(
        "system.profile.selector",
        "Active profile",
        { kind: "setProfile" },
        { 0: "Home", 1: "Away", 2: "Night" }
      );
      if (!this.ensuredFolders.has("system.profile.list")) {
        await this.setObjectNotExistsAsync("system.profile.list", {
          type: "state",
          common: {
            name: "Available profiles (JSON)",
            type: "string",
            role: "json",
            read: true,
            write: false
          },
          native: {}
        });
        this.ensuredFolders.add("system.profile.list");
        await this.setStateAsync("system.profile.list", { val: "[]", ack: true });
      }
    }
  }
  // ---- camera aspect detection ----
  async detectAspect(d) {
    if (this.camAspect[d.oid] !== void 0) {
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
    this.camAspect[d.oid] = wh ? `${wh[0]}/${wh[1]}` : "";
    if (wh) {
      this.log.debug(`cam ${d.oid} resolution ${wh[0]}x${wh[1]} -> AR ${this.camAspect[d.oid]}`);
    }
  }
  // ---- webhook ----
  // Written by the web extension (lib/web.js) when AgentDVR calls the webhook with ?oid={ID}.
  // Pulses <cam>.events.webhook right away — before the poll — so scripts can grab a photo
  // at the moment of the alert, then refreshes all data.
  async onWebhook(val) {
    var _a, _b, _c;
    let q = {};
    try {
      q = JSON.parse(String(val != null ? val : "{}"));
    } catch {
    }
    await this.setStateAsync("system.webhook", { val: String(val != null ? val : ""), ack: true });
    const oid = `${(_a = q.oid) != null ? _a : ""}`;
    const ot = `${(_b = q.ot) != null ? _b : "2"}`;
    const dev = [...this.devById.values()].find((d) => String(d.oid) === oid && String(d.ot) === ot);
    if (dev) {
      const fid = this.deviceFolder(dev);
      const key = `${ot}_${oid}`;
      const paramsId = `${fid}.events.webhookParams`;
      if (!this.ensuredFolders.has(paramsId)) {
        await this.ensurePath(paramsId);
        await this.setObjectNotExistsAsync(paramsId, {
          type: "state",
          common: {
            name: "Webhook parameters (JSON)",
            type: "string",
            role: "json",
            read: true,
            write: false
          },
          native: {}
        });
        this.ensuredFolders.add(paramsId);
      }
      await this.setStateAsync(paramsId, { val: JSON.stringify(q), ack: true });
      const cooldownMs = 2e4;
      if (Date.now() - ((_c = this.webhookLast[key]) != null ? _c : 0) >= cooldownMs) {
        this.webhookLast[key] = Date.now();
        await this.ensureFlag(`${fid}.events.webhook`, "Webhook alert (AgentDVR action)");
        await this.pulse(`${fid}.events.webhook`);
        this.log.debug(`Webhook alert cam ${oid} \u2192 ${fid}.events.webhook`);
        if (this.config.enableAlertPhotos !== false && dev.ot === 2) {
          this.saveAlertPhoto(dev.oid, fid).catch(
            (e) => this.log.warn(`Alert photo cam ${oid}: ${e.message}`)
          );
        }
      } else {
        this.log.debug(`Webhook alert cam ${oid} ignored (cooldown)`);
      }
    } else if (oid) {
      this.log.debug(`Webhook: no device with oid ${oid} / ot ${ot}`);
    }
    if (this.pollBusy) {
      this.scheduleRefresh();
    } else {
      await this.poll().catch((e) => this.log.warn(`Webhook refresh error: ${e.message}`));
    }
  }
  // Keeps the last 3 alert photos per camera in the file storage (<namespace>/<fid>/grab1..3.jpg,
  // grab1 = newest). ts1 is written last, so it is a safe trigger: the file is complete by then.
  async ensureAlertPhotoObjects(ch) {
    if (this.ensuredFolders.has(ch)) {
      return;
    }
    await this.ensureFolder(ch, "Alert photos", "channel");
    for (let i = 1; i <= 3; i++) {
      await this.setObjectNotExistsAsync(`${ch}.grab${i}`, {
        type: "state",
        common: {
          name: `Alert photo ${i} (file path)`,
          type: "string",
          role: "text",
          read: true,
          write: false
        },
        native: {}
      });
      await this.setObjectNotExistsAsync(`${ch}.uri${i}`, {
        type: "state",
        common: {
          name: `Alert photo ${i} (iobfile URI)`,
          type: "string",
          role: "text",
          read: true,
          write: false
        },
        native: {}
      });
      await this.setObjectNotExistsAsync(`${ch}.url${i}`, {
        type: "state",
        common: {
          name: `Alert photo ${i} (http URL)`,
          type: "string",
          role: "text.url",
          read: true,
          write: false
        },
        native: {}
      });
      await this.setObjectNotExistsAsync(`${ch}.ts${i}`, {
        type: "state",
        common: {
          name: `Alert photo ${i} (time)`,
          type: "number",
          role: "value.time",
          read: true,
          write: false
        },
        native: {}
      });
    }
    this.ensuredFolders.add(ch);
  }
  async saveAlertPhoto(oid, fid) {
    var _a, _b;
    const img = await this.apiGetBuffer(`/photo.jpg?oid=${oid}`);
    if (!img.ok || !img.data) {
      this.log.warn(`Alert photo cam ${oid} not fetched: ${(_a = img.error) != null ? _a : "empty response"}`);
      return;
    }
    const ch = `${fid}.alertPhotos`;
    await this.ensureFileMeta();
    await this.ensureAlertPhotoObjects(ch);
    for (let i = 2; i >= 1; i--) {
      try {
        const prev = await this.readFileAsync(this.namespace, `${fid}/grab${i}.jpg`);
        await this.writeFileAsync(this.namespace, `${fid}/grab${i + 1}.jpg`, prev.file);
        const ts = await this.getStateAsync(`${ch}.ts${i}`);
        await this.setStateAsync(`${ch}.ts${i + 1}`, { val: (_b = ts == null ? void 0 : ts.val) != null ? _b : null, ack: true });
        await this.setStateAsync(`${ch}.grab${i + 1}`, { val: this.alertPhotoPath(fid, i + 1), ack: true });
        await this.setStateAsync(`${ch}.uri${i + 1}`, { val: this.alertPhotoUri(fid, i + 1), ack: true });
        await this.setStateAsync(`${ch}.url${i + 1}`, { val: await this.alertPhotoUrl(fid, i + 1), ack: true });
      } catch {
      }
    }
    await this.writeFileAsync(this.namespace, `${fid}/grab1.jpg`, img.data);
    await this.setStateAsync(`${ch}.grab1`, { val: this.alertPhotoPath(fid, 1), ack: true });
    await this.setStateAsync(`${ch}.uri1`, { val: this.alertPhotoUri(fid, 1), ack: true });
    await this.setStateAsync(`${ch}.url1`, { val: await this.alertPhotoUrl(fid, 1), ack: true });
    await this.setStateAsync(`${ch}.ts1`, { val: Date.now(), ack: true });
    this.log.debug(`Alert photo cam ${oid} saved (${img.data.length} bytes)`);
  }
  onObjectChange(id) {
    if (!/^system\.adapter\.web\.\d+$/.test(id) && !id.startsWith("system.host.")) {
      return;
    }
    if (this.webBaseTimer !== void 0) {
      this.clearTimeout(this.webBaseTimer);
    }
    this.webBaseTimer = this.setTimeout(() => {
      this.webBaseTimer = void 0;
      this.refreshPhotoUrls().catch((e) => this.log.warn(`Photo URL refresh: ${e.message}`));
    }, 2e3);
  }
  // Recomputes the web base URL and rewrites url1..3 of every camera that already has alert photos.
  async refreshPhotoUrls() {
    const base = await this.findWebBaseUrl();
    if (base === this.webBaseUrl) {
      return;
    }
    this.log.info(`Alert photo links now use ${base || "(no web instance)"}`);
    this.webBaseUrl = base;
    for (const dev of this.devById.values()) {
      const fid = this.deviceFolder(dev);
      if (!await this.getObjectAsync(`${fid}.alertPhotos`)) {
        continue;
      }
      await this.ensureAlertPhotoObjects(`${fid}.alertPhotos`);
      for (let n = 1; n <= 3; n++) {
        await this.setStateAsync(`${fid}.alertPhotos.url${n}`, {
          val: await this.alertPhotoUrl(fid, n),
          ack: true
        });
      }
    }
    await this.refreshRecordingUrls();
  }
  // http(s) URL of a stored alert photo via the web extension, for apps that only accept web links
  async alertPhotoUrl(fid, n) {
    if (this.webBaseUrl === void 0) {
      this.webBaseUrl = await this.findWebBaseUrl();
    }
    return this.webBaseUrl ? `${this.webBaseUrl}/${this.namespace}/photos/${fid}/grab${n}.jpg` : "";
  }
  // Base URL of the web instance that serves this adapter's extension — prefers plain http,
  // since TV and kiosk apps often reject self-signed certificates.
  async findWebBaseUrl() {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j;
    try {
      const view = await this.getObjectViewAsync("system", "instance", {
        startkey: "system.adapter.web.",
        endkey: "system.adapter.web.\u9999"
      });
      const own = await this.getForeignObjectAsync(`system.adapter.${this.namespace}`);
      const loadedBy = String((_b = (_a = own == null ? void 0 : own.native) == null ? void 0 : _a.webInstance) != null ? _b : "*");
      const chosen = this.config.photoWebInstance || "";
      const webs = view.rows.map((r) => r.value).filter((o) => {
        var _a2;
        return ((_a2 = o == null ? void 0 : o.common) == null ? void 0 : _a2.enabled) && (loadedBy === "*" || o._id === `system.adapter.${loadedBy}`);
      }).filter((o) => !chosen || o._id === `system.adapter.${chosen}`).sort((a, b) => {
        var _a2, _b2;
        return Number(!!((_a2 = a.native) == null ? void 0 : _a2.secure)) - Number(!!((_b2 = b.native) == null ? void 0 : _b2.secure));
      });
      const web = webs[0];
      if (!web) {
        return "";
      }
      let host = String((_d = (_c = web.native) == null ? void 0 : _c.bind) != null ? _d : "");
      if (!host || host === "0.0.0.0" || host === "::") {
        const hostObj = await this.getForeignObjectAsync(`system.host.${web.common.host}`);
        const addrs = ((_f = (_e = hostObj == null ? void 0 : hostObj.common) == null ? void 0 : _e.address) != null ? _f : []).filter(
          (a) => /^\d+\.\d+\.\d+\.\d+$/.test(a) && !a.startsWith("127.")
        );
        host = (_g = addrs[0]) != null ? _g : "";
      }
      if (!host) {
        return "";
      }
      const proto = ((_h = web.native) == null ? void 0 : _h.secure) ? "https" : "http";
      return `${proto}://${host}:${(_j = (_i = web.native) == null ? void 0 : _i.port) != null ? _j : 8082}`;
    } catch (e) {
      this.log.debug(`Web base URL not found: ${e.message}`);
      return "";
    }
  }
  // ioBroker file URI of a stored alert photo — resolved by telegram >= 6 directly from the file storage
  alertPhotoUri(fid, n) {
    return `iobfile://${this.namespace}/${fid}/grab${n}.jpg`;
  }
  // Absolute path of a stored alert photo, for consumers that need a local file (e.g. telegram).
  // Only valid when the file storage lives on this host's disk (default jsonl/file DB).
  alertPhotoPath(fid, n) {
    return path.join(utils.getAbsoluteDefaultDataDir(), "files", this.namespace, fid, `grab${n}.jpg`);
  }
  // ---- recordings in the file storage + sendRecording / getRecording ----
  // Detects ffmpeg (configured path → PATH → common locations) and writes info.ffmpeg.
  // Concurrent calls share one run.
  runFfmpegDetection(configPath) {
    var _a;
    if (this.ffmpegDetecting && configPath === void 0) {
      return this.ffmpegDetecting;
    }
    const cfg = (_a = configPath != null ? configPath : this.config.ffmpegPath) != null ? _a : "";
    const run = (0, import_recording.detectFfmpeg)((0, import_recording.ffmpegCandidates)(cfg, process.platform)).catch(() => ({ found: false, version: "", path: "" })).then(async (found) => {
      const info = found.found ? { ...found, path: (0, import_recording.resolveOnPath)(found.path, process.platform) } : found;
      this.ffmpeg = info;
      this.noFfmpegLogged = false;
      if (info.found) {
        this.log.info(`ffmpeg ${info.version} found (${info.path})`);
      } else {
        this.log.debug("ffmpeg not found");
      }
      await this.setStateAsync("info.ffmpeg", { val: (0, import_recording.ffmpegStatusText)(info), ack: true }).catch(() => {
      });
      return info;
    }).finally(() => {
      if (this.ffmpegDetecting === run) {
        this.ffmpegDetecting = void 0;
      }
    });
    this.ffmpegDetecting = run;
    return run;
  }
  recordingCamEnabled(fid) {
    if (!this.config.enableRecordingFiles) {
      return false;
    }
    const sel = Array.isArray(this.config.recordingFileCams) ? this.config.recordingFileCams : [];
    return sel.length === 0 || sel.includes(fid);
  }
  recordingTimeoutMs() {
    return (0, import_recording.clampNumber)(this.config.recordingTimeoutSec, 120, 10, 900) * 1e3;
  }
  // One save per camera at a time; a recording arriving meanwhile waits (only the newest one).
  queueRecordingSave(d, fid, ev) {
    if (this.recBusy[fid]) {
      this.recPending[fid] = { d, ev };
      return Promise.resolve();
    }
    this.recBusy[fid] = true;
    return (async () => {
      let job = { d, ev };
      while (job && !this._pollStopped) {
        try {
          await this.saveRecording(job.d, fid, job.ev);
        } catch (e) {
          this.log.warn(`Recording file ${fid}: ${e.message}`);
        }
        job = this.recPending[fid];
        delete this.recPending[fid];
      }
      this.recBusy[fid] = false;
    })();
  }
  // AgentDVR lists a recording while it is still being written: waits until the camera stops recording
  // and the listed size stays the same between two checks (at most 10 minutes). false = adapter stops
  // or the recording disappeared.
  async waitRecordingFinished(oid, fn) {
    var _a;
    const deadline = Date.now() + 10 * 6e4;
    let prev = -1;
    let waited = false;
    while (!this._pollStopped) {
      const res = await this.apiGet(`/q/getEvents?oid=${encodeURIComponent(String(oid))}&ot=2`);
      const json = asJson(res.data);
      const events = Array.isArray(json == null ? void 0 : json.events) ? json.events : Array.isArray(json) ? json : [];
      const ev = res.ok && json ? events.find((e) => e.fn === fn) : void 0;
      if (res.ok && json && !ev) {
        this.log.debug(`Recording ${fn} no longer listed`);
        return false;
      }
      const size = Number((_a = ev == null ? void 0 : ev.sb) != null ? _a : 0);
      const dev = [...this.devById.values()].find((x) => x.ot === 2 && String(x.oid) === String(oid));
      const data = dev == null ? void 0 : dev.raw.data;
      const recording = (data == null ? void 0 : data.recording) === true;
      if ((0, import_recording.recordingFinished)(prev, size, recording)) {
        if (waited) {
          this.log.debug(`Recording ${fn} finished (${(0, import_recording.fmtMb)(size)})`);
        }
        return true;
      }
      if (Date.now() > deadline) {
        this.log.info(`Recording ${fn} still growing after 10 minutes, storing the current state`);
        return true;
      }
      prev = size;
      waited = true;
      await this.delay(4e3);
    }
    return false;
  }
  // Downloads a recording from AgentDVR into memory (never to disk), with size limit and timeout.
  fetchRecording(oid, fn, maxBytes) {
    return (0, import_recording.downloadToBuffer)(
      {
        hostname: this.config.serverIp,
        port: this.config.port || 8090,
        path: `/streamFile.cgi?oid=${encodeURIComponent(String(oid))}&ot=2&fn=${encodeURIComponent(fn)}`,
        headers: this.authHeader ? { Authorization: this.authHeader } : void 0
      },
      maxBytes,
      this.recordingTimeoutMs()
    );
  }
  // Remuxes to MP4 if wanted and possible; otherwise (or on failure) the data is returned unchanged.
  async toWantedFormat(data, srcExt, wantMp4, maxBytes) {
    var _a;
    if (!wantMp4 || srcExt === "mp4") {
      return { data, ext: srcExt };
    }
    const ff = (_a = this.ffmpeg) != null ? _a : await this.runFfmpegDetection();
    if (!ff.found) {
      if (!this.noFfmpegLogged) {
        this.noFfmpegLogged = true;
        this.log.info("ffmpeg not found \u2014 recordings are provided as MKV (install ffmpeg for MP4)");
      }
      return { data, ext: srcExt };
    }
    try {
      const mp4 = await (0, import_recording.remuxToMp4)(ff.path, data, this.recordingTimeoutMs(), maxBytes, (reason) => {
        if (!this.audioDropLogged) {
          this.audioDropLogged = true;
          this.log.info(
            `Audio track does not fit into MP4, recordings are remuxed without audio (${reason})`
          );
        }
      });
      return { data: mp4, ext: "mp4" };
    } catch (e) {
      this.log.warn(`MP4 remux failed, keeping ${srcExt.toUpperCase()}: ${e.message}`);
      return { data, ext: srcExt };
    }
  }
  async ensureFileMeta() {
    if (this.ensuredFolders.has(this.namespace)) {
      return;
    }
    await this.setForeignObjectNotExistsAsync(this.namespace, {
      type: "meta",
      common: { name: "Alert photos", type: "meta.user" },
      native: {}
    });
    this.ensuredFolders.add(this.namespace);
  }
  async ensureRecordingObjects(ch, count) {
    const key = `${ch}#${count}`;
    if (this.ensuredFolders.has(key)) {
      return;
    }
    await this.ensureFolder(ch, "Recordings", "channel");
    const defs = [
      { id: "file", name: "file path", type: "string", role: "text" },
      { id: "uri", name: "iobfile URI", type: "string", role: "text" },
      { id: "url", name: "http URL", type: "string", role: "text.url" },
      { id: "name", name: "AgentDVR file name", type: "string", role: "text" },
      { id: "ts", name: "time", type: "number", role: "value.time" }
    ];
    for (let i = 1; i <= count; i++) {
      for (const def of defs) {
        await this.setObjectNotExistsAsync(`${ch}.${def.id}${i}`, {
          type: "state",
          common: {
            name: `Recording ${i} (${def.name})`,
            type: def.type,
            role: def.role,
            read: true,
            write: false
          },
          native: {}
        });
      }
    }
    this.ensuredFolders.add(key);
  }
  // Extension of the file stored in a slot, or '' if the slot is empty.
  async slotExt(fid, slot) {
    for (const ext of ["mp4", "mkv"]) {
      if (await this.fileExistsAsync(this.namespace, (0, import_recording.recordingStoragePath)(fid, slot, ext)).catch(() => false)) {
        return ext;
      }
    }
    return "";
  }
  async deleteSlotFiles(fid, slot) {
    for (const ext of ["mp4", "mkv"]) {
      const p = (0, import_recording.recordingStoragePath)(fid, slot, ext);
      if (await this.fileExistsAsync(this.namespace, p).catch(() => false)) {
        await this.delFileAsync(this.namespace, p).catch(() => {
        });
      }
    }
  }
  // Local path only if the file storage is on this host's disk (file/jsonl objects DB), else ''.
  recordingLocalPath(fid, slot, ext) {
    const abs = (0, import_recording.recordingAbsPath)(utils.getAbsoluteDefaultDataDir(), this.namespace, fid, slot, ext);
    if (fs.existsSync(abs)) {
      return abs;
    }
    if (!this.noLocalPathLogged) {
      this.noLocalPathLogged = true;
      this.log.info(
        "Recording files are not on the local disk (non-file objects DB) \u2014 recordings.file* stay empty, use uri*"
      );
    }
    return "";
  }
  async writeSlotStates(fid, slot, ext, name, ts) {
    const ch = `${fid}.recordings`;
    await this.setStateAsync(`${ch}.file${slot}`, { val: this.recordingLocalPath(fid, slot, ext), ack: true });
    await this.setStateAsync(`${ch}.uri${slot}`, { val: (0, import_recording.recordingUri)(this.namespace, fid, slot, ext), ack: true });
    await this.setStateAsync(`${ch}.url${slot}`, { val: await this.recordingWebUrl(fid, slot, ext), ack: true });
    await this.setStateAsync(`${ch}.name${slot}`, { val: name, ack: true });
    await this.setStateAsync(`${ch}.ts${slot}`, { val: ts != null ? ts : null, ack: true });
  }
  async recordingWebUrl(fid, slot, ext) {
    if (this.webBaseUrl === void 0) {
      this.webBaseUrl = await this.findWebBaseUrl();
    }
    return (0, import_recording.recordingUrl)(this.webBaseUrl, this.namespace, fid, slot, ext);
  }
  // Keeps the last N recordings per camera in the file storage (<namespace>/<fid>/rec1..N.mp4|mkv,
  // rec1 = newest), like the alert photos. ts1 is written last: the file is complete by then.
  async saveRecording(d, fid, ev) {
    var _a, _b, _c, _d, _e;
    const fn = (_a = ev.fn) != null ? _a : "";
    if (!fn) {
      return;
    }
    const maxBytes = (0, import_recording.maxRecordingBytes)(this.config.recordingMaxSizeMb);
    const listed = Number((_b = ev.sb) != null ? _b : 0);
    if ((0, import_recording.exceedsLimit)(listed, maxBytes)) {
      this.log.info(`Recording ${fn} (${(0, import_recording.fmtMb)(listed)}) not stored: larger than ${(0, import_recording.fmtMb)(maxBytes)}`);
      return;
    }
    if (!await this.waitRecordingFinished(d.oid, fn)) {
      return;
    }
    const dl = await this.fetchRecording(d.oid, fn, maxBytes);
    if (!dl.ok || !dl.data) {
      if (dl.tooLarge) {
        this.log.info(`Recording ${fn} not stored: ${dl.error}`);
      } else {
        this.log.warn(`Recording ${fn} not downloaded: ${(_c = dl.error) != null ? _c : "empty response"}`);
      }
      return;
    }
    const out = await this.toWantedFormat(dl.data, (0, import_recording.extOf)(fn), this.config.recordingMp4 !== false, maxBytes);
    if ((0, import_recording.exceedsLimit)(out.data.length, maxBytes)) {
      this.log.info(`Recording ${fn} (${(0, import_recording.fmtMb)(out.data.length)}) not stored: larger than ${(0, import_recording.fmtMb)(maxBytes)}`);
      return;
    }
    const count = (0, import_recording.recordingSlots)(this.config.recordingFileCount);
    const ch = `${fid}.recordings`;
    await this.ensureFileMeta();
    await this.ensureRecordingObjects(ch, count);
    for (let i = count - 1; i >= 1; i--) {
      const ext = await this.slotExt(fid, i);
      if (!ext) {
        continue;
      }
      await this.deleteSlotFiles(fid, i + 1);
      const from = (0, import_recording.recordingStoragePath)(fid, i, ext);
      const to = (0, import_recording.recordingStoragePath)(fid, i + 1, ext);
      try {
        await this.renameAsync(this.namespace, from, to);
      } catch {
        const prev = await this.readFileAsync(this.namespace, from);
        await this.writeFileAsync(this.namespace, to, prev.file);
        await this.delFileAsync(this.namespace, from).catch(() => {
        });
      }
      const name = await this.getStateAsync(`${ch}.name${i}`);
      const ts = await this.getStateAsync(`${ch}.ts${i}`);
      await this.writeSlotStates(fid, i + 1, ext, String((_d = name == null ? void 0 : name.val) != null ? _d : ""), ts == null ? void 0 : ts.val);
    }
    await this.deleteSlotFiles(fid, 1);
    await this.writeFileAsync(this.namespace, (0, import_recording.recordingStoragePath)(fid, 1, out.ext), out.data);
    const tsMs = (parseFloat(String((_e = ev.c) != null ? _e : 0)) - 621355968e9) / 1e4;
    await this.writeSlotStates(
      fid,
      1,
      out.ext,
      fn,
      Number.isFinite(tsMs) && tsMs > 0 ? Math.round(tsMs) : Date.now()
    );
    await this.pruneRecordingSlots(fid, count);
    this.log.debug(
      `Recording ${fn} stored as ${(0, import_recording.recordingStoragePath)(fid, 1, out.ext)} (${(0, import_recording.fmtMb)(out.data.length)})`
    );
  }
  // Removes files and states of the slots above the configured number.
  async pruneRecordingSlots(fid, count) {
    const ch = `${fid}.recordings`;
    for (let i = count + 1; i <= 3; i++) {
      await this.deleteSlotFiles(fid, i);
      for (const id of ["file", "uri", "url", "name", "ts"]) {
        if (await this.getObjectAsync(`${ch}.${id}${i}`)) {
          await this.delObjectAsync(`${ch}.${id}${i}`).catch(() => {
          });
        }
      }
    }
    for (let c = count + 1; c <= 3; c++) {
      this.ensuredFolders.delete(`${ch}#${c}`);
    }
  }
  // Start: cameras that are switched off or deselected lose their recordings (states and files),
  // the others lose the slots above the configured number.
  async syncRecordingStorage() {
    const count = (0, import_recording.recordingSlots)(this.config.recordingFileCount);
    for (const dev of this.devById.values()) {
      if (dev.ot !== 2) {
        continue;
      }
      const fid = this.deviceFolder(dev);
      if (this.recordingCamEnabled(fid)) {
        if (await this.getObjectAsync(`${fid}.recordings`)) {
          await this.pruneRecordingSlots(fid, count);
        }
      } else {
        await this.cleanupCameraRecordings(fid);
      }
    }
  }
  // Removes <cam>.recordings (recursive) and the files rec1..3.* and send.* of a camera.
  async cleanupCameraRecordings(fid) {
    let removed = 0;
    for (const name of (0, import_recording.cameraRecordingFiles)()) {
      const p = `${fid}/${name}`;
      if (await this.fileExistsAsync(this.namespace, p).catch(() => false)) {
        await this.delFileAsync(this.namespace, p).catch(() => {
        });
        removed++;
      }
    }
    const ch = `${fid}.recordings`;
    if (await this.getObjectAsync(ch)) {
      await this.delObjectAsync(ch, { recursive: true });
      removed++;
    }
    this.forgetEnsured(ch);
    for (let c = 1; c <= 3; c++) {
      this.ensuredFolders.delete(`${ch}#${c}`);
    }
    if (removed) {
      this.log.info(`Recordings of ${fid} removed (option off or camera not selected)`);
    }
  }
  // Removes a folder in the file storage recursively (recordings, send file, alert photos of a camera).
  async deleteStorageFolder(dir) {
    const entries = await this.readDirAsync(this.namespace, dir).catch(() => []);
    for (const e of entries) {
      const p = `${dir}/${e.file}`;
      if (e.isDir) {
        await this.deleteStorageFolder(p);
      } else {
        await this.delFileAsync(this.namespace, p).catch(() => {
        });
      }
    }
    await this.delFileAsync(this.namespace, dir).catch(() => {
    });
  }
  // Stores the current last recording if slot 1 is empty or holds an older one. Runs in a chain,
  // one camera after the other, and only after the start cleanup.
  queueInitialFill(d, fid, ev) {
    this.recChain = this.recChain.then(async () => {
      if (this._pollStopped || !this.recordingCamEnabled(fid) || this.recBusy[fid] || !ev.fn) {
        return;
      }
      try {
        const name1 = await this.getStateAsync(`${fid}.recordings.name1`).catch(() => null);
        const slot1 = await this.slotExt(fid, 1);
        if (!(0, import_recording.needsInitialFill)(!!slot1, name1 == null ? void 0 : name1.val, ev.fn)) {
          return;
        }
        this.log.debug(`Initial fill ${fid}: ${ev.fn}`);
        await this.queueRecordingSave(d, fid, ev);
      } catch (e) {
        this.log.warn(`Initial recording ${fid}: ${e.message}`);
      }
    });
  }
  // Rewrites url1..N after a change of the web instance.
  async refreshRecordingUrls() {
    for (const dev of this.devById.values()) {
      const fid = this.deviceFolder(dev);
      if (!await this.getObjectAsync(`${fid}.recordings`)) {
        continue;
      }
      for (let n = 1; n <= 3; n++) {
        const uri = await this.getStateAsync(`${fid}.recordings.uri${n}`).catch(() => null);
        if (!(uri == null ? void 0 : uri.val)) {
          continue;
        }
        await this.setStateAsync(`${fid}.recordings.url${n}`, {
          val: await this.recordingWebUrl(fid, n, (0, import_recording.extOf)(String(uri.val))),
          ack: true
        });
      }
    }
  }
  // Makes a recording available in the adapter's file storage for sendRecording/getRecording and
  // returns where it is. Never returns the data itself: video must not travel over the message bus
  // (a 46 MB Buffer in a sendTo answer blocked the whole states DB).
  // 'last' (newest in AgentDVR), slot 1..3 or an AgentDVR file name. A recording that is already in
  // a stored slot is used directly; otherwise it is downloaded into memory, remuxed if wanted and
  // written to the fixed per-camera file <cam>/send.mp4|mkv (overwritten each time).
  async provideRecording(msg, limitBytes, limitName) {
    var _a, _b, _c, _d;
    const cams = [...this.devById.values()].filter((d) => d.ot === 2).map((d) => ({ oid: d.oid, name: d.name, fid: this.deviceFolder(d) }));
    const cam = (0, import_recording.findCamera)(msg.camera, cams);
    if (!cam) {
      return { ok: false, error: `Unknown camera "${JSON.stringify((_a = msg.camera) != null ? _a : "")}"` };
    }
    const wantMp4 = typeof msg.mp4 === "boolean" ? msg.mp4 : this.config.recordingMp4 !== false;
    const rawRec = msg.recording;
    const rec = typeof rawRec === "number" ? String(rawRec) : typeof rawRec === "string" && rawRec ? rawRec : "last";
    let slot = 0;
    let fn = "";
    let listedSize = 0;
    if (/^\d+$/.test(rec)) {
      slot = Number(rec);
      if (slot < 1 || slot > 3) {
        return { ok: false, error: `Invalid recording slot ${rec} (1-3)` };
      }
    } else {
      if (rec !== "last" && !(0, import_recording.isValidRecordingName)(rec)) {
        return { ok: false, error: `Invalid recording "${rec}" (use 'last', 1-3 or an AgentDVR file name)` };
      }
      const evRes = await this.apiGet(`/q/getEvents?oid=${encodeURIComponent(String(cam.oid))}&ot=2`);
      const evJson = asJson(evRes.data);
      const events = Array.isArray(evJson == null ? void 0 : evJson.events) ? evJson.events : Array.isArray(evJson) ? evJson : [];
      const ev = rec === "last" ? events[0] : events.find((e) => e.fn === rec);
      fn = rec === "last" ? (_b = ev == null ? void 0 : ev.fn) != null ? _b : "" : rec;
      if (!fn) {
        return { ok: false, error: `No recording found for ${cam.fid}${evRes.ok ? "" : ` (${evRes.error})`}` };
      }
      listedSize = Number((_c = ev == null ? void 0 : ev.sb) != null ? _c : 0);
      for (let i = 1; i <= 3; i++) {
        const name = await this.getStateAsync(`${cam.fid}.recordings.name${i}`).catch(() => null);
        if ((name == null ? void 0 : name.val) === fn) {
          slot = i;
          break;
        }
      }
    }
    if (slot) {
      const ext = await this.slotExt(cam.fid, slot);
      if (ext) {
        const storagePath2 = (0, import_recording.recordingStoragePath)(cam.fid, slot, ext);
        const size = await this.storedFileSize(storagePath2);
        const name = await this.getStateAsync(`${cam.fid}.recordings.name${slot}`).catch(() => null);
        const base = String((name == null ? void 0 : name.val) || `${cam.fid}_rec${slot}`).replace(/\.[^.]+$/, "");
        if ((0, import_recording.exceedsLimit)(size, limitBytes)) {
          return { ok: false, size, format: ext, error: `Recording is ${(0, import_recording.fmtMb)(size)} \u2014 ${limitName}` };
        }
        return this.describeStored(storagePath2, `${base}.${ext}`, ext, size);
      }
      if (!fn) {
        return { ok: false, error: `No stored recording ${slot} for ${cam.fid}` };
      }
    }
    if ((0, import_recording.exceedsLimit)(listedSize, limitBytes)) {
      return { ok: false, size: listedSize, error: `Recording ${fn} is ${(0, import_recording.fmtMb)(listedSize)} \u2014 ${limitName}` };
    }
    const dl = await this.fetchRecording(cam.oid, fn, limitBytes);
    if (!dl.ok || !dl.data) {
      return {
        ok: false,
        size: dl.size,
        error: dl.tooLarge ? `Recording ${fn}: ${dl.error} \u2014 ${limitName}` : `Recording ${fn} not downloaded: ${(_d = dl.error) != null ? _d : "empty response"}`
      };
    }
    const out = await this.toWantedFormat(dl.data, (0, import_recording.extOf)(fn), wantMp4, limitBytes);
    if ((0, import_recording.exceedsLimit)(out.data.length, limitBytes)) {
      return {
        ok: false,
        size: out.data.length,
        format: out.ext,
        error: `Recording is ${(0, import_recording.fmtMb)(out.data.length)} \u2014 ${limitName}`
      };
    }
    await this.ensureFileMeta();
    for (const ext of ["mp4", "mkv"]) {
      const p = (0, import_recording.sendFileStoragePath)(cam.fid, ext);
      if (ext !== out.ext && await this.fileExistsAsync(this.namespace, p).catch(() => false)) {
        await this.delFileAsync(this.namespace, p).catch(() => {
        });
      }
    }
    const storagePath = (0, import_recording.sendFileStoragePath)(cam.fid, out.ext);
    await this.writeFileAsync(this.namespace, storagePath, out.data);
    return this.describeStored(storagePath, `${fn.replace(/\.[^.]+$/, "")}.${out.ext}`, out.ext, out.data.length);
  }
  async storedFileSize(storagePath) {
    const local = this.localFilePath(storagePath);
    if (local) {
      try {
        return fs.statSync(local).size;
      } catch {
      }
    }
    const f = await this.readFileAsync(this.namespace, storagePath).catch(() => null);
    const file = f == null ? void 0 : f.file;
    return file ? Buffer.isBuffer(file) ? file.length : Buffer.byteLength(file) : 0;
  }
  // Absolute path if the file storage is on this host's disk, else ''.
  localFilePath(storagePath) {
    const abs = path.join(utils.getAbsoluteDefaultDataDir(), "files", this.namespace, ...storagePath.split("/"));
    return fs.existsSync(abs) ? abs : "";
  }
  async describeStored(storagePath, fileName, format, size) {
    if (this.webBaseUrl === void 0) {
      this.webBaseUrl = await this.findWebBaseUrl();
    }
    return {
      ok: true,
      fileName,
      format,
      mime: (0, import_recording.mimeOf)(format),
      size,
      uri: `iobfile://${this.namespace}/${storagePath}`,
      url: this.webBaseUrl ? `${this.webBaseUrl}/${this.namespace}/recordings/${storagePath}` : "",
      file: this.localFilePath(storagePath)
    };
  }
  async getRecording(msg) {
    return this.provideRecording(
      msg,
      (0, import_recording.maxRecordingBytes)(this.config.recordingMaxSizeMb),
      "larger than the configured maximum size"
    );
  }
  async sendRecording(msg) {
    var _a, _b, _c;
    const target = typeof msg.target === "string" && msg.target ? msg.target : "telegram.0";
    if (!/^[a-z0-9_-]+\.\d+$/i.test(target)) {
      return { ok: false, error: `Invalid target "${target}" (expected an instance like telegram.0)` };
    }
    const telegram = target.startsWith("telegram.");
    const maxBytes = (0, import_recording.maxRecordingBytes)(this.config.recordingMaxSizeMb);
    const tgLimit = telegram && import_recording.TELEGRAM_MAX_BYTES <= maxBytes;
    const r = await this.provideRecording(
      msg,
      tgLimit ? import_recording.TELEGRAM_MAX_BYTES : maxBytes,
      tgLimit ? "Telegram bots can only send files up to 50 MB" : "larger than the configured maximum size"
    );
    if (!r.ok || !r.uri) {
      return r;
    }
    if (telegram && ((_a = r.size) != null ? _a : 0) > import_recording.TELEGRAM_MAX_BYTES) {
      return {
        ...r,
        ok: false,
        error: `Recording is ${(0, import_recording.fmtMb)((_b = r.size) != null ? _b : 0)} \u2014 Telegram bots can only send files up to 50 MB`
      };
    }
    const payload = {
      text: telegram ? r.uri : r.file || r.uri,
      type: "video",
      fileName: r.fileName
    };
    for (const k of ["caption", "user", "chatId"]) {
      const v = msg[k];
      if (typeof v === "string" || typeof v === "number") {
        if (v !== "") {
          payload[k] = v;
        }
      }
    }
    (0, import_recording.assertNoBinary)(payload);
    const result = await new Promise((resolve) => {
      const timer = this.setTimeout(() => resolve({ timeout: true }), 3e5);
      this.sendTo(target, "send", payload, (res2) => {
        if (timer !== void 0) {
          this.clearTimeout(timer);
        }
        resolve({ res: res2 });
      });
    });
    if (result.timeout) {
      return { ...r, ok: false, error: `No answer from ${target} within 300 s` };
    }
    this.log.debug(`Recording ${r.fileName} (${(0, import_recording.fmtMb)((_c = r.size) != null ? _c : 0)}) sent to ${target}`);
    const res = result.res;
    return {
      ...r,
      result: typeof res === "number" || typeof res === "string" || typeof res === "boolean" ? res : void 0
    };
  }
  // ---- device folder name ----
  deviceFolder(d) {
    return `${d.ot === 1 ? "mic" : "cam"}_${sanitize(d.oid)}_${sanitize(d.name)}`;
  }
  // ---- device status data points ----
  STATUS_DPS = [
    { key: "recording", role: "indicator.working", name: "Active recording" },
    { key: "online", role: "indicator.reachable", name: "Online" },
    { key: "connected", role: "indicator.connected", name: "Stream connected" },
    { key: "detected", role: "indicator", name: "Motion detected" },
    { key: "alerted", role: "indicator.alarm", name: "Alert active" }
  ];
  async writeStatusDps(d, fid) {
    const data = d.raw.data;
    if (!data || typeof data !== "object") {
      return;
    }
    const sfid = `${fid}.status`;
    if (!this.ensuredFolders.has(sfid)) {
      await this.ensureFolder(sfid, "Status", "channel");
    }
    for (const dp of this.STATUS_DPS) {
      if (!(dp.key in data)) {
        continue;
      }
      const id = `${sfid}.${dp.key}`;
      if (!this.ensuredFolders.has(id)) {
        await this.setObjectNotExistsAsync(id, {
          type: "state",
          common: { name: dp.name, type: "boolean", role: dp.role, read: true, write: false, def: false },
          native: {}
        });
        this.ensuredFolders.add(id);
      }
      await this.setStateAsync(id, { val: !!data[dp.key], ack: true });
    }
  }
  // ---- build device data points ----
  async buildDevice(d) {
    const fid = this.deviceFolder(d);
    this.devById.set(d.oid, d);
    await this.ensureFolder(fid, d.name, "device");
    if (d.ot === 2) {
      await this.detectAspect(d);
    }
    await this.flattenWrite(d.raw, fid, 0);
    await this.writeStatusDps(d, fid);
    await this.ensureFolder(`${fid}.control`, "Control", "channel");
    const CAM_ONLY = /* @__PURE__ */ new Set(["snapshot", "objectDetectOn", "objectDetectOff"]);
    for (const c of CAM_COMMANDS) {
      if (CAM_ONLY.has(c.id) && d.ot !== 2) {
        continue;
      }
      await this.ensureButton(`${fid}.control.${c.id}`, c.name, {
        kind: "cam",
        path: c.path,
        params: [...c.params],
        oid: d.oid,
        ot: d.ot
      });
    }
    if (this.config.enablePtz && d.ot === 2) {
      await this.ensureFolder(`${fid}.control.ptz`, "PTZ", "channel");
      for (const p of PTZ_DIRS) {
        const cid = `${fid}.control.ptz.${p.id}`;
        if (p.hold) {
          await this.ensureControl(
            cid,
            `PTZ ${p.id} (hold)`,
            { kind: "ptzHold", oid: d.oid, dir: p.dir },
            "switch"
          );
        } else {
          await this.ensureButton(cid, `PTZ ${p.id}`, { kind: "ptz", oid: d.oid, dir: p.dir });
        }
      }
      await this.buildPtzPresets(d, fid);
    }
    if (d.ot === 2) {
      const sfx = { kind: "levelCmd", path: "/command/setSensitivity", oid: d.oid, ot: d.ot };
      await this.ensureLevel(
        `${fid}.control.sensitivityMin`,
        "Sensitivity min (0-100)",
        { ...sfx, valueParam: "min" },
        0,
        100
      );
      await this.ensureLevel(
        `${fid}.control.sensitivityMax`,
        "Sensitivity max (0-100)",
        { ...sfx, valueParam: "max" },
        0,
        100
      );
      await this.ensureLevel(
        `${fid}.control.sensitivityGain`,
        "Sensitivity gain (0-100)",
        { ...sfx, valueParam: "gain" },
        0,
        100
      );
    }
    if (this.config.enableUrls) {
      await this.ensureFolder(`${fid}.urls`, "URLs", "channel");
      if (d.ot === 2) {
        await this.writeLeaf(`${fid}.urls.snapshot`, `${this.baseUrl}/grab.jpg?oid=${d.oid}`);
        await this.writeLeaf(`${fid}.urls.photo`, `${this.baseUrl}/photo.jpg?oid=${d.oid}`);
        await this.writeLeaf(`${fid}.urls.mjpeg`, `${this.baseUrl}/video.mjpg?oids=${d.oid}`);
        await this.writeLeaf(`${fid}.urls.mp4`, `${this.baseUrl}/video.mp4?oids=${d.oid}`);
      } else if (d.ot === 1) {
        await this.writeLeaf(`${fid}.urls.audio_mp3`, `${this.baseUrl}/audio.mp3?oid=${d.oid}`);
        await this.writeLeaf(`${fid}.urls.audio_ogg`, `${this.baseUrl}/audio.ogg?oid=${d.oid}`);
      }
    }
    if (d.ot === 2) {
      const snapId = `${fid}.snapshot_b64`;
      if (!this.ensuredFolders.has(snapId)) {
        await this.ensurePath(snapId);
        await this.setObjectNotExistsAsync(snapId, {
          type: "state",
          common: {
            name: "Snapshot (Base64)",
            type: "string",
            role: "state",
            read: true,
            write: false
          },
          native: {}
        });
        await this.setStateAsync(snapId, { val: "", ack: true });
        this.ensuredFolders.add(snapId);
      }
      await this.ensureButton(`${fid}.control.refreshSnapshotB64`, "Refresh snapshot (Base64)", {
        kind: "snapshotB64",
        oid: d.oid,
        fid
      });
      if (this.config.enableSnapshotB64) {
        await this.fetchSnapshotB64(d.oid, snapId);
      }
    }
    await this.updateCameraEvents(d, fid);
    if (this.config.enableWidget && d.ot === 2) {
      await this.updateLiveWidget(d, fid);
    }
  }
  // ---- PTZ presets ----
  async buildPtzPresets(d, fid) {
    var _a;
    const selectorId = `${fid}.control.ptz.preset`;
    if (!this.ptzPresetNames.has(d.oid)) {
      const res = await this.apiGet(`/command/ptzpresets?oid=${d.oid}&ot=2`);
      const json = asJson(res.data);
      const raw = json && Array.isArray(json.presets) ? json.presets : [];
      const names2 = raw.map((p) => {
        var _a2, _b;
        return toStr((_b = (_a2 = p.name) != null ? _a2 : p.token) != null ? _b : "");
      }).filter(Boolean);
      this.ptzPresetNames.set(d.oid, names2);
    }
    const names = (_a = this.ptzPresetNames.get(d.oid)) != null ? _a : [];
    if (!names.length) {
      return;
    }
    const states = {};
    names.forEach((n, i) => {
      states[i] = n;
    });
    await this.ensureSelector(
      selectorId,
      "Preset",
      { kind: "ptzPreset", oid: d.oid, ot: d.ot, presetNames: names },
      states
    );
  }
  // ---- event formatting ----
  fmtEvent(ev, oid) {
    var _a, _b, _c;
    const e = ev;
    const fn = (_a = e.fn) != null ? _a : "";
    const dot = fn.lastIndexOf(".");
    const jpg = `${dot > 0 ? fn.slice(0, dot) : fn}_large.jpg`;
    const sizeMB = e.sb ? Math.round(Number(e.sb) / 1048576 * 100) / 100 : 0;
    const dur = e.d != null ? String(e.d) : "";
    const tag = (_b = e.tg) != null ? _b : "";
    const ms = (parseFloat(String((_c = e.c) != null ? _c : 0)) - 621355968e9) / 1e4;
    const ts = Number.isFinite(ms) ? Math.round(ms) : 0;
    const dt = new Date(ms);
    const two = (n) => String(n).padStart(2, "0");
    const date = `${two(dt.getDate())}.${two(dt.getMonth() + 1)}.`;
    const time = `${two(dt.getHours())}:${two(dt.getMinutes())}`;
    const thumb = `${this.baseUrl}/fileThumb.jpg?oid=${oid}&fn=${encodeURIComponent(jpg)}`;
    const video = `${this.baseUrl}/streamFile.cgi?oid=${oid}&ot=2&fn=${encodeURIComponent(fn)}`;
    return { fn, sizeMB, dur, tag, date, time, thumb, video, ts };
  }
  // ---- gallery HTML builders ----
  effectiveMinCol() {
    const sizeMap = { small: 120, medium: 180, large: 240 };
    const ts = this.config.widgetThumbSize;
    return ts && sizeMap[ts] ? sizeMap[ts] : this.config.widgetMinCol || 150;
  }
  // Theme-Farben gelten gleichermassen fuer Aufnahmen- und Live-Widget (rein
  // optisch, nichts Aufnahmen-Spezifisches) - ein Helper statt die sechs Felder
  // an jeder Stelle zu wiederholen.
  widgetColors() {
    return {
      cardBg: this.config.widgetColorCardBg || void 0,
      tagBg: this.config.widgetColorTagBg || void 0,
      tagText: this.config.widgetColorTagText || void 0,
      accent: this.config.widgetColorAccent || void 0,
      modalBg: this.config.widgetColorModalBg || void 0,
      radius: this.config.widgetBorderRadius
    };
  }
  async pruneStaleDevices(activeFolders) {
    const allObjs = await this.getAdapterObjectsAsync();
    const stale = [];
    for (const fullId of Object.keys(allObjs)) {
      const obj = allObjs[fullId];
      if (obj.type !== "device") {
        continue;
      }
      const rel = fullId.slice(this.namespace.length + 1);
      if (/^(cam|mic)_/.test(rel) && !activeFolders.has(rel)) {
        stale.push(rel);
      }
    }
    for (const rel of stale) {
      this.log.info(`[agent-dvr] removing stale device: ${rel}`);
      await this.delObjectAsync(rel, { recursive: true });
      this.forgetEnsured(rel);
      for (let c = 1; c <= 3; c++) {
        this.ensuredFolders.delete(`${rel}.recordings#${c}`);
      }
      delete this.recPending[rel];
      await this.deleteStorageFolder(rel).catch(
        (e) => this.log.debug(`File storage cleanup ${rel}: ${e.message}`)
      );
      for (const [oid, d] of this.devById) {
        if (this.deviceFolder(d) === rel) {
          this.devById.delete(oid);
          break;
        }
      }
    }
  }
  // ---- web components (admin/webcomponents) ----
  // Die Widget-Einstellungen der Instanz, so wie sie die HTML-Widgets anwenden - die
  // Web-Komponenten lesen sie aus widget_config (Modus "aus den Adapter-Einstellungen").
  // Die Schluessel heissen wie die Einstellungen im Manifest der Komponenten.
  widgetComponentSettings() {
    var _a;
    const c = this.config;
    return {
      widgetMode: c.widgetMode === "js" ? "js" : "nojs",
      count: Math.max(1, Number(c.widgetAnzahl) || 50),
      minCol: this.effectiveMinCol(),
      maxModalWidth: c.widgetMaxModalWidth || 900,
      showTags: !!c.widgetShowTags,
      tagPosition: c.widgetTagPosition || "bottom-left",
      sortNewest: c.widgetSortNewest !== false,
      showSearch: c.widgetShowSearch !== false,
      defaultTag: (c.widgetDefaultTag || "").trim(),
      compact: !!c.widgetCompact,
      playerUrl: (c.widgetPlayerUrl || "").trim(),
      liveAspect: c.widgetLiveAspect || "",
      liveRefreshSec: Math.max(0, Number(c.widgetLiveRefreshSec) || 0),
      colorCardBg: c.widgetColorCardBg || "",
      colorTagBg: c.widgetColorTagBg || "",
      colorTagText: c.widgetColorTagText || "",
      colorAccent: c.widgetColorAccent || "",
      colorModalBg: c.widgetColorModalBg || "",
      borderRadius: (_a = c.widgetBorderRadius) != null ? _a : 8
    };
  }
  // Writes a JSON data state for the web components - only when its content changed.
  async writeJsonState(id, name, data) {
    const val = JSON.stringify(data);
    if (!this.ensuredFolders.has(id)) {
      await this.setObjectNotExistsAsync(id, {
        type: "state",
        common: { name, type: "string", role: "json", read: true, write: false, def: "" },
        native: {}
      });
      this.ensuredFolders.add(id);
      delete this.jsonLastWrite[id];
    }
    if (this.jsonLastWrite[id] === val) {
      return;
    }
    await this.setStateAsync(id, { val, ack: true });
    this.jsonLastWrite[id] = val;
  }
  // widget_config: settings, cameras and labels for the web components. No credentials:
  // the links are the same AgentDVR links the HTML widgets put into the page.
  async writeWidgetConfig(cams) {
    await this.writeJsonState("widget_config", "Widget settings and cameras (for the web components)", {
      settings: this.widgetComponentSettings(),
      labels: this.wt,
      cameras: cams.map((d) => ({
        id: this.deviceFolder(d),
        oid: d.oid,
        name: d.name || `Camera ${d.oid}`,
        aspect: this.camAspect[d.oid] || "",
        snapshot: `${this.baseUrl}/grab.jpg?oid=${d.oid}&ot=2&maintainAR=1`,
        live: `${this.baseUrl}/video.webm?oid=${d.oid}&ot=2`
      }))
    });
  }
  sortedEvents(events) {
    return this.config.widgetSortNewest === false ? [...events].reverse() : events;
  }
  buildGalleryHtml(d, events) {
    return (this.config.widgetMode || "nojs") === "js" ? this.buildGalleryHtmlJs(d, events) : this.buildGalleryHtmlNojs(d, events);
  }
  buildGalleryHtmlNojs(d, events) {
    const oid = d.oid;
    const minCol = this.effectiveMinCol();
    const maxW = this.config.widgetMaxModalWidth || 900;
    const showTags = this.config.widgetShowTags;
    const pos = (this.config.widgetTagPosition || "bottom-left").split("-");
    const tagStyle = `${pos[0]}:5px;${pos[1]}:5px`;
    const playerUrl = (this.config.widgetPlayerUrl || "").trim();
    const compact = !!this.config.widgetCompact;
    const PAUSE_ATTR = ` onchange="if(!this.checked){var m=this.nextElementSibling.nextElementSibling,v=m&&m.querySelector('video');if(v){v.pause();}}"`;
    const items = this.sortedEvents(events).map((ev, i) => {
      const p = this.fmtEvent(ev, oid);
      const id = `adv${sanitize(oid)}_${i}`;
      const badge = showTags && p.tag ? `<span class="advtag" style="${tagStyle}">${escHtml(p.tag)}</span>` : "";
      const inner = `<span class="advimg"><img src="${p.thumb}" loading="lazy" alt="">${badge}<span class="advplay"></span></span><span class="advcap">${escHtml(p.date)} ${escHtml(p.time)}<br>${escHtml(p.dur)}s &middot; ${escHtml(p.sizeMB)} MB</span>`;
      if (playerUrl) {
        const href = playerUrl.replace(/{video}/g, encodeURIComponent(p.video)).replace(/{videoRaw}/g, p.video).replace(/{fn}/g, encodeURIComponent(p.fn)).replace(/{date}/g, encodeURIComponent(p.date)).replace(/{time}/g, encodeURIComponent(p.time)).replace(/{duration}/g, encodeURIComponent(p.dur)).replace(/{size}/g, encodeURIComponent(String(p.sizeMB))).replace(/{tags}/g, encodeURIComponent(p.tag));
        return `<a class="advcell" href="${escHtml(href)}" target="_blank" rel="noopener">${inner}</a>`;
      }
      return `<input class="advlb" type="checkbox" id="${id}"${PAUSE_ATTR}><label class="advcell advthumb" for="${id}">${inner}</label><div class="advmodal"><label class="advbackdrop" for="${id}"></label><div class="advbox"><label class="advclose" for="${id}">&#10005;</label><video class="advvideo" controls preload="none" playsinline src="${p.video}"></video><div class="advinfo">${escHtml(p.date)} ${escHtml(p.time)} &middot; ${escHtml(p.dur)}s &middot; ${escHtml(p.sizeMB)} MB${p.tag ? ` &middot; ${escHtml(p.tag)}` : ""} &middot; <a href="${p.video}" download target="_blank">${this.wt.download}</a></div></div></div>`;
    }).join("");
    const gridClass = compact ? "advgrid advcompact" : "advgrid";
    const grid = items ? `<div class="${gridClass}">${items}</div>` : `<div class="advempty">${this.wt.noRecordings}</div>`;
    const colors = this.widgetColors();
    return `<style>${galleryCss(minCol, maxW, compact, colors)}</style>${grid}`;
  }
  buildGalleryHtmlJs(d, events) {
    const oid = d.oid;
    const minCol = this.effectiveMinCol();
    const maxW = this.config.widgetMaxModalWidth || 900;
    const showSearch = this.config.widgetShowSearch !== false;
    const compact = !!this.config.widgetCompact;
    const defaultTag = (this.config.widgetDefaultTag || "").trim();
    const items = this.sortedEvents(events).map((ev) => {
      const p = this.fmtEvent(ev, oid);
      return {
        fn: p.fn,
        date: p.date,
        time: p.time,
        dur: p.dur,
        size: p.sizeMB,
        tag: p.tag,
        thumb: p.thumb,
        video: p.video
      };
    });
    const cfg = {
      min_col: minCol,
      show_tags: !!this.config.widgetShowTags,
      max_modal_width: maxW,
      live_aspect: this.camAspect[oid] || this.config.widgetLiveAspect || "",
      player_url: (this.config.widgetPlayerUrl || "").trim(),
      tag_position: this.config.widgetTagPosition || "bottom-left",
      compact,
      default_tag: defaultTag,
      labels: { noRecordings: this.wt.noRecordings, all: this.wt.all, live: this.wt.live }
    };
    const data = JSON.stringify({ items, live: null, cfg }).replace(/</g, "\\u003c");
    const boot = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    const searchHtml = showSearch ? `<input class="advsearchjs" type="text" placeholder="${escHtml(this.wt.search)}">` : "";
    const colors = this.widgetColors();
    return `<style>${galleryCssJs(minCol, compact, colors)}</style><div class="advroot"><script type="application/json" class="advdata">${data}</script><div class="advbar">${searchHtml}<div class="advtagsjs"></div></div><div class="advgridjs"></div></div><script type="text/plain" class="advcode">${ADV_CLIENT_CODE}</script><img alt="" src="${boot}" style="display:none" onload="(function(){if(window.ADVscan){window.ADVscan();return;}var c=document.querySelector('script.advcode');if(!c)return;var s=document.createElement('script');s.textContent=c.textContent;document.body.appendChild(s);})()">`;
  }
  buildOverviewHtml(cams) {
    const minCol = this.effectiveMinCol();
    const maxW = this.config.widgetMaxModalWidth || 900;
    const compact = !!this.config.widgetCompact;
    const colors = this.widgetColors();
    const jsMode = this.config.widgetLiveMode === "js";
    const refreshSec = Number(this.config.widgetLiveRefreshSec) || 0;
    const PAUSE_ATTR = ` onchange="if(!this.checked){var m=this.nextElementSibling.nextElementSibling,v=m&&m.querySelector('video');if(v){v.pause();}}"`;
    const tiles = cams.map((d) => {
      const oid = d.oid;
      const id = `advlive${sanitize(oid)}`;
      const grabBase = `${this.baseUrl}/grab.jpg?oid=${oid}&ot=2&maintainAR=1`;
      const grab = `${grabBase}&ts=${Date.now()}`;
      const webm = `${this.baseUrl}/video.webm?oid=${oid}&ot=2`;
      const name = escHtml(d.name || `Camera ${oid}`);
      const arRaw = this.camAspect[oid] || this.config.widgetLiveAspect || "";
      const ar = arRaw ? String(arRaw).replace("/", " / ") : "";
      const fix = ar ? " advimgfix" : "";
      const arStyle = ar ? ` style="aspect-ratio:${ar}"` : "";
      const videoArStyle = ar ? ` style="aspect-ratio:${ar};object-fit:fill"` : "";
      const imgAttrs = jsMode ? ` class="advlivethumb" data-base="${grabBase}" data-refresh="${refreshSec}"` : "";
      const inner = `<span class="advimg${fix}"${arStyle}><img${imgAttrs} src="${grab}" loading="lazy" alt=""><span class="advtag" style="top:5px;left:5px">&#9679; ${escHtml(this.wt.live)}</span><span class="advplay"></span></span><span class="advcap">${name}</span>`;
      return `<input class="advlb" type="checkbox" id="${id}"${PAUSE_ATTR}><label class="advcell advthumb" for="${id}">${inner}</label><div class="advmodal"><label class="advbackdrop" for="${id}"></label><div class="advbox"><label class="advclose" for="${id}">&#10005;</label><video class="advvideo" controls preload="none" playsinline${videoArStyle} src="${webm}"></video><div class="advinfo">${name} &middot; Live</div></div></div>`;
    }).join("");
    const grid = tiles ? `<div class="advgrid">${tiles}</div>` : `<div class="advempty">No cameras</div>`;
    const script = jsMode && tiles ? advLiveRefreshScript() : "";
    return `<style>${galleryCss(minCol, maxW, compact, colors)}</style>${grid}${script}`;
  }
  buildSingleCamLiveHtml(d) {
    const minCol = this.effectiveMinCol();
    const maxW = this.config.widgetMaxModalWidth || 900;
    const compact = !!this.config.widgetCompact;
    const colors = this.widgetColors();
    const PAUSE_ATTR = ` onchange="if(!this.checked){var m=this.nextElementSibling.nextElementSibling,v=m&&m.querySelector('video');if(v){v.pause();}}"`;
    const jsMode = this.config.widgetLiveMode === "js";
    const refreshSec = Number(this.config.widgetLiveRefreshSec) || 0;
    const oid = d.oid;
    const id = `advlive${sanitize(oid)}`;
    const grabBase = `${this.baseUrl}/grab.jpg?oid=${oid}&ot=2&maintainAR=1`;
    const grab = `${grabBase}&ts=${Date.now()}`;
    const webm = `${this.baseUrl}/video.webm?oid=${oid}&ot=2`;
    const name = escHtml(d.name || `Camera ${oid}`);
    const arRaw = this.camAspect[oid] || this.config.widgetLiveAspect || "";
    const ar = arRaw ? String(arRaw).replace("/", " / ") : "";
    const fix = ar ? " advimgfix" : "";
    const arStyle = ar ? ` style="aspect-ratio:${ar}"` : "";
    const videoArStyle = ar ? ` style="aspect-ratio:${ar};object-fit:fill"` : "";
    const imgAttrs = jsMode ? ` class="advlivethumb" data-base="${grabBase}" data-refresh="${refreshSec}"` : "";
    const inner = `<span class="advimg${fix}"${arStyle}><img${imgAttrs} src="${grab}" loading="lazy" alt=""><span class="advtag" style="top:5px;left:5px">&#9679; ${escHtml(this.wt.live)}</span><span class="advplay"></span></span><span class="advcap">${name}</span>`;
    const tile = `<input class="advlb" type="checkbox" id="${id}"${PAUSE_ATTR}><label class="advcell advthumb" for="${id}">${inner}</label><div class="advmodal"><label class="advbackdrop" for="${id}"></label><div class="advbox"><label class="advclose" for="${id}">&#10005;</label><video class="advvideo" controls preload="none" playsinline${videoArStyle} src="${webm}"></video><div class="advinfo">${name} &middot; Live</div></div></div>`;
    const script = jsMode ? advLiveRefreshScript() : "";
    return `<style>${galleryCss(minCol, maxW, compact, colors)}</style><div class="advgrid">${tile}</div>${script}`;
  }
  async updateLiveWidget(d, fid) {
    const wId = `${fid}.widget_live`;
    if (!this.ensuredFolders.has(wId)) {
      await this.ensurePath(wId);
      await this.setObjectNotExistsAsync(wId, {
        type: "state",
        common: {
          name: "HTML live widget",
          type: "string",
          role: "html",
          read: true,
          write: false,
          def: ""
        },
        native: {}
      });
      this.ensuredFolders.add(wId);
    }
    if (!this.shouldRefreshLiveWidget(wId)) {
      return;
    }
    await this.setStateAsync(wId, { val: this.buildSingleCamLiveHtml(d), ack: true });
  }
  // Steuert, wie oft widget_live/widget_live_overview tatsaechlich neu
  // geschrieben werden. Jedes Neuschreiben ersetzt das komplette HTML und
  // setzt damit eine evtl. offene Video-Modal-Checkbox zurueck (schliesst
  // das Modal) - widgetLiveRefreshSec gibt Nutzern die Kontrolle ueber
  // diesen Zielkonflikt (0 = nur beim allerersten Mal schreiben, Modal
  // schliesst sich dadurch nie von selbst; >0 = alle N Sekunden aktualisieren,
  // Vorschaubild bleibt aktueller, ein offenes Modal kann aber dabei schliessen).
  shouldRefreshLiveWidget(wId) {
    const last = this.widgetLastWrite[wId];
    if (last === void 0) {
      this.widgetLastWrite[wId] = Date.now();
      return true;
    }
    if (this.config.widgetLiveMode === "js") {
      return false;
    }
    const intervalSec = Number(this.config.widgetLiveRefreshSec) || 0;
    if (intervalSec <= 0) {
      return false;
    }
    if (Date.now() - last >= intervalSec * 1e3) {
      this.widgetLastWrite[wId] = Date.now();
      return true;
    }
    return false;
  }
  // ---- event data points ----
  async writeEventDps(d, fid, events) {
    var _a, _b, _c, _d, _e, _f, _g;
    const oid = d.oid;
    await this.ensureFolder(`${fid}.events`, "Events", "channel");
    await this.ensureFolder(`${fid}.events.last`, "Last event", "channel");
    const two = (n) => String(n).padStart(2, "0");
    const now = /* @__PURE__ */ new Date();
    const td = `${two(now.getDate())}.${two(now.getMonth() + 1)}.`;
    const todayCount = events.filter((ev) => this.fmtEvent(ev, oid).date === td).length;
    await this.writeLeaf(`${fid}.events.count`, events.length);
    await this.writeLeaf(`${fid}.events.today`, todayCount);
    if (events.length) {
      const p = this.fmtEvent(events[0], oid);
      const tsMs = (parseFloat(String((_a = events[0].c) != null ? _a : 0)) - 621355968e9) / 1e4;
      await this.writeLeaf(`${fid}.events.last.time`, `${p.date} ${p.time}`);
      await this.writeLeaf(`${fid}.events.last.timestamp`, Math.round(tsMs));
      await this.writeLeaf(`${fid}.events.last.tag`, p.tag);
      await this.writeLeaf(`${fid}.events.last.duration`, p.dur ? parseFloat(p.dur) : 0);
      await this.writeLeaf(`${fid}.events.last.size_mb`, p.sizeMB);
      await this.writeLeaf(`${fid}.events.last.thumb`, p.thumb);
      await this.writeLeaf(`${fid}.events.last.video`, p.video);
    }
    const jsonId = `${fid}.events.json`;
    if (!this.ensuredFolders.has(jsonId)) {
      await this.ensurePath(jsonId);
      await this.setObjectNotExistsAsync(jsonId, {
        type: "state",
        common: { name: "Recordings list (web UI)", type: "string", role: "json", read: true, write: false },
        native: {}
      });
      this.ensuredFolders.add(jsonId);
    }
    await this.setStateAsync(jsonId, {
      val: JSON.stringify(
        events.slice(0, Math.min(5e3, Math.max(1, (_b = this.config.dashMaxRec) != null ? _b : 200))).map((ev) => {
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
            ts: p.ts
          };
        })
      ),
      ack: true
    });
    await this.ensureFlag(`${fid}.events.new`, "New event");
    const ignore = (this.config.eventTagsIgnore || "detected").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    const tokensOf = (s) => s.toLowerCase().split(/[,\s]+/).filter(Boolean);
    for (const kw of (this.config.eventTags || "").split(",").map((s) => s.trim()).filter(Boolean)) {
      await this.ensureFlag(`${fid}.events.detected_${sanitize(kw)}`, `Detected: ${kw}`);
    }
    if (this.config.eventTagsDynamic) {
      const seen = /* @__PURE__ */ new Set();
      for (const ev of events) {
        tokensOf((_c = ev.tg) != null ? _c : "").forEach((t) => seen.add(t));
      }
      for (const t of seen) {
        if (ignore.includes(t)) {
          continue;
        }
        await this.ensureFlag(`${fid}.events.detected_${sanitize(t)}`, `Detected: ${t}`);
      }
    }
    let newCount = 0;
    const firstRun = this.lastEventFn[oid] === void 0;
    if (firstRun && events.length && this.recordingCamEnabled(fid)) {
      this.queueInitialFill(d, fid, events[0]);
    }
    if (events.length) {
      const prev = this.lastEventFn[oid];
      if (prev !== void 0) {
        const i = events.findIndex((e) => e.fn === prev);
        newCount = i === -1 ? events.length : i;
      }
      this.lastEventFn[oid] = (_d = events[0].fn) != null ? _d : "";
    }
    const tags = /* @__PURE__ */ new Set();
    for (let i = 0; i < newCount && i < events.length; i++) {
      tokensOf((_e = events[i].tg) != null ? _e : "").forEach((t) => tags.add(t));
    }
    const known = this.eventTagsSeen[oid];
    const nextKnown = /* @__PURE__ */ new Map();
    let lateTags = 0;
    for (const ev of events.slice(0, 20)) {
      const fn = (_f = ev.fn) != null ? _f : "";
      const cur = new Set(tokensOf((_g = ev.tg) != null ? _g : ""));
      const before = known == null ? void 0 : known.get(fn);
      if (!firstRun && before) {
        for (const t of cur) {
          if (!before.has(t) && !tags.has(t)) {
            tags.add(t);
            lateTags++;
          }
        }
      }
      nextKnown.set(fn, cur);
    }
    this.eventTagsSeen[oid] = nextKnown;
    if (newCount > 0) {
      await this.pulse(`${fid}.events.new`);
      if (this.recordingCamEnabled(fid)) {
        void this.queueRecordingSave(d, fid, events[0]);
      }
    }
    if (newCount > 0 || lateTags > 0) {
      for (const t of tags) {
        if (ignore.includes(t)) {
          continue;
        }
        const tid = `${fid}.events.detected_${sanitize(t)}`;
        await this.ensureFlag(tid, `Detected: ${t}`);
        await this.pulse(tid);
      }
      this.log.debug(`${newCount} new event(s), ${lateTags} late tag(s) cam ${oid} [${[...tags].join(",")}]`);
    }
  }
  // ---- camera events + widget ----
  async updateCameraEvents(d, fid) {
    var _a, _b, _c, _d;
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
      const events = Array.isArray(evJson.events) ? evJson.events : Array.isArray(evJson) ? evJson : [];
      if (this.config.enableEventDps) {
        await this.writeEventDps(d, fid, events);
      }
      await this.writeJsonState(`${fid}.widget_data`, "Recordings (for the web components)", {
        recordings: events.slice(0, 500).map((ev) => {
          const p = this.fmtEvent(ev, d.oid);
          return {
            fn: p.fn,
            date: p.date,
            time: p.time,
            dur: p.dur,
            size: p.sizeMB,
            tag: p.tag,
            thumb: p.thumb,
            video: p.video,
            ts: p.ts
          };
        })
      });
      if (this.config.enableWidget) {
        const wId = `${fid}.widget_recordings`;
        if (!this.ensuredFolders.has(wId)) {
          await this.ensurePath(wId);
          await this.setObjectNotExistsAsync(wId, {
            type: "state",
            common: {
              name: "HTML recordings widget",
              type: "string",
              role: "html",
              read: true,
              write: false,
              def: ""
            },
            native: {}
          });
          this.ensuredFolders.add(wId);
        }
        const ev = events.slice(0, Math.max(1, this.config.widgetAnzahl || 50));
        const f = (_a = ev[0]) != null ? _a : {};
        const l = (_b = ev[ev.length - 1]) != null ? _b : {};
        const sig = `${ev.length}|${(_c = f.fn) != null ? _c : ""}|${(_d = l.fn) != null ? _d : ""}`;
        if (this.widgetSig[wId] !== sig) {
          await this.setStateAsync(wId, { val: this.buildGalleryHtml(d, ev), ack: true });
          this.widgetSig[wId] = sig;
        }
      }
    } finally {
      this.eventBusy[d.oid] = false;
    }
  }
  // ---- main poll ----
  async poll() {
    var _a, _b;
    if (this.pollBusy) {
      this.log.debug("poll() skipped \u2014 previous run still in progress");
      return;
    }
    this.pollBusy = true;
    try {
      const res = await this.apiGet("/command/getObjects");
      const json = asJson(res.data);
      if (!res.ok || !json) {
        await this.setStateAsync("info.connection", false, true);
        await this.setStateAsync("system.online", { val: false, ack: true });
        this.log.warn(`AgentDVR unreachable: ${res.error || "invalid response"}`);
        return;
      }
      await this.setStateAsync("info.connection", true, true);
      await this.setStateAsync("system.online", { val: true, ack: true });
      if (json.settings) {
        await this.flattenWrite(json.settings, "system.settings", 0);
      }
      if (this.config.storeRawJson) {
        const clean = { ...json };
        delete clean.icons;
        await this.writeLeaf("system.raw_getObjects", JSON.stringify(clean).slice(0, 6e4));
      }
      const devices = findDevices(json);
      this.lastCamNames = devices.filter((d) => d.ot === 2).map((d) => ({ key: this.deviceFolder(d), name: d.name }));
      await this.setStateAsync("system.cameraCount", { val: devices.filter((d) => d.ot === 2).length, ack: true });
      const activeFolders = new Set(devices.map((d) => this.deviceFolder(d)));
      for (const d of devices) {
        await this.buildDevice(d);
      }
      if (devices.length) {
        await this.pruneStaleDevices(activeFolders);
      }
      const stats = asJson((await this.apiGet("/command/getSystemStats")).data);
      if (stats) {
        const {
          disks: _disks,
          cpup,
          ramp,
          ramu,
          cpu_used,
          ram_free,
          disk_free: _disk_free,
          diskp,
          ...statsRest
        } = stats;
        if (cpup !== void 0) {
          await this.writeLeaf("system.hardware.cpu.percent", cpup, "%");
        }
        await this.delObjectAsync("system.hardware.cpu.used").catch(() => {
        });
        this.forgetEnsured("system.hardware.cpu.used");
        if (ramp !== void 0) {
          await this.writeLeaf("system.hardware.ram.percent", ramp, "%");
        }
        if (ramu !== void 0) {
          await this.writeLeaf("system.hardware.ram.used", toStr(ramu));
        }
        if (ram_free !== void 0) {
          await this.writeLeaf("system.hardware.ram.free", toStr(ram_free));
        }
        if (Object.keys(statsRest).length) {
          await this.flattenWrite(
            { ...statsRest, ...diskp !== void 0 && { disk_percent: diskp } },
            "system.stats",
            0
          );
        }
        for (const old of [
          "cpup",
          "ramp",
          "ramu",
          "diskp",
          "cpu_used",
          "ram_free",
          "disk_free",
          "cpu_percent",
          "ram_percent",
          "ram_used",
          "disk_percent"
        ]) {
          await this.delObjectAsync(`system.stats.${old}`).catch(() => {
          });
          this.forgetEnsured(`system.stats.${old}`);
        }
        for (const old of ["system.cpu", "system.ram", "system.drives", "system.disk_free_gb"]) {
          await this.delObjectAsync(old, { recursive: true }).catch(() => {
          });
          this.forgetEnsured(old);
        }
        const gb = parseSizeGb(stats.disk_free);
        if (gb !== null) {
          await this.writeLeaf("system.hardware.disk_free_gb", gb);
        }
        if (Array.isArray(stats.disks)) {
          const activeKeys = /* @__PURE__ */ new Set();
          for (const drv of stats.disks) {
            if (!drv || typeof drv !== "object") {
              continue;
            }
            const key = sanitize(toStr(drv.n).replace(/^\//, "") || "root") || "root";
            activeKeys.add(key);
            await this.writeLeaf(
              `system.hardware.drives.${key}.name`,
              toStr(drv.n) === "/" ? "/ Root" : toStr(drv.n)
            );
            await this.writeLeaf(`system.hardware.drives.${key}.free`, toStr(drv.d));
            await this.writeLeaf(`system.hardware.drives.${key}.used`, toStr(drv.u));
            await this.writeLeaf(
              `system.hardware.drives.${key}.percent`,
              typeof drv.p === "number" ? drv.p : 0,
              "%"
            );
            const fgb = parseSizeGb(drv.d);
            if (fgb !== null) {
              await this.writeLeaf(`system.hardware.drives.${key}.free_gb`, fgb);
            }
          }
          const allObjs = await this.getAdapterObjectsAsync();
          for (const fullId of Object.keys(allObjs)) {
            const rel = fullId.slice(this.namespace.length + 1);
            const m = rel.match(/^system\.hardware\.drives\.([^.]+)$/);
            if (m && !activeKeys.has(m[1])) {
              await this.delObjectAsync(rel, { recursive: true });
              this.forgetEnsured(rel);
            }
          }
        }
      }
      const status = asJson((await this.apiGet("/command/getStatus")).data);
      if (status) {
        await this.flattenWrite(status, "system.status", 0);
      }
      if (this.config.enableSystemControls && Array.isArray(json.profiles)) {
        const states = {};
        let activeInd = null;
        for (const p of json.profiles) {
          if (p && typeof p === "object") {
            const po = p;
            const ind = (_b = (_a = po.id) != null ? _a : po.ind) != null ? _b : po.index;
            const pname = po.name;
            if (typeof ind === "number" && (typeof pname === "string" || typeof pname === "number")) {
              states[ind] = String(pname);
              if (po.active === true) {
                activeInd = ind;
              }
            }
          }
        }
        if (Object.keys(states).length > 0) {
          const sig = JSON.stringify(states);
          if (sig !== this.profileSig) {
            this.profileSig = sig;
            await this.extendObjectAsync("system.profile.selector", { common: { states } });
            await this.setStateAsync("system.profile.list", { val: sig, ack: true });
          }
          if (activeInd !== null) {
            await this.setStateAsync("system.profile.selector", { val: activeInd, ack: true });
          }
        }
      }
      await this.writeWidgetConfig(devices.filter((d) => d.ot === 2));
      if (this.config.enableOverview) {
        const cams = devices.filter((d) => d.ot === 2);
        const ovId = "widget_live_overview";
        if (!this.ensuredFolders.has(ovId)) {
          await this.setObjectNotExistsAsync(ovId, {
            type: "state",
            common: {
              name: "Live overview widget (all cameras)",
              type: "string",
              role: "html",
              read: true,
              write: false,
              def: ""
            },
            native: {}
          });
          this.ensuredFolders.add(ovId);
        }
        if (this.shouldRefreshLiveWidget(ovId)) {
          await this.setStateAsync(ovId, { val: this.buildOverviewHtml(cams), ack: true });
        }
      }
      await this.setStateAsync("system.lastUpdate", { val: (/* @__PURE__ */ new Date()).toISOString(), ack: true });
      await this.setStateAsync("system.lastPoll", { val: Date.now(), ack: true });
    } finally {
      this.pollBusy = false;
    }
  }
  schedulePoll(delayMs) {
    if (this._pollStopped) {
      return;
    }
    this.pollTimer = this.setTimeout(() => {
      void this.poll().catch((e) => this.log.warn(`Poll error: ${e.message}`)).finally(() => this.schedulePoll(delayMs));
    }, delayMs);
  }
  scheduleRefresh() {
    if (this.refreshTimer !== void 0) {
      this.clearTimeout(this.refreshTimer);
      this.refreshTimer = void 0;
    }
    this.refreshTimer = this.setTimeout(
      () => this.poll().catch((e) => this.log.warn(`Refresh error: ${e.message}`)),
      1500
    );
  }
  // ---- command execution ----
  ptzUrl(oid, dir) {
    return `/ptz.cgi?oid=${encodeURIComponent(String(oid))}&dir=${dir}`;
  }
  buildCommandUrl(entry) {
    if (entry.kind === "ptz") {
      return this.ptzUrl(entry.oid, entry.dir);
    }
    if (entry.kind === "sys") {
      return entry.path;
    }
    const qs = [];
    for (const p of entry.params || []) {
      if (p === "oid") {
        qs.push(`oid=${encodeURIComponent(String(entry.oid))}`);
      } else if (p === "ot") {
        qs.push(`ot=${encodeURIComponent(String(entry.ot))}`);
      }
    }
    const base = entry.path || "";
    const sep = base.includes("?") ? "&" : "?";
    return base + (qs.length ? `${sep}${qs.join("&")}` : "");
  }
  async clearPtzSiblings(stateId) {
    const prefix = stateId.slice(0, stateId.lastIndexOf(".") + 1);
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
  async runCommand(relId, entry, val) {
    var _a, _b;
    if (entry.kind === "setProfile") {
      const ind = typeof val === "number" ? val : parseInt(String(val != null ? val : ""), 10);
      if (!isNaN(ind)) {
        const url2 = `/command/setProfile?ind=${ind}`;
        const cmdRes2 = await this.apiGet(url2);
        if (cmdRes2.ok) {
          this.log.debug(`OK: ${url2}`);
          await this.setStateAsync(relId, { val: ind, ack: true });
        } else {
          this.log.warn(`Command failed (${url2}): ${cmdRes2.error}`);
        }
        this.scheduleRefresh();
      }
      return;
    }
    if (entry.kind === "levelCmd") {
      const num = typeof val === "number" ? val : parseFloat(String(val != null ? val : ""));
      if (!isNaN(num)) {
        const url2 = `${entry.path}?oid=${encodeURIComponent(String(entry.oid))}&ot=${encodeURIComponent(String(entry.ot))}&${entry.valueParam}=${Math.round(num)}`;
        const cmdRes2 = await this.apiGet(url2);
        if (cmdRes2.ok) {
          this.log.debug(`OK: ${url2}`);
          await this.setStateAsync(relId, { val: Math.round(num), ack: true });
        } else {
          this.log.warn(`Command failed (${url2}): ${cmdRes2.error}`);
        }
        this.scheduleRefresh();
      }
      return;
    }
    if (entry.kind === "snapshotB64") {
      const snapId = `${entry.fid}.snapshot_b64`;
      await this.fetchSnapshotB64(entry.oid, snapId);
      await this.setStateAsync(relId, { val: false, ack: true });
      return;
    }
    if (entry.kind === "ptzPreset") {
      const idx = typeof val === "number" ? val : parseInt(String(val != null ? val : ""), 10);
      const name = isNaN(idx) ? "" : (_b = ((_a = entry.presetNames) != null ? _a : [])[idx]) != null ? _b : "";
      if (!name) {
        return;
      }
      const url2 = `/command/ptzpreset?oid=${encodeURIComponent(String(entry.oid))}&ot=2&preset=${encodeURIComponent(name)}`;
      const cmdRes2 = await this.apiGet(url2);
      if (cmdRes2.ok) {
        this.log.debug(`PTZ preset \u2192 ${name}`);
        await this.setStateAsync(relId, { val: idx, ack: true });
      } else {
        this.log.warn(`PTZ preset failed (${url2}): ${cmdRes2.error}`);
      }
      return;
    }
    if (entry.kind === "ptzHold") {
      const oid = entry.oid;
      const startMove = async () => {
        await this.clearPtzSiblings(relId);
        await this.apiGet(this.ptzUrl(oid, entry.dir));
        this.ptzActive.set(oid, relId);
        await this.setStateAsync(relId, { val: true, ack: true });
      };
      const stopMove = async () => {
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
    if (entry.kind === "sys" && entry.path === null) {
      await this.poll().catch((e) => this.log.warn(`Manual refresh error: ${e.message}`));
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
  module.exports = (options) => new AgentDvr(options);
} else {
  (() => new AgentDvr())();
}
//# sourceMappingURL=main.js.map
