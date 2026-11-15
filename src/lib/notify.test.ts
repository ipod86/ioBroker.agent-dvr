import { expect } from 'chai';
import { OfflineTracker, cameraSelected, categoryEnabled, notifyText, offlineMinutes, tagCategory } from './notify';

describe('notify', () => {
	it('tagCategory', () => {
		expect(tagCategory('people')).to.equal('personDetected');
		expect(tagCategory('Person')).to.equal('personDetected');
		expect(tagCategory('dog_cat')).to.equal('animalDetected');
		expect(tagCategory('dog cat')).to.equal('animalDetected');
		expect(tagCategory('vehicle')).to.equal('vehicleDetected');
		expect(tagCategory('car')).to.equal('vehicleDetected');
		expect(tagCategory('package')).to.equal('otherDetected');
		expect(tagCategory('trigger')).to.equal(undefined);
		expect(tagCategory('detected')).to.equal(undefined);
		expect(tagCategory('timelapse')).to.equal(undefined);
	});

	it('categoryEnabled: everything off by default', () => {
		for (const c of ['cameraOffline', 'personDetected', 'newRecording', 'serverOnline'] as const) {
			expect(categoryEnabled({}, c)).to.equal(false);
		}
		expect(categoryEnabled({ notifyPerson: true }, 'personDetected')).to.equal(true);
		expect(categoryEnabled({ notifyServerOffline: true }, 'serverOnline')).to.equal(true);
	});

	it('cameraSelected', () => {
		expect(cameraSelected({}, 8)).to.equal(true);
		expect(cameraSelected({ notifyCamerasOff: ['9'] }, 8)).to.equal(true);
		expect(cameraSelected({ notifyCamerasOff: ['8'] }, 8)).to.equal(false);
		expect(cameraSelected({ notifyCamerasOff: ['8'] }, '8')).to.equal(false);
	});

	it('offlineMinutes', () => {
		expect(offlineMinutes({})).to.equal(10);
		expect(offlineMinutes({ notifyOfflineMinutes: 0 })).to.equal(10);
		expect(offlineMinutes({ notifyOfflineMinutes: 3 })).to.equal(3);
		expect(offlineMinutes({ notifyOfflineMinutes: 99999 })).to.equal(1440);
	});

	it('OfflineTracker raises the alarm once after the limit and ends it on reconnect', () => {
		const t = new OfflineTracker();
		const L = 10 * 60000;
		expect(t.update('c', true, true, 0, L)).to.deep.equal({ alarm: false });
		expect(t.update('c', false, true, 1000, L)).to.deep.equal({ since: 1000, alarm: false });
		expect(t.update('c', false, true, 1000 + L - 1, L)).to.deep.equal({ since: 1000, alarm: false });
		expect(t.update('c', false, true, 1000 + L, L)).to.deep.equal({ since: 1000, alarm: true, alarmStart: true });
		expect(t.update('c', false, true, 1000 + 2 * L, L)).to.deep.equal({ since: 1000, alarm: true });
		expect(t.update('c', true, true, 1000 + 3 * L, L)).to.deep.equal({ alarm: false, alarmEnd: 30 });
		expect(t.update('c', true, true, 1000 + 4 * L, L)).to.deep.equal({ alarm: false });
	});

	it('OfflineTracker: short outages and switched-off cameras are not reported', () => {
		const t = new OfflineTracker();
		const L = 10 * 60000;
		t.update('c', false, true, 0, L);
		expect(t.update('c', true, true, 60000, L)).to.deep.equal({ alarm: false });
		expect(t.update('d', false, false, 0, L)).to.deep.equal({ alarm: false });
		expect(t.update('d', false, false, 2 * L, L)).to.deep.equal({ alarm: false });
	});

	it('OfflineTracker.restore keeps the start after a restart', () => {
		const t = new OfflineTracker();
		t.restore('c', 5000, true);
		expect(t.update('c', false, true, 999999, 600000)).to.deep.equal({ since: 5000, alarm: true });
	});

	it('notifyText', () => {
		expect(notifyText('cameraOffline', 'de', { name: 'Reolink', min: 10 })).to.equal(
			'Kamera Reolink ist seit 10 Minuten nicht mit Agent DVR verbunden – keine Bewegungserkennung!',
		);
		expect(notifyText('otherDetected', 'en', { name: 'Trift', tag: 'package' })).to.equal(
			'Package detected: Trift',
		);
		expect(notifyText('personDetected', 'fr', { name: 'X' })).to.equal('Person detected: X');
	});
});
