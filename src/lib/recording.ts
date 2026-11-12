// Helpers for "recordings in the ioBroker file storage" and sendRecording/getRecording:
// ffmpeg detection, in-memory MKV -> MP4 remux, size limits, file names, URIs and URLs.
// Kept free of adapter state so they can be unit tested.

import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as http from 'node:http';
import * as path from 'node:path';

/** Telegram bots can upload at most 50 MB per file */
export const TELEGRAM_MAX_BYTES = 50 * 1024 * 1024;

export const MB = 1024 * 1024;

/** Result of the ffmpeg detection */
export interface FfmpegInfo {
	/** true if a working ffmpeg was found */
	found: boolean;
	/** ffmpeg version, e.g. 6.1.1 */
	version: string;
	/** binary that answered */
	path: string;
}

/**
 * Clamps a configured number into [min, max]; non-numbers fall back to the default.
 *
 * @param raw configured value
 * @param def default value
 * @param min lower bound
 * @param max upper bound
 */
export function clampNumber(raw: unknown, def: number, min: number, max: number): number {
	const n = typeof raw === 'number' ? raw : parseFloat(typeof raw === 'string' ? raw : '');
	if (!Number.isFinite(n)) {
		return def;
	}
	return Math.max(min, Math.min(max, Math.round(n)));
}

/**
 * Number of kept recordings per camera (1..3, default 1).
 *
 * @param raw configured value
 */
export function recordingSlots(raw: unknown): number {
	return clampNumber(raw, 1, 1, 3);
}

/**
 * Maximum recording size in bytes (configured in MB, 1..2000, default 50).
 *
 * @param rawMb configured value in MB
 */
export function maxRecordingBytes(rawMb: unknown): number {
	return clampNumber(rawMb, 50, 1, 2000) * MB;
}

/**
 * Size check result for a recording against a byte limit.
 *
 * @param bytes size of the recording (0/NaN = unknown → allowed)
 * @param limit maximum in bytes
 */
export function exceedsLimit(bytes: number, limit: number): boolean {
	return Number.isFinite(bytes) && bytes > 0 && bytes > limit;
}

/**
 * Human readable MB value with one decimal.
 *
 * @param bytes size in bytes
 */
export function fmtMb(bytes: number): string {
	return `${(Math.round((bytes / MB) * 10) / 10).toFixed(1)} MB`;
}

/**
 * File name of a stored recording slot inside the camera folder.
 *
 * @param slot slot number (1 = newest)
 * @param ext 'mp4' or 'mkv'
 */
export function recordingFileName(slot: number, ext: string): string {
	return `rec${slot}.${ext}`;
}

/**
 * Path of a stored recording inside the adapter's file storage (meta object = namespace).
 *
 * @param fid camera folder id, e.g. cam_8_Reolink
 * @param slot slot number
 * @param ext file extension
 */
export function recordingStoragePath(fid: string, slot: number, ext: string): string {
	return `${fid}/${recordingFileName(slot, ext)}`;
}

/**
 * Fixed per-camera file used by sendRecording/getRecording for recordings that are not in a slot.
 *
 * @param fid camera folder id
 * @param ext file extension
 */
export function sendFileStoragePath(fid: string, ext: string): string {
	return `${fid}/send.${ext}`;
}

/**
 * All recording files a camera can have in the file storage (slots and the send file).
 */
export function cameraRecordingFiles(): string[] {
	const out: string[] = [];
	for (const ext of ['mp4', 'mkv']) {
		for (let i = 1; i <= 3; i++) {
			out.push(`rec${i}.${ext}`);
		}
		out.push(`send.${ext}`);
	}
	return out;
}

/**
 * True if the current last recording should be stored on start: slot 1 empty or holding another recording.
 *
 * @param slot1Exists slot 1 file exists
 * @param name1 value of recordings.name1
 * @param lastFn file name of the newest recording in AgentDVR
 */
export function needsInitialFill(slot1Exists: boolean, name1: unknown, lastFn: string): boolean {
	if (!lastFn) {
		return false;
	}
	return !slot1Exists || name1 !== lastFn;
}

/**
 * ioBroker file URI resolved by telegram >= 6 (same format as the alert photos).
 *
 * @param namespace adapter namespace (meta object id), e.g. agent-dvr.0
 * @param fid camera folder id
 * @param slot slot number
 * @param ext file extension
 */
export function recordingUri(namespace: string, fid: string, slot: number, ext: string): string {
	return `iobfile://${namespace}/${recordingStoragePath(fid, slot, ext)}`;
}

/**
 * Absolute path where a file-based objects DB keeps the file (<dataDir>/files/<metaId>/<path>).
 *
 * @param dataDir ioBroker data directory (utils.getAbsoluteDefaultDataDir())
 * @param namespace meta object id
 * @param fid camera folder id
 * @param slot slot number
 * @param ext file extension
 */
export function recordingAbsPath(dataDir: string, namespace: string, fid: string, slot: number, ext: string): string {
	return path.join(dataDir, 'files', namespace, fid, recordingFileName(slot, ext));
}

/**
 * http(s) URL via the web extension, empty without a web instance.
 *
 * @param webBase base URL of the web instance, e.g. http://192.168.1.10:8082
 * @param namespace adapter namespace
 * @param fid camera folder id
 * @param slot slot number
 * @param ext file extension
 */
export function recordingUrl(webBase: string, namespace: string, fid: string, slot: number, ext: string): string {
	return webBase ? `${webBase}/${namespace}/recordings/${fid}/${recordingFileName(slot, ext)}` : '';
}

/**
 * Extension of an AgentDVR recording file name ('mkv' when unknown).
 *
 * @param fn file name, e.g. 8_2026-11-12_15-55-29_931.mkv
 */
export function extOf(fn: string): string {
	const m = /\.([A-Za-z0-9]+)$/.exec(fn || '');
	return m ? m[1].toLowerCase() : 'mkv';
}

/**
 * Mime type for a recording extension.
 *
 * @param ext file extension
 */
export function mimeOf(ext: string): string {
	return ext === 'mp4' ? 'video/mp4' : ext === 'mkv' ? 'video/x-matroska' : 'application/octet-stream';
}

/**
 * Only plain AgentDVR recording file names are accepted (no paths).
 *
 * @param fn requested file name
 */
export function isValidRecordingName(fn: string): boolean {
	return /^[\w.-]{1,200}\.(mkv|mp4)$/i.test(fn) && !fn.includes('..');
}

// ---- ffmpeg detection ----

/**
 * Ordered list of ffmpeg binaries to try: configured path, PATH lookup, common locations.
 *
 * @param configPath configured path (empty = auto)
 * @param platform process.platform
 * @param env process.env
 */
export function ffmpegCandidates(
	configPath: string,
	platform: string,
	env: Record<string, string | undefined>,
): string[] {
	const out: string[] = [];
	const add = (p: string | undefined): void => {
		const v = (p || '').trim();
		if (v && !out.includes(v)) {
			out.push(v);
		}
	};
	add(configPath);
	add('ffmpeg');
	if (platform === 'win32') {
		add('C:\\ffmpeg\\bin\\ffmpeg.exe');
		if (env.ProgramFiles) {
			add(`${env.ProgramFiles}\\ffmpeg\\bin\\ffmpeg.exe`);
		}
	} else {
		add('/usr/bin/ffmpeg');
		add('/usr/local/bin/ffmpeg');
		add('/opt/homebrew/bin/ffmpeg');
	}
	return out;
}

/**
 * Absolute path of a bare binary name found via PATH (for display), otherwise the name itself.
 *
 * @param bin binary name or path
 * @param env process.env
 * @param platform process.platform
 * @param exists file check (injectable for tests)
 */
export function resolveOnPath(
	bin: string,
	env: Record<string, string | undefined>,
	platform: string,
	exists: (p: string) => boolean = p => fs.existsSync(p),
): string {
	if (/[\\/]/.test(bin)) {
		return bin;
	}
	const win = platform === 'win32';
	const pathMod = win ? path.win32 : path.posix;
	const dirs = (env.PATH ?? env.Path ?? '').split(win ? ';' : ':').filter(Boolean);
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

/**
 * Version from `ffmpeg -version` output, e.g. "6.1.1" from "ffmpeg version 6.1.1-3ubuntu5 Copyright ...".
 *
 * @param out stdout of ffmpeg -version
 */
export function parseFfmpegVersion(out: string): string {
	const m = /ffmpeg version\s+(\S+)/i.exec(out || '');
	if (!m) {
		return '';
	}
	const v = /^n?(\d+(?:\.\d+)*)/.exec(m[1]);
	return v ? v[1] : m[1];
}

/**
 * Runs `<bin> -version` and returns the version, or '' if it is not a working ffmpeg.
 *
 * @param bin binary name or path
 * @param timeoutMs timeout
 */
export function probeFfmpeg(bin: string, timeoutMs = 5000): Promise<string> {
	return new Promise(resolve => {
		let out = '';
		let done = false;
		const timer: { id?: NodeJS.Timeout } = {};
		const finish = (v: string): void => {
			if (!done) {
				done = true;
				clearTimeout(timer.id);
				resolve(v);
			}
		};
		let child: ReturnType<typeof spawn>;
		try {
			child = spawn(bin, ['-version'], { shell: false, windowsHide: true });
		} catch {
			resolve('');
			return;
		}
		timer.id = setTimeout(() => {
			try {
				child.kill('SIGKILL');
			} catch {
				/* ignore */
			}
			finish('');
		}, timeoutMs);
		child.stdout?.on('data', (c: Buffer) => {
			if (out.length < 4096) {
				out += c.toString();
			}
		});
		child.on('error', () => finish(''));
		child.on('close', code => finish(code === 0 ? parseFfmpegVersion(out) : ''));
	});
}

/**
 * Tries the candidates in order and returns the first working ffmpeg.
 *
 * @param candidates binaries in priority order
 * @param probe returns the version or '' (injectable for tests)
 */
export async function detectFfmpeg(
	candidates: string[],
	probe: (bin: string) => Promise<string> = b => probeFfmpeg(b),
): Promise<FfmpegInfo> {
	for (const c of candidates) {
		const version = await probe(c);
		if (version) {
			return { found: true, version, path: c };
		}
	}
	return { found: false, version: '', path: '' };
}

/**
 * Text for info.ffmpeg.
 *
 * @param info detection result
 */
export function ffmpegStatusText(info: FfmpegInfo): string {
	return info.found ? `${info.version} (${info.path})` : 'not found';
}

// ---- remux ----

/**
 * True if the Matroska header announces an HEVC video track (needs the hvc1 tag in MP4 for Apple/Telegram).
 *
 * @param buf MKV data
 */
export function isHevcMkv(buf: Buffer): boolean {
	return buf.subarray(0, 256 * 1024).includes('V_MPEGH/ISO/HEVC');
}

/**
 * ffmpeg arguments for a lossless MKV → fragmented MP4 remux via stdin/stdout.
 *
 * @param hevc tag the video track as hvc1
 * @param dropAudio leave out the audio track
 */
export function remuxArgs(hevc: boolean, dropAudio: boolean): string[] {
	const args = ['-hide_banner', '-loglevel', 'error', '-i', 'pipe:0', '-map', '0:v:0'];
	if (!dropAudio) {
		args.push('-map', '0:a?');
	}
	args.push('-c', 'copy');
	if (hevc) {
		args.push('-tag:v', 'hvc1');
	}
	if (dropAudio) {
		args.push('-an');
	}
	args.push('-movflags', 'frag_keyframe+empty_moov', '-f', 'mp4', 'pipe:1');
	return args;
}

/**
 * Runs ffmpeg once with the input on stdin and collects stdout.
 *
 * @param bin ffmpeg binary
 * @param input input data
 * @param args ffmpeg arguments
 * @param timeoutMs timeout
 * @param maxBytes abort when the output gets larger
 */
export function runFfmpeg(
	bin: string,
	input: Buffer,
	args: string[],
	timeoutMs: number,
	maxBytes: number,
): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		let done = false;
		const timer: { id?: NodeJS.Timeout } = {};
		const chunks: Buffer[] = [];
		let size = 0;
		let err = '';
		const child = spawn(bin, args, { shell: false, windowsHide: true });
		const fail = (e: Error): void => {
			if (!done) {
				done = true;
				clearTimeout(timer.id);
				try {
					child.kill('SIGKILL');
				} catch {
					/* ignore */
				}
				reject(e);
			}
		};
		timer.id = setTimeout(
			() => fail(new Error(`ffmpeg timeout after ${Math.round(timeoutMs / 1000)} s`)),
			timeoutMs,
		);
		child.stdout.on('data', (c: Buffer) => {
			size += c.length;
			if (size > maxBytes) {
				fail(new Error(`MP4 larger than ${fmtMb(maxBytes)}`));
				return;
			}
			chunks.push(c);
		});
		child.stderr.on('data', (c: Buffer) => {
			if (err.length < 2000) {
				err += c.toString();
			}
		});
		child.on('error', e => fail(e));
		child.on('close', code => {
			if (done) {
				return;
			}
			done = true;
			clearTimeout(timer.id);
			if (code === 0 && size > 0) {
				resolve(Buffer.concat(chunks));
			} else {
				reject(new Error(`ffmpeg exit code ${code}: ${err.trim().split('\n').pop() || 'no output'}`));
			}
		});
		// EPIPE when ffmpeg stops reading early — the close handler reports the real error
		child.stdin.on('error', () => {});
		child.stdin.end(input);
	});
}

/**
 * Remuxes MKV to MP4 without re-encoding. Retries without audio if the audio codec can't go into MP4.
 *
 * @param bin ffmpeg binary
 * @param mkv input data
 * @param timeoutMs timeout per run
 * @param maxBytes output limit
 * @param onAudioDropped called when the retry without audio was needed
 * @param run ffmpeg runner (injectable for tests)
 */
export async function remuxToMp4(
	bin: string,
	mkv: Buffer,
	timeoutMs: number,
	maxBytes: number,
	onAudioDropped?: (reason: string) => void,
	run: typeof runFfmpeg = runFfmpeg,
): Promise<Buffer> {
	const hevc = isHevcMkv(mkv);
	try {
		return await run(bin, mkv, remuxArgs(hevc, false), timeoutMs, maxBytes);
	} catch (e) {
		const msg = (e as Error).message;
		if (/timeout|larger than|ENOENT|Invalid data|Error opening input/i.test(msg)) {
			throw e;
		}
		const out = await run(bin, mkv, remuxArgs(hevc, true), timeoutMs, maxBytes);
		onAudioDropped?.(msg);
		return out;
	}
}

// ---- download ----

/** Result of a download into memory */
export interface DownloadResult {
	/** download complete */
	ok: boolean;
	/** downloaded bytes */
	data?: Buffer;
	/** error text */
	error?: string;
	/** true when the download was stopped because of the size limit */
	tooLarge?: boolean;
	/** received or announced size in bytes */
	size?: number;
}

/**
 * GET into memory with timeout and size limit (Content-Length checked first, then the received bytes).
 *
 * @param opts request options (hostname, port, path, headers)
 * @param maxBytes size limit
 * @param timeoutMs overall timeout
 */
export function downloadToBuffer(
	opts: http.RequestOptions,
	maxBytes: number,
	timeoutMs: number,
): Promise<DownloadResult> {
	return new Promise(resolve => {
		let done = false;
		const timer: { id?: NodeJS.Timeout } = {};
		let req: http.ClientRequest | undefined;
		const finish = (r: DownloadResult): void => {
			if (!done) {
				done = true;
				clearTimeout(timer.id);
				resolve(r);
			}
		};
		timer.id = setTimeout(() => {
			req?.destroy();
			finish({ ok: false, error: `timeout after ${Math.round(timeoutMs / 1000)} s` });
		}, timeoutMs);
		try {
			req = http.request({ ...opts, method: 'GET' }, res => {
				if (res.statusCode && res.statusCode >= 400) {
					res.resume();
					finish({ ok: false, error: `HTTP ${res.statusCode}` });
					return;
				}
				const len = parseInt(String(res.headers['content-length'] ?? ''), 10);
				if (exceedsLimit(len, maxBytes)) {
					req?.destroy();
					finish({ ok: false, tooLarge: true, size: len, error: `${fmtMb(len)} > limit ${fmtMb(maxBytes)}` });
					return;
				}
				const chunks: Buffer[] = [];
				let size = 0;
				res.on('data', (c: Buffer) => {
					size += c.length;
					if (size > maxBytes) {
						req?.destroy();
						finish({ ok: false, tooLarge: true, size, error: `more than ${fmtMb(maxBytes)}` });
						return;
					}
					chunks.push(c);
				});
				res.on('end', () => finish({ ok: true, data: Buffer.concat(chunks), size }));
				res.on('error', (e: Error) => finish({ ok: false, error: e.message }));
			});
			req.on('error', (e: Error) => finish({ ok: false, error: e.message }));
			req.end();
		} catch (e) {
			finish({ ok: false, error: (e as Error).message });
		}
	});
}

// ---- camera lookup for sendTo ----

/** Camera reference for findCamera */
export interface CamRef {
	/** AgentDVR object id */
	oid: number | string;
	/** camera name */
	name: string;
	/** folder id, e.g. cam_8_Reolink */
	fid: string;
}

/**
 * Finds a camera by folder id (cam_8_Reolink), oid (8 / "8") or name (case-insensitive).
 *
 * @param query value from the message
 * @param cams known cameras
 */
export function findCamera(query: unknown, cams: CamRef[]): CamRef | undefined {
	if (query === undefined || query === null || query === '') {
		return undefined;
	}
	const q = (typeof query === 'number' ? String(query) : typeof query === 'string' ? query : '').trim();
	const ql = q.toLowerCase();
	return (
		cams.find(c => c.fid === q) ||
		cams.find(c => String(c.oid) === q) ||
		cams.find(c => c.name.toLowerCase() === ql) ||
		cams.find(c => q.endsWith(`.${c.fid}`))
	);
}

// ---- message bus guard ----

/** Metadata answered by sendRecording / getRecording — never the video data itself */
export interface ProvidedRecording {
	/** recording is available */
	ok: boolean;
	/** error text */
	error?: string;
	/** file name for the receiver, e.g. 8_2026-11-12_15-55-29_931.mp4 */
	fileName?: string;
	/** 'mp4' or 'mkv' */
	format?: string;
	/** mime type */
	mime?: string;
	/** size in bytes */
	size?: number;
	/** iobfile:// URI of the file in the adapter's file storage */
	uri?: string;
	/** http(s) URL via the web instance ('' without one) */
	url?: string;
	/** absolute path on the ioBroker host ('' if the file storage is not on the local disk) */
	file?: string;
}

/** Largest message the adapter puts on the message bus (sendTo answers and forwards) */
export const MAX_MESSAGE_BYTES = 64 * 1024;

/**
 * True if the value contains binary data: a Buffer, a typed array / ArrayBuffer or a
 * JSON-serialized Buffer ({ type: 'Buffer', data: [...] }).
 *
 * @param value value to check
 * @param depth recursion depth
 */
export function containsBinary(value: unknown, depth = 0): boolean {
	if (value === null || typeof value !== 'object') {
		return false;
	}
	if (depth > 20) {
		return true;
	}
	if (Buffer.isBuffer(value) || ArrayBuffer.isView(value) || value instanceof ArrayBuffer) {
		return true;
	}
	const o = value as Record<string, unknown>;
	if (o.type === 'Buffer' && Array.isArray(o.data)) {
		return true;
	}
	const children = Array.isArray(value) ? (value as unknown[]) : Object.values(o);
	return children.some(v => containsBinary(v, depth + 1));
}

/**
 * Throws if a message for the message bus contains binary data or is too large.
 *
 * @param value message
 */
export function assertNoBinary(value: unknown): void {
	if (containsBinary(value)) {
		throw new Error('refusing to put binary data on the ioBroker message bus');
	}
	const len = Buffer.byteLength(JSON.stringify(value ?? null));
	if (len > MAX_MESSAGE_BYTES) {
		throw new Error(`refusing to put ${len} bytes on the ioBroker message bus`);
	}
}

/**
 * Returns the message if it is safe for the message bus, otherwise a small error answer.
 *
 * @param value message
 */
export function safeMessage<T>(value: T): T | { ok: false; error: string } {
	try {
		assertNoBinary(value);
		return value;
	} catch (e) {
		return { ok: false, error: (e as Error).message };
	}
}
