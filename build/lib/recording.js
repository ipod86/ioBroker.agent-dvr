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
  sendFileStoragePath: () => sendFileStoragePath
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
  sendFileStoragePath
});
//# sourceMappingURL=recording.js.map
