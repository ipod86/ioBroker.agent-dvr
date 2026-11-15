"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var notify_exports = {};
__export(notify_exports, {
  OfflineTracker: () => OfflineTracker,
  cameraSelected: () => cameraSelected,
  categoryEnabled: () => categoryEnabled,
  notifyText: () => notifyText,
  offlineMinutes: () => offlineMinutes,
  tagCategory: () => tagCategory
});
module.exports = __toCommonJS(notify_exports);
const PERSON = /* @__PURE__ */ new Set(["people", "person", "persons", "face", "faces", "human"]);
const ANIMAL = /* @__PURE__ */ new Set(["dog_cat", "dog", "cat", "animal", "animals", "bird", "pet", "pets", "horse"]);
const VEHICLE = /* @__PURE__ */ new Set(["vehicle", "vehicles", "car", "cars", "truck", "bus", "motorcycle", "bicycle", "bike"]);
function tagCategory(tag) {
  const t = tag.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (PERSON.has(t)) {
    return "personDetected";
  }
  if (ANIMAL.has(t)) {
    return "animalDetected";
  }
  if (VEHICLE.has(t)) {
    return "vehicleDetected";
  }
  return "otherDetected";
}
function categoryEnabled(cfg, cat) {
  switch (cat) {
    case "cameraOffline":
      return !!cfg.notifyCameraOffline;
    case "cameraOnline":
      return !!cfg.notifyCameraOnline;
    case "serverOffline":
    case "serverOnline":
      return !!cfg.notifyServerOffline;
    case "personDetected":
      return !!cfg.notifyPerson;
    case "animalDetected":
      return !!cfg.notifyAnimal;
    case "vehicleDetected":
      return !!cfg.notifyVehicle;
    case "otherDetected":
      return !!cfg.notifyOtherTags;
    case "newRecording":
      return !!cfg.notifyNewRecording;
  }
  return false;
}
function cameraSelected(cfg, id) {
  const off = Array.isArray(cfg.notifyCamerasOff) ? cfg.notifyCamerasOff.map(String) : [];
  return !off.includes(String(id));
}
function offlineMinutes(cfg) {
  const n = Number(cfg.notifyOfflineMinutes);
  return Number.isFinite(n) && n >= 1 ? Math.min(1440, Math.round(n)) : 10;
}
class OfflineTracker {
  since = /* @__PURE__ */ new Map();
  alarm = /* @__PURE__ */ new Set();
  /**
   * Takes over a known start of an outage, e.g. after an adapter restart.
   *
   * @param key camera key
   * @param since start of the outage (ms)
   * @param alarm alarm was already raised
   */
  restore(key, since, alarm) {
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
  update(key, connected, enabled, now, limitMs) {
    if (connected || !enabled) {
      const start2 = this.since.get(key);
      const wasAlarm = this.alarm.has(key);
      this.since.delete(key);
      this.alarm.delete(key);
      return wasAlarm && connected && start2 !== void 0 ? { alarm: false, alarmEnd: Math.max(1, Math.round((now - start2) / 6e4)) } : { alarm: false };
    }
    let start = this.since.get(key);
    if (start === void 0) {
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
const TEXTS = {
  en: {
    cameraOffline: "Camera %name% has not been connected to Agent DVR for %min% minutes \u2013 no motion detection!",
    cameraOnline: "Camera %name% is connected again (outage about %min% minutes).",
    serverOffline: "Agent DVR server has not been reachable for %min% minutes \u2013 no cameras, no motion detection!",
    serverOnline: "Agent DVR server is reachable again (outage about %min% minutes).",
    personDetected: "Person detected: %name%",
    animalDetected: "Animal detected: %name%",
    vehicleDetected: "Vehicle detected: %name%",
    otherDetected: "%tag% detected: %name%",
    newRecording: "New recording: %name%"
  },
  de: {
    cameraOffline: "Kamera %name% ist seit %min% Minuten nicht mit Agent DVR verbunden \u2013 keine Bewegungserkennung!",
    cameraOnline: "Kamera %name% ist wieder verbunden (Ausfall ca. %min% Minuten).",
    serverOffline: "Agent-DVR-Server ist seit %min% Minuten nicht erreichbar \u2013 keine Kameras, keine Bewegungserkennung!",
    serverOnline: "Agent-DVR-Server ist wieder erreichbar (Ausfall ca. %min% Minuten).",
    personDetected: "Person erkannt: %name%",
    animalDetected: "Tier erkannt: %name%",
    vehicleDetected: "Fahrzeug erkannt: %name%",
    otherDetected: "%tag% erkannt: %name%",
    newRecording: "Neue Aufnahme: %name%"
  }
};
function notifyText(cat, lang, params) {
  var _a, _b;
  const t = TEXTS[lang === "de" ? "de" : "en"][cat];
  return t.replace("%name%", (_a = params.name) != null ? _a : "").replace("%min%", String((_b = params.min) != null ? _b : "")).replace("%tag%", params.tag ? params.tag.charAt(0).toUpperCase() + params.tag.slice(1) : "");
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  OfflineTracker,
  cameraSelected,
  categoryEnabled,
  notifyText,
  offlineMinutes,
  tagCategory
});
//# sourceMappingURL=notify.js.map
