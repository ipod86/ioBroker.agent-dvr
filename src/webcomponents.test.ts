import { expect } from 'chai';
import * as fs from 'node:fs';
import * as path from 'node:path';

// The web components (src-webcomponents -> admin/webcomponents): manifests listed in io-package.json,
// built, and their own settings default to what the adapter's widget settings default to.

const root = path.join(__dirname, '..');
const ioPackage = JSON.parse(fs.readFileSync(path.join(root, 'io-package.json'), 'utf8'));
const native = ioPackage.native as Record<string, unknown>;

// setting of the component -> setting of the instance (io-package native)
const NATIVE_KEYS: Record<string, string> = {
	widgetMode: 'widgetMode',
	count: 'widgetAnzahl',
	thumbSize: 'widgetThumbSize',
	minCol: 'widgetMinCol',
	maxModalWidth: 'widgetMaxModalWidth',
	showTags: 'widgetShowTags',
	tagPosition: 'widgetTagPosition',
	sortNewest: 'widgetSortNewest',
	showSearch: 'widgetShowSearch',
	defaultTag: 'widgetDefaultTag',
	compact: 'widgetCompact',
	playerUrl: 'widgetPlayerUrl',
	liveAspect: 'widgetLiveAspect',
	liveRefreshSec: 'widgetLiveRefreshSec',
	colorCardBg: 'widgetColorCardBg',
	colorTagBg: 'widgetColorTagBg',
	colorTagText: 'widgetColorTagText',
	colorAccent: 'widgetColorAccent',
	colorModalBg: 'widgetColorModalBg',
	borderRadius: 'widgetBorderRadius',
};

interface Setting {
	type: string;
	default?: unknown;
	hidden?: string;
	label?: Record<string, string>;
}

describe('web components', () => {
	const list = ioPackage.common.webComponents as string[];

	it('are listed in io-package.json', () => {
		expect(list).to.be.an('array').with.length(3);
	});

	for (const rel of list || []) {
		describe(rel, () => {
			const file = path.join(root, 'admin', rel);
			const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
			const items = manifest.settings.items as Record<string, Setting>;

			it('is built next to its module and the same as its source', () => {
				expect(fs.existsSync(path.join(path.dirname(file), manifest.module))).to.equal(true);
				const src = path.join(root, 'src-webcomponents', path.basename(rel));
				expect(fs.readFileSync(file, 'utf8')).to.equal(fs.readFileSync(src, 'utf8'));
			});

			it('has a valid tag and English and German labels', () => {
				expect(manifest.tag).to.match(/^iob-agent-dvr-[a-z]+$/);
				for (const [key, item] of Object.entries(items)) {
					if (item.label) {
						expect(item.label, key).to.have.keys('en', 'de');
					}
				}
			});

			it('offers adapter and custom mode', () => {
				expect(items.mode.default).to.equal('adapter');
				for (const [key, item] of Object.entries(items)) {
					if (NATIVE_KEYS[key]) {
						expect(item.hidden, key).to.contain("data.mode !== 'custom'");
					}
				}
			});

			it('defaults its own settings to the defaults of the instance', () => {
				for (const [key, item] of Object.entries(items)) {
					const nk = NATIVE_KEYS[key];
					if (nk) {
						expect(item.default, key).to.equal(native[nk]);
					}
				}
			});
		});
	}

	it('together offer every widget setting of the instance', () => {
		const offered = new Set<string>();
		for (const rel of list) {
			const manifest = JSON.parse(fs.readFileSync(path.join(root, 'admin', rel), 'utf8'));
			Object.keys(manifest.settings.items).forEach(k => offered.add(k));
		}
		for (const key of Object.keys(NATIVE_KEYS)) {
			expect(offered.has(key), key).to.equal(true);
		}
	});
});
