/**
 * Notifications of the adapter (ioBroker notification system → notification-manager).
 * Pure logic without adapter access, so it can be unit tested.
 */

/** Notification categories, as defined in io-package.json (scope "agent-dvr") */
export type NotifyCategory =
	| 'cameraOffline'
	| 'cameraOnline'
	| 'serverOffline'
	| 'serverOnline'
	| 'personDetected'
	| 'animalDetected'
	| 'vehicleDetected'
	| 'otherDetected'
	| 'newRecording';

/** Notification settings of the adapter */
export interface NotifyConfig {
	/** Notify when a camera is offline */
	notifyCameraOffline?: boolean;
	/** Notify when a camera is online again */
	notifyCameraOnline?: boolean;
	/** Notify when the server is offline / online again */
	notifyServerOffline?: boolean;
	/** Minutes until a missing connection counts as offline */
	notifyOfflineMinutes?: number;
	/** Notify on person detection */
	notifyPerson?: boolean;
	/** Notify on animal detection */
	notifyAnimal?: boolean;
	/** Notify on vehicle detection */
	notifyVehicle?: boolean;
	/** Notify on other detection tags */
	notifyOtherTags?: boolean;
	/** Notify on a new recording */
	notifyNewRecording?: boolean;
	/** Ids of the cameras without notifications (empty = all cameras notify) */
	notifyCamerasOff?: string[];
}

const PERSON = new Set(['people', 'person', 'persons', 'face', 'faces', 'human']);
const ANIMAL = new Set(['dog_cat', 'dog', 'cat', 'animal', 'animals', 'bird', 'pet', 'pets', 'horse']);
/** Tags of Agent DVR that are no detection of an object (plain motion, manual trigger, timelapse) */
const TECHNICAL = new Set(['detected', 'trigger', 'triggered', 'timelapse', 'motion', 'alert', 'manual']);
const VEHICLE = new Set(['vehicle', 'vehicles', 'car', 'cars', 'truck', 'bus', 'motorcycle', 'bicycle', 'bike']);

/**
 * Category of a detection tag from Agent DVR (e.g. "people", "dog_cat", "vehicle").
 * Technical tags (plain motion, manual trigger, timelapse) are no detection: undefined.
 *
 * @param tag tag of the event
 */
export function tagCategory(tag: string): NotifyCategory | undefined {
	const t = tag
		.trim()
		.toLowerCase()
		.replace(/[\s-]+/g, '_');
	if (TECHNICAL.has(t)) {
		return undefined;
	}
	if (PERSON.has(t)) {
		return 'personDetected';
	}
	if (ANIMAL.has(t)) {
		return 'animalDetected';
	}
	if (VEHICLE.has(t)) {
		return 'vehicleDetected';
	}
	return 'otherDetected';
}

/**
 * Checks whether a category is switched on in the settings.
 *
 * @param cfg adapter settings
 * @param cat category
 */
export function categoryEnabled(cfg: NotifyConfig, cat: NotifyCategory): boolean {
	switch (cat) {
		case 'cameraOffline':
			return !!cfg.notifyCameraOffline;
		case 'cameraOnline':
			return !!cfg.notifyCameraOnline;
		case 'serverOffline':
		case 'serverOnline':
			return !!cfg.notifyServerOffline;
		case 'personDetected':
			return !!cfg.notifyPerson;
		case 'animalDetected':
			return !!cfg.notifyAnimal;
		case 'vehicleDetected':
			return !!cfg.notifyVehicle;
		case 'otherDetected':
			return !!cfg.notifyOtherTags;
		case 'newRecording':
			return !!cfg.notifyNewRecording;
	}
	return false;
}

/**
 * Checks whether a camera sends notifications. All cameras do, except the unchecked ones.
 *
 * @param cfg adapter settings
 * @param id camera id (oid) in Agent DVR
 */
export function cameraSelected(cfg: NotifyConfig, id: string | number): boolean {
	const off = Array.isArray(cfg.notifyCamerasOff) ? cfg.notifyCamerasOff.map(String) : [];
	return !off.includes(String(id));
}

/**
 * Minutes until a missing connection counts as offline (1–1440, default 10).
 *
 * @param cfg adapter settings
 */
export function offlineMinutes(cfg: NotifyConfig): number {
	const n = Number(cfg.notifyOfflineMinutes);
	return Number.isFinite(n) && n >= 1 ? Math.min(1440, Math.round(n)) : 10;
}

/** Result of OfflineTracker.update() */
export interface OfflineChange {
	/** time since when the connection is missing (undefined = connected) */
	since?: number;
	/** the connection has been missing long enough: raise the alarm now */
	alarmStart?: boolean;
	/** the connection is back after an alarm: duration of the outage in minutes */
	alarmEnd?: number;
	/** state of the alarm after this update */
	alarm: boolean;
}

/**
 * Follows the connection of cameras (or the server) over the polls
 * and decides when an outage is long enough to be reported.
 */
export class OfflineTracker {
	private since = new Map<string, number>();
	private alarm = new Set<string>();

	/**
	 * Takes over a known start of an outage, e.g. after an adapter restart.
	 *
	 * @param key camera key
	 * @param since start of the outage (ms)
	 * @param alarm alarm was already raised
	 */
	restore(key: string, since: number | undefined, alarm: boolean): void {
		if (since) {
			this.since.set(key, since);
		}
		if (alarm) {
			this.alarm.add(key);
		}
	}

	/**
	 * Feeds the current connection state.
	 *
	 * @param key camera key
	 * @param connected connected now
	 * @param enabled camera is switched on (outages of switched-off cameras are ignored)
	 * @param now current time (ms)
	 * @param limitMs outage duration that counts as offline
	 */
	update(key: string, connected: boolean, enabled: boolean, now: number, limitMs: number): OfflineChange {
		if (connected || !enabled) {
			const start = this.since.get(key);
			const wasAlarm = this.alarm.has(key);
			this.since.delete(key);
			this.alarm.delete(key);
			return wasAlarm && connected && start !== undefined
				? { alarm: false, alarmEnd: Math.max(1, Math.round((now - start) / 60000)) }
				: { alarm: false };
		}
		let start = this.since.get(key);
		if (start === undefined) {
			start = now;
			this.since.set(key, start);
		}
		if (!this.alarm.has(key) && now - start >= limitMs) {
			this.alarm.add(key);
			return { since: start, alarm: true, alarmStart: true };
		}
		return { since: start, alarm: this.alarm.has(key) };
	}
}

const TEXTS: Record<'de' | 'en', Record<NotifyCategory, string>> = {
	en: {
		cameraOffline: 'Camera %name% has not been connected to Agent DVR for %min% minutes – no motion detection!',
		cameraOnline: 'Camera %name% is connected again (outage about %min% minutes).',
		serverOffline: 'Agent DVR server has not been reachable for %min% minutes – no cameras, no motion detection!',
		serverOnline: 'Agent DVR server is reachable again (outage about %min% minutes).',
		personDetected: 'Person detected: %name%',
		animalDetected: 'Animal detected: %name%',
		vehicleDetected: 'Vehicle detected: %name%',
		otherDetected: '%tag% detected: %name%',
		newRecording: 'New recording: %name%',
	},
	de: {
		cameraOffline: 'Kamera %name% ist seit %min% Minuten nicht mit Agent DVR verbunden – keine Bewegungserkennung!',
		cameraOnline: 'Kamera %name% ist wieder verbunden (Ausfall ca. %min% Minuten).',
		serverOffline:
			'Agent-DVR-Server ist seit %min% Minuten nicht erreichbar – keine Kameras, keine Bewegungserkennung!',
		serverOnline: 'Agent-DVR-Server ist wieder erreichbar (Ausfall ca. %min% Minuten).',
		personDetected: 'Person erkannt: %name%',
		animalDetected: 'Tier erkannt: %name%',
		vehicleDetected: 'Fahrzeug erkannt: %name%',
		otherDetected: '%tag% erkannt: %name%',
		newRecording: 'Neue Aufnahme: %name%',
	},
};

/**
 * Text of a notification in the system language (German or English).
 *
 * @param cat category
 * @param lang system language
 * @param params placeholders
 * @param params.name camera name
 * @param params.min minutes
 * @param params.tag detection tag
 */
export function notifyText(
	cat: NotifyCategory,
	lang: string,
	params: { name?: string; min?: number; tag?: string },
): string {
	const t = TEXTS[lang === 'de' ? 'de' : 'en'][cat];
	return t
		.replace('%name%', params.name ?? '')
		.replace('%min%', String(params.min ?? ''))
		.replace('%tag%', params.tag ? params.tag.charAt(0).toUpperCase() + params.tag.slice(1) : '');
}
