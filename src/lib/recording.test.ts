import { expect } from 'chai';
import * as http from 'node:http';
import type { AddressInfo } from 'node:net';
import * as path from 'node:path';
import {
	MB,
	TELEGRAM_MAX_BYTES,
	clampNumber,
	detectFfmpeg,
	downloadToBuffer,
	exceedsLimit,
	extOf,
	ffmpegCandidates,
	ffmpegStatusText,
	findCamera,
	isHevcMkv,
	isValidRecordingName,
	maxRecordingBytes,
	parseFfmpegVersion,
	recordingAbsPath,
	recordingSlots,
	recordingStoragePath,
	recordingUri,
	recordingUrl,
	remuxArgs,
	remuxToMp4,
	resolveOnPath,
	assertNoBinary,
	containsBinary,
	safeMessage,
	sendFileStoragePath,
} from './recording';

describe('recording → ffmpeg detection', () => {
	it('tries configured path, then PATH, then common locations (Linux/macOS)', () => {
		expect(ffmpegCandidates('/opt/ff/ffmpeg', 'linux', {})).to.deep.equal([
			'/opt/ff/ffmpeg',
			'ffmpeg',
			'/usr/bin/ffmpeg',
			'/usr/local/bin/ffmpeg',
			'/opt/homebrew/bin/ffmpeg',
		]);
	});

	it('skips an empty configured path and duplicates', () => {
		expect(ffmpegCandidates('  ', 'darwin', {})[0]).to.equal('ffmpeg');
		expect(ffmpegCandidates('/usr/bin/ffmpeg', 'linux', {}).filter(p => p === '/usr/bin/ffmpeg')).to.have.length(1);
	});

	it('uses Windows locations on win32', () => {
		expect(ffmpegCandidates('', 'win32', { ProgramFiles: 'C:\\Program Files' })).to.deep.equal([
			'ffmpeg',
			'C:\\ffmpeg\\bin\\ffmpeg.exe',
			'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
		]);
	});

	it('returns the first candidate that answers, in order', async () => {
		const asked: string[] = [];
		const probe = (b: string): Promise<string> => {
			asked.push(b);
			return Promise.resolve(b === '/usr/local/bin/ffmpeg' || b === '/opt/homebrew/bin/ffmpeg' ? '6.1.1' : '');
		};
		const info = await detectFfmpeg(ffmpegCandidates('', 'linux', {}), probe);
		expect(info).to.deep.equal({ found: true, version: '6.1.1', path: '/usr/local/bin/ffmpeg' });
		expect(asked).to.deep.equal(['ffmpeg', '/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg']);
		expect(ffmpegStatusText(info)).to.equal('6.1.1 (/usr/local/bin/ffmpeg)');
	});

	it('reports not found', async () => {
		const info = await detectFfmpeg(['a', 'b'], () => Promise.resolve(''));
		expect(info.found).to.equal(false);
		expect(ffmpegStatusText(info)).to.equal('not found');
	});

	it('shows the absolute path of a binary found via PATH', () => {
		const exists = (p: string): boolean => p === '/usr/bin/ffmpeg';
		expect(resolveOnPath('ffmpeg', { PATH: '/usr/local/bin:/usr/bin' }, 'linux', exists)).to.equal(
			'/usr/bin/ffmpeg',
		);
		expect(resolveOnPath('ffmpeg', { PATH: '/nope' }, 'linux', exists)).to.equal('ffmpeg');
		expect(resolveOnPath('/opt/x/ffmpeg', { PATH: '/usr/bin' }, 'linux', exists)).to.equal('/opt/x/ffmpeg');
		expect(resolveOnPath('ffmpeg', { Path: 'C:\\tools' }, 'win32', p => p === 'C:\\tools\\ffmpeg.exe')).to.equal(
			'C:\\tools\\ffmpeg.exe',
		);
	});

	it('parses the version line', () => {
		expect(parseFfmpegVersion('ffmpeg version 6.1.1-3ubuntu5 Copyright (c) 2000-2023')).to.equal('6.1.1');
		expect(parseFfmpegVersion('ffmpeg version n7.0 Copyright')).to.equal('7.0');
		expect(parseFfmpegVersion('ffmpeg version N-112345-gabc Copyright')).to.equal('N-112345-gabc');
		expect(parseFfmpegVersion('something else')).to.equal('');
	});
});

describe('recording → paths, URIs, URLs', () => {
	it('builds the storage path, iobfile URI and web URL like the alert photos', () => {
		expect(recordingStoragePath('cam_8_Reolink', 1, 'mp4')).to.equal('cam_8_Reolink/rec1.mp4');
		expect(recordingUri('agent-dvr.0', 'cam_8_Reolink', 2, 'mkv')).to.equal(
			'iobfile://agent-dvr.0/cam_8_Reolink/rec2.mkv',
		);
		expect(recordingUrl('http://192.168.1.10:8082', 'agent-dvr.0', 'cam_8_Reolink', 1, 'mp4')).to.equal(
			'http://192.168.1.10:8082/agent-dvr.0/recordings/cam_8_Reolink/rec1.mp4',
		);
		expect(recordingUrl('', 'agent-dvr.0', 'cam_8_Reolink', 1, 'mp4')).to.equal('');
		expect(sendFileStoragePath('cam_8_Reolink', 'mp4')).to.equal('cam_8_Reolink/send.mp4');
	});

	it('builds the absolute path inside <dataDir>/files/<metaId>', () => {
		expect(recordingAbsPath('/opt/iobroker/iobroker-data', 'agent-dvr.0', 'cam_8_Reolink', 3, 'mp4')).to.equal(
			path.join('/opt/iobroker/iobroker-data', 'files', 'agent-dvr.0', 'cam_8_Reolink', 'rec3.mp4'),
		);
	});

	it('derives extension and validates file names', () => {
		expect(extOf('8_2026-11-12_15-55-29_931.mkv')).to.equal('mkv');
		expect(extOf('TimeLapse_8.MP4')).to.equal('mp4');
		expect(extOf('')).to.equal('mkv');
		expect(isValidRecordingName('8_2026-11-12_15-55-29_931.mkv')).to.equal(true);
		expect(isValidRecordingName('../etc/passwd.mkv')).to.equal(false);
		expect(isValidRecordingName('a/b.mkv')).to.equal(false);
		expect(isValidRecordingName('video.avi')).to.equal(false);
	});

	it('finds cameras by folder id, oid, name or full id', () => {
		const cams = [
			{ oid: 8, name: 'Reolink', fid: 'cam_8_Reolink' },
			{ oid: 9, name: 'Trift', fid: 'cam_9_Trift' },
		];
		expect(findCamera('cam_9_Trift', cams)?.oid).to.equal(9);
		expect(findCamera(8, cams)?.fid).to.equal('cam_8_Reolink');
		expect(findCamera('8', cams)?.fid).to.equal('cam_8_Reolink');
		expect(findCamera('reolink', cams)?.oid).to.equal(8);
		expect(findCamera('agent-dvr.0.cam_9_Trift', cams)?.oid).to.equal(9);
		expect(findCamera('nope', cams)).to.equal(undefined);
		expect(findCamera(undefined, cams)).to.equal(undefined);
	});
});

describe('recording → limits and settings validation', () => {
	it('clamps the number of recordings to 1..3', () => {
		expect(recordingSlots(undefined)).to.equal(1);
		expect(recordingSlots(0)).to.equal(1);
		expect(recordingSlots(2)).to.equal(2);
		expect(recordingSlots('3')).to.equal(3);
		expect(recordingSlots(7)).to.equal(3);
	});

	it('validates the maximum size (> 0, default 50 MB)', () => {
		expect(maxRecordingBytes(undefined)).to.equal(50 * MB);
		expect(maxRecordingBytes(0)).to.equal(1 * MB);
		expect(maxRecordingBytes(-5)).to.equal(1 * MB);
		expect(maxRecordingBytes('abc')).to.equal(50 * MB);
		expect(maxRecordingBytes(100)).to.equal(100 * MB);
		expect(clampNumber(5, 120, 10, 900)).to.equal(10);
	});

	it('only rejects known sizes above the limit', () => {
		expect(exceedsLimit(51 * MB, 50 * MB)).to.equal(true);
		expect(exceedsLimit(50 * MB, 50 * MB)).to.equal(false);
		expect(exceedsLimit(0, 50 * MB)).to.equal(false);
		expect(exceedsLimit(NaN, 50 * MB)).to.equal(false);
		expect(TELEGRAM_MAX_BYTES).to.equal(50 * MB);
	});
});

describe('recording → download with size limit', () => {
	let server: http.Server;
	let port = 0;
	before(done => {
		server = http.createServer((req, res) => {
			if (req.url === '/big-announced') {
				res.writeHead(200, { 'Content-Length': String(2000) });
				res.end(Buffer.alloc(2000));
			} else if (req.url === '/big-chunked') {
				res.writeHead(200);
				res.write(Buffer.alloc(600));
				res.end(Buffer.alloc(600));
			} else if (req.url === '/slow') {
				// never answers
			} else if (req.url === '/missing') {
				res.writeHead(404);
				res.end();
			} else {
				res.end(Buffer.from('hello'));
			}
		});
		server.listen(0, '127.0.0.1', () => {
			port = (server.address() as AddressInfo).port;
			done();
		});
	});
	after(done => {
		server.closeAllConnections?.();
		server.close(() => done());
	});

	const get = (p: string, max: number, timeout = 2000): ReturnType<typeof downloadToBuffer> =>
		downloadToBuffer({ hostname: '127.0.0.1', port, path: p }, max, timeout);

	it('downloads small files', async () => {
		const r = await get('/ok', 1000);
		expect(r.ok).to.equal(true);
		expect(r.data?.toString()).to.equal('hello');
	});

	it('rejects by Content-Length', async () => {
		const r = await get('/big-announced', 1000);
		expect(r.ok).to.equal(false);
		expect(r.tooLarge).to.equal(true);
	});

	it('stops when more bytes than allowed arrive', async () => {
		const r = await get('/big-chunked', 1000);
		expect(r.ok).to.equal(false);
		expect(r.tooLarge).to.equal(true);
	});

	it('reports HTTP errors and timeouts', async () => {
		expect((await get('/missing', 1000)).error).to.equal('HTTP 404');
		const r = await get('/slow', 1000, 200);
		expect(r.ok).to.equal(false);
		expect(r.error).to.match(/timeout/);
	});
});

describe('recording → remux', () => {
	it('builds copy-only args, hvc1 tag for HEVC, -an for the retry', () => {
		const a = remuxArgs(false, false);
		expect(a).to.include.members(['-i', 'pipe:0', '-c', 'copy', 'pipe:1']);
		expect(a.join(' ')).to.contain('-movflags frag_keyframe+empty_moov -f mp4');
		expect(a).to.not.include('-an');
		expect(remuxArgs(true, false).join(' ')).to.contain('-tag:v hvc1');
		expect(remuxArgs(false, true)).to.include('-an');
	});

	it('detects HEVC in the Matroska header', () => {
		expect(isHevcMkv(Buffer.from('xxxxV_MPEGH/ISO/HEVCyyyy'))).to.equal(true);
		expect(isHevcMkv(Buffer.from('xxxxV_MPEG4/ISO/AVCyyyy'))).to.equal(false);
	});

	it('retries without audio once and reports it', async () => {
		const calls: string[][] = [];
		let reason = '';
		const run = (_b: string, _i: Buffer, args: string[]): Promise<Buffer> => {
			calls.push(args);
			return args.includes('-an')
				? Promise.resolve(Buffer.from('mp4'))
				: Promise.reject(new Error('ffmpeg exit code 1: Could not find tag for codec pcm_alaw'));
		};
		const out = await remuxToMp4('ffmpeg', Buffer.from('mkv'), 1000, 1000, r => (reason = r), run);
		expect(out.toString()).to.equal('mp4');
		expect(calls).to.have.length(2);
		expect(reason).to.contain('pcm_alaw');
	});

	it('does not retry on timeout', async () => {
		let n = 0;
		const run = (): Promise<Buffer> => {
			n++;
			return Promise.reject(new Error('ffmpeg timeout after 1 s'));
		};
		let err = '';
		await remuxToMp4('ffmpeg', Buffer.from('mkv'), 1000, 1000, undefined, run).catch(e => (err = e.message));
		expect(err).to.contain('timeout');
		expect(n).to.equal(1);
	});
});

describe('recording → message bus guard', () => {
	const meta = {
		ok: true,
		fileName: '8_2026-11-12_15-55-29_931.mp4',
		format: 'mp4',
		mime: 'video/mp4',
		size: 48574441,
		uri: 'iobfile://agent-dvr.0/cam_8_Reolink/send.mp4',
		url: '',
		file: '/opt/iobroker/iobroker-data/files/agent-dvr.0/cam_8_Reolink/send.mp4',
	};

	it('lets metadata through', () => {
		expect(containsBinary(meta)).to.equal(false);
		expect(() => assertNoBinary(meta)).to.not.throw();
		expect(safeMessage(meta)).to.equal(meta);
		expect(() => assertNoBinary({ text: meta.uri, type: 'video', caption: 'x', chatId: 1 })).to.not.throw();
	});

	it('finds Buffers, typed arrays and serialized Buffers, also nested', () => {
		expect(containsBinary(Buffer.from('x'))).to.equal(true);
		expect(containsBinary({ ...meta, data: Buffer.alloc(10) })).to.equal(true);
		expect(containsBinary({ a: [{ b: new Uint8Array(3) }] })).to.equal(true);
		expect(containsBinary({ a: new ArrayBuffer(3) })).to.equal(true);
		expect(containsBinary({ text: { type: 'Buffer', data: [1, 2, 3] } })).to.equal(true);
		expect(containsBinary(JSON.parse(JSON.stringify({ d: Buffer.from('abc') })))).to.equal(true);
	});

	it('refuses binary or oversized messages', () => {
		expect(() => assertNoBinary({ text: Buffer.alloc(1), type: 'video' })).to.throw(/binary/);
		expect(() => assertNoBinary({ text: 'x'.repeat(70 * 1024) })).to.throw(/bytes/);
		const r = safeMessage({ ok: true, data: Buffer.alloc(46 * 1024 * 1024) }) as { ok: boolean; error: string };
		expect(r.ok).to.equal(false);
		expect(r.error).to.match(/binary/);
		expect(r).to.not.have.property('data');
	});
});
