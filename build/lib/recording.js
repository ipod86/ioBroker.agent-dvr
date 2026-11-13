"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var recording_exports = {};
__export(recording_exports, {
  MAX_MESSAGE_BYTES: () => MAX_MESSAGE_BYTES,
  MB: () => MB,
  TELEGRAM_MAX_BYTES: () => TELEGRAM_MAX_BYTES,
  assertNoBinary: () => assertNoBinary,
  cameraRecordingFiles: () => cameraRecordingFiles,
  clampNumber: () => clampNumber,
  containsBinary: () => containsBinary,
  detectFfmpeg: () => detectFfmpeg,
  downloadToBuffer: () => downloadToBuffer,
  exceedsLimit: () => exceedsLimit,
  extOf: () => extOf,
  ffmpegCandidates: () => ffmpegCandidates,
  ffmpegStatusText: () => ffmpegStatusText,
  findCamera: () => findCamera,
  fmtMb: () => fmtMb,
  isHevcMkv: () => isHevcMkv,
  isValidRecordingName: () => isValidRecordingName,
  maxRecordingBytes: () => maxRecordingBytes,
  mimeOf: () => mimeOf,
  needsInitialFill: () => needsInitialFill,
  parseFfmpegVersion: () => parseFfmpegVersion,
  probeFfmpeg: () => probeFfmpeg,
  recordingAbsPath: () => recordingAbsPath,
  recordingFileName: () => recordingFileName,
  recordingFinished: () => recordingFinished,
  recordingSlots: () => recordingSlots,
  recordingStoragePath: () => recordingStoragePath,
  recordingUri: () => recordingUri,
  recordingUrl: () => recordingUrl,
  remuxArgs: () => remuxArgs,
  remuxToMp4: () => remuxToMp4,
  resolveOnPath: () => resolveOnPath,
  runFfmpeg: () => runFfmpeg,
  safeMessage: () => safeMessage,
  sendFileStoragePath: () => sendFileStoragePath,
  videoInfo: () => videoInfo
});
module.exports = __toCommonJS(recording_exports);
var import_node_child_process = require("node:child_process");
var fs = __toESM(require("node:fs"));
var http = __toESM(require("node:http"));
var path = __toESM(require("node:path"));
const TELEGRAM_MAX_BYTES = 50 * 1024 * 1024;
const MB = 1024 * 1024;
function clampNumber(raw, def, min, max) {
  const n = typeof raw === "number" ? raw : parseFloat(typeof raw === "string" ? raw : "");
  if (!Number.isFinite(n)) {
    return def;
  }
  return Math.max(min, Math.min(max, Math.round(n)));
}
function recordingSlots(raw) {
  return clampNumber(raw, 1, 1, 3);
}
function maxRecordingBytes(rawMb) {
  return clampNumber(rawMb, 50, 1, 2e3) * MB;
}
function exceedsLimit(bytes, limit) {
  return Number.isFinite(bytes) && bytes > 0 && bytes > limit;
}
function fmtMb(bytes) {
  return `${(Math.round(bytes / MB * 10) / 10).toFixed(1)} MB`;
}
function recordingFileName(slot, ext) {
  return `rec${slot}.${ext}`;
}
function recordingStoragePath(fid, slot, ext) {
  return `${fid}/${recordingFileName(slot, ext)}`;
}
function sendFileStoragePath(fid, ext) {
  return `${fid}/send.${ext}`;
}
function cameraRecordingFiles() {
  const out = [];
  for (const ext of ["mp4", "mkv"]) {
    for (let i = 1; i <= 3; i++) {
      out.push(`rec${i}.${ext}`);
    }
    out.push(`send.${ext}`);
  }
  return out;
}
function needsInitialFill(slot1Exists, name1, lastFn) {
  if (!lastFn) {
    return false;
  }
  return !slot1Exists || name1 !== lastFn;
}
function recordingUri(namespace, fid, slot, ext) {
  return `iobfile://${namespace}/${recordingStoragePath(fid, slot, ext)}`;
}
function recordingAbsPath(dataDir, namespace, fid, slot, ext) {
  return path.join(dataDir, "files", namespace, fid, recordingFileName(slot, ext));
}
function recordingUrl(webBase, namespace, fid, slot, ext) {
  return webBase ? `${webBase}/${namespace}/recordings/${fid}/${recordingFileName(slot, ext)}` : "";
}
function extOf(fn) {
  const m = /\.([A-Za-z0-9]+)$/.exec(fn || "");
  return m ? m[1].toLowerCase() : "mkv";
}
function mimeOf(ext) {
  return ext === "mp4" ? "video/mp4" : ext === "mkv" ? "video/x-matroska" : "application/octet-stream";
}
function isValidRecordingName(fn) {
  return /^[\w.-]{1,200}\.(mkv|mp4)$/i.test(fn) && !fn.includes("..");
}
function ffmpegCandidates(configPath, platform) {
  const out = [];
  const add = (p) => {
    const v = (p || "").trim();
    if (v && !out.includes(v)) {
      out.push(v);
    }
  };
  add(configPath);
  add("ffmpeg");
  if (platform === "win32") {
    add("C:\\ffmpeg\\bin\\ffmpeg.exe");
    add("C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe");
  } else {
    add("/usr/bin/ffmpeg");
    add("/usr/local/bin/ffmpeg");
    add("/opt/homebrew/bin/ffmpeg");
  }
  return out;
}
function resolveOnPath(bin, platform, exists = (p) => fs.existsSync(p)) {
  if (/[\\/]/.test(bin)) {
    return bin;
  }
  const win = platform === "win32";
  const pathMod = win ? path.win32 : path.posix;
  const dirs = win ? ["C:\\ffmpeg\\bin", "C:\\Program Files\\ffmpeg\\bin"] : ["/usr/bin", "/usr/local/bin", "/opt/homebrew/bin", "/bin"];
  const names = win && !/\.exe$/i.test(bin) ? [`${bin}.exe`, bin] : [bin];
  for (const d of dirs) {
    for (const n of names) {
      const full = pathMod.join(d, n);
      if (exists(full)) {
        return full;
      }
    }
  }
  return bin;
}
function parseFfmpegVersion(out) {
  const m = /ffmpeg version\s+(\S+)/i.exec(out || "");
  if (!m) {
    return "";
  }
  const v = /^n?(\d+(?:\.\d+)*)/.exec(m[1]);
  return v ? v[1] : m[1];
}
function probeFfmpeg(bin, timeoutMs = 5e3) {
  return new Promise((resolve) => {
    var _a;
    let out = "";
    let done = false;
    const timer = {};
    const finish = (v) => {
      if (!done) {
        done = true;
        clearTimeout(timer.id);
        resolve(v);
      }
    };
    let child;
    try {
      child = (0, import_node_child_process.spawn)(bin, ["-version"], { shell: false, windowsHide: true });
    } catch {
      resolve("");
      return;
    }
    timer.id = setTimeout(() => {
      try {
        child.kill("SIGKILL");
      } catch {
      }
      finish("");
    }, timeoutMs);
    (_a = child.stdout) == null ? void 0 : _a.on("data", (c) => {
      if (out.length < 4096) {
        out += c.toString();
      }
    });
    child.on("error", () => finish(""));
    child.on("close", (code) => finish(code === 0 ? parseFfmpegVersion(out) : ""));
  });
}
async function detectFfmpeg(candidates, probe = (b) => probeFfmpeg(b)) {
  for (const c of candidates) {
    const version = await probe(c);
    if (version) {
      return { found: true, version, path: c };
    }
  }
  return { found: false, version: "", path: "" };
}
function ffmpegStatusText(info) {
  return info.found ? `${info.version} (${info.path})` : "not found";
}
function recordingFinished(prevSize, size, recording) {
  return !recording && size > 0 && size === prevSize;
}
function* mp4Boxes(buf, from, to) {
  let p = from;
  while (p + 8 <= to) {
    let size = buf.readUInt32BE(p);
    const type = buf.toString("latin1", p + 4, p + 8);
    let head = 8;
    if (size === 1) {
      if (p + 16 > to) {
        return;
      }
      size = Number(buf.readBigUInt64BE(p + 8));
      head = 16;
    } else if (size === 0) {
      size = to - p;
    }
    if (size < head) {
      return;
    }
    yield { type, start: p + head, end: Math.min(p + size, to) };
    p += size;
  }
}
function mp4Child(buf, parent, type) {
  for (const b of mp4Boxes(buf, parent.start, parent.end)) {
    if (b.type === type) {
      return b;
    }
  }
  return void 0;
}
function mp4Info(buf) {
  const info = { width: 0, height: 0, duration: 0 };
  const top = [...mp4Boxes(buf, 0, buf.length)];
  const moov = top.find((b) => b.type === "moov");
  if (!moov) {
    return info;
  }
  let videoId = 0;
  let videoScale = 0;
  for (const trak of mp4Boxes(buf, moov.start, moov.end)) {
    if (trak.type !== "trak") {
      continue;
    }
    const tkhd = mp4Child(buf, trak, "tkhd");
    if (!tkhd || tkhd.end - tkhd.start < 84) {
      continue;
    }
    const w = buf.readUInt32BE(tkhd.end - 8) / 65536;
    const h = buf.readUInt32BE(tkhd.end - 4) / 65536;
    if (w > 0 && h > 0) {
      const v1 = buf[tkhd.start] === 1;
      videoId = buf.readUInt32BE(tkhd.start + (v1 ? 20 : 12));
      info.width = Math.round(w);
      info.height = Math.round(h);
      const mdia = mp4Child(buf, trak, "mdia");
      const mdhd = mdia && mp4Child(buf, mdia, "mdhd");
      if (mdhd) {
        videoScale = buf.readUInt32BE(mdhd.start + (buf[mdhd.start] === 1 ? 20 : 12));
      }
      break;
    }
  }
  const mvhd = mp4Child(buf, moov, "mvhd");
  if (mvhd) {
    const v1 = buf[mvhd.start] === 1;
    const scale = buf.readUInt32BE(mvhd.start + (v1 ? 20 : 12));
    const dur = v1 ? Number(buf.readBigUInt64BE(mvhd.start + 24)) : buf.readUInt32BE(mvhd.start + 16);
    if (scale > 0 && dur > 0) {
      info.duration = Math.round(dur / scale);
    }
  }
  if (!info.duration && videoId && videoScale) {
    let end = 0;
    for (const moof of top) {
      if (moof.type !== "moof") {
        continue;
      }
      for (const traf of mp4Boxes(buf, moof.start, moof.end)) {
        if (traf.type !== "traf") {
          continue;
        }
        const tfhd = mp4Child(buf, traf, "tfhd");
        if (!tfhd || buf.readUInt32BE(tfhd.start + 4) !== videoId) {
          continue;
        }
        const tfFlags = buf.readUInt32BE(tfhd.start) & 16777215;
        let q = tfhd.start + 8;
        if (tfFlags & 1) {
          q += 8;
        }
        if (tfFlags & 2) {
          q += 4;
        }
        const defDur = tfFlags & 8 ? buf.readUInt32BE(q) : 0;
        const tfdt = mp4Child(buf, traf, "tfdt");
        let t = 0;
        if (tfdt) {
          t = buf[tfdt.start] === 1 ? Number(buf.readBigUInt64BE(tfdt.start + 4)) : buf.readUInt32BE(tfdt.start + 4);
        }
        for (const trun of mp4Boxes(buf, traf.start, traf.end)) {
          if (trun.type !== "trun") {
            continue;
          }
          const flags = buf.readUInt32BE(trun.start) & 16777215;
          const count = buf.readUInt32BE(trun.start + 4);
          let r = trun.start + 8 + (flags & 1 ? 4 : 0) + (flags & 4 ? 4 : 0);
          const per = (flags & 256 ? 4 : 0) + (flags & 512 ? 4 : 0) + (flags & 1024 ? 4 : 0) + (flags & 2048 ? 4 : 0);
          for (let i = 0; i < count && r + per <= trun.end; i++) {
            t += flags & 256 ? buf.readUInt32BE(r) : defDur;
            r += per;
          }
        }
        end = Math.max(end, t);
      }
    }
    if (end > 0) {
      info.duration = Math.round(end / videoScale);
    }
  }
  return info;
}
function ebmlVint(buf, p, keepMarker) {
  if (p >= buf.length) {
    return null;
  }
  const first = buf[p];
  let len = 1;
  while (len <= 8 && !(first & 128 >> len - 1)) {
    len++;
  }
  if (len > 8 || p + len > buf.length) {
    return null;
  }
  let val = keepMarker ? first : first & 255 >> len;
  let allOnes = (first & 255 >> len) === 255 >> len;
  for (let i = 1; i < len; i++) {
    val = val * 256 + buf[p + i];
    if (buf[p + i] !== 255) {
      allOnes = false;
    }
  }
  return { val, len, unknown: allOnes };
}
function mkvInfo(buf) {
  const info = { width: 0, height: 0, duration: 0 };
  let scale = 1e6;
  let durTicks = 0;
  const MASTER = /* @__PURE__ */ new Set([408125543, 357149030, 374648427, 174, 224]);
  const walk = (from, to, depth) => {
    let p = from;
    while (p < to && depth < 6) {
      const id = ebmlVint(buf, p, true);
      const size = id && ebmlVint(buf, p + id.len, false);
      if (!id || !size) {
        return;
      }
      const start = p + id.len + size.len;
      const end = size.unknown ? to : Math.min(start + size.val, to);
      if (id.val === 524531317) {
        return;
      }
      if (MASTER.has(id.val)) {
        walk(start, end, depth + 1);
      } else if (id.val === 176 || id.val === 186 || id.val === 2807729) {
        let v = 0;
        for (let i = start; i < end; i++) {
          v = v * 256 + buf[i];
        }
        if (id.val === 176 && !info.width) {
          info.width = v;
        } else if (id.val === 186 && !info.height) {
          info.height = v;
        } else if (id.val === 2807729) {
          scale = v;
        }
      } else if (id.val === 17545) {
        durTicks = end - start === 8 ? buf.readDoubleBE(start) : end - start === 4 ? buf.readFloatBE(start) : 0;
      }
      if (size.unknown) {
        return;
      }
      p = end;
    }
  };
  walk(0, buf.length, 0);
  if (durTicks > 0) {
    info.duration = Math.round(durTicks * scale / 1e9);
  }
  return info;
}
function videoInfo(buf, format) {
  try {
    return format === "mkv" ? mkvInfo(buf) : mp4Info(buf);
  } catch {
    return { width: 0, height: 0, duration: 0 };
  }
}
function isHevcMkv(buf) {
  return buf.subarray(0, 256 * 1024).includes("V_MPEGH/ISO/HEVC");
}
function remuxArgs(hevc, dropAudio) {
  const args = ["-hide_banner", "-loglevel", "error", "-i", "pipe:0", "-map", "0:v:0"];
  if (!dropAudio) {
    args.push("-map", "0:a?");
  }
  args.push("-c", "copy");
  if (hevc) {
    args.push("-tag:v", "hvc1");
  }
  if (dropAudio) {
    args.push("-an");
  }
  args.push("-movflags", "frag_keyframe+empty_moov", "-f", "mp4", "pipe:1");
  return args;
}
function runFfmpeg(bin, input, args, timeoutMs, maxBytes) {
  return new Promise((resolve, reject) => {
    let done = false;
    const timer = {};
    const chunks = [];
    let size = 0;
    let err = "";
    const child = (0, import_node_child_process.spawn)(bin, args, { shell: false, windowsHide: true });
    const fail = (e) => {
      if (!done) {
        done = true;
        clearTimeout(timer.id);
        try {
          child.kill("SIGKILL");
        } catch {
        }
        reject(e);
      }
    };
    timer.id = setTimeout(
      () => fail(new Error(`ffmpeg timeout after ${Math.round(timeoutMs / 1e3)} s`)),
      timeoutMs
    );
    child.stdout.on("data", (c) => {
      size += c.length;
      if (size > maxBytes) {
        fail(new Error(`MP4 larger than ${fmtMb(maxBytes)}`));
        return;
      }
      chunks.push(c);
    });
    child.stderr.on("data", (c) => {
      if (err.length < 2e3) {
        err += c.toString();
      }
    });
    child.on("error", (e) => fail(e));
    child.on("close", (code) => {
      if (done) {
        return;
      }
      done = true;
      clearTimeout(timer.id);
      if (code === 0 && size > 0) {
        resolve(Buffer.concat(chunks));
      } else {
        reject(new Error(`ffmpeg exit code ${code}: ${err.trim().split("\n").pop() || "no output"}`));
      }
    });
    child.stdin.on("error", () => {
    });
    child.stdin.end(input);
  });
}
async function remuxToMp4(bin, mkv, timeoutMs, maxBytes, onAudioDropped, run = runFfmpeg) {
  const hevc = isHevcMkv(mkv);
  try {
    return await run(bin, mkv, remuxArgs(hevc, false), timeoutMs, maxBytes);
  } catch (e) {
    const msg = e.message;
    if (/timeout|larger than|ENOENT|Invalid data|Error opening input/i.test(msg)) {
      throw e;
    }
    const out = await run(bin, mkv, remuxArgs(hevc, true), timeoutMs, maxBytes);
    onAudioDropped == null ? void 0 : onAudioDropped(msg);
    return out;
  }
}
function downloadToBuffer(opts, maxBytes, timeoutMs) {
  return new Promise((resolve) => {
    let done = false;
    const timer = {};
    let req;
    const finish = (r) => {
      if (!done) {
        done = true;
        clearTimeout(timer.id);
        resolve(r);
      }
    };
    timer.id = setTimeout(() => {
      req == null ? void 0 : req.destroy();
      finish({ ok: false, error: `timeout after ${Math.round(timeoutMs / 1e3)} s` });
    }, timeoutMs);
    try {
      req = http.request({ ...opts, method: "GET" }, (res) => {
        var _a;
        if (res.statusCode && res.statusCode >= 400) {
          res.resume();
          finish({ ok: false, error: `HTTP ${res.statusCode}` });
          return;
        }
        const len = parseInt(String((_a = res.headers["content-length"]) != null ? _a : ""), 10);
        if (exceedsLimit(len, maxBytes)) {
          req == null ? void 0 : req.destroy();
          finish({ ok: false, tooLarge: true, size: len, error: `${fmtMb(len)} > limit ${fmtMb(maxBytes)}` });
          return;
        }
        const chunks = [];
        let size = 0;
        res.on("data", (c) => {
          size += c.length;
          if (size > maxBytes) {
            req == null ? void 0 : req.destroy();
            finish({ ok: false, tooLarge: true, size, error: `more than ${fmtMb(maxBytes)}` });
            return;
          }
          chunks.push(c);
        });
        res.on("end", () => finish({ ok: true, data: Buffer.concat(chunks), size }));
        res.on("error", (e) => finish({ ok: false, error: e.message }));
      });
      req.on("error", (e) => finish({ ok: false, error: e.message }));
      req.end();
    } catch (e) {
      finish({ ok: false, error: e.message });
    }
  });
}
function findCamera(query, cams) {
  if (query === void 0 || query === null || query === "") {
    return void 0;
  }
  const q = (typeof query === "number" ? String(query) : typeof query === "string" ? query : "").trim();
  const ql = q.toLowerCase();
  return cams.find((c) => c.fid === q) || cams.find((c) => String(c.oid) === q) || cams.find((c) => c.name.toLowerCase() === ql) || cams.find((c) => q.endsWith(`.${c.fid}`));
}
const MAX_MESSAGE_BYTES = 64 * 1024;
function containsBinary(value, depth = 0) {
  if (value === null || typeof value !== "object") {
    return false;
  }
  if (depth > 20) {
    return true;
  }
  if (Buffer.isBuffer(value) || ArrayBuffer.isView(value) || value instanceof ArrayBuffer) {
    return true;
  }
  const o = value;
  if (o.type === "Buffer" && Array.isArray(o.data)) {
    return true;
  }
  const children = Array.isArray(value) ? value : Object.values(o);
  return children.some((v) => containsBinary(v, depth + 1));
}
function assertNoBinary(value) {
  if (containsBinary(value)) {
    throw new Error("refusing to put binary data on the ioBroker message bus");
  }
  const len = Buffer.byteLength(JSON.stringify(value != null ? value : null));
  if (len > MAX_MESSAGE_BYTES) {
    throw new Error(`refusing to put ${len} bytes on the ioBroker message bus`);
  }
}
function safeMessage(value) {
  try {
    assertNoBinary(value);
    return value;
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  MAX_MESSAGE_BYTES,
  MB,
  TELEGRAM_MAX_BYTES,
  assertNoBinary,
  cameraRecordingFiles,
  clampNumber,
  containsBinary,
  detectFfmpeg,
  downloadToBuffer,
  exceedsLimit,
  extOf,
  ffmpegCandidates,
  ffmpegStatusText,
  findCamera,
  fmtMb,
  isHevcMkv,
  isValidRecordingName,
  maxRecordingBytes,
  mimeOf,
  needsInitialFill,
  parseFfmpegVersion,
  probeFfmpeg,
  recordingAbsPath,
  recordingFileName,
  recordingFinished,
  recordingSlots,
  recordingStoragePath,
  recordingUri,
  recordingUrl,
  remuxArgs,
  remuxToMp4,
  resolveOnPath,
  runFfmpeg,
  safeMessage,
  sendFileStoragePath,
  videoInfo
});
//# sourceMappingURL=recording.js.map
