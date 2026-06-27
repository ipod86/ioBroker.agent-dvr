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
var widget_i18n_exports = {};
__export(widget_i18n_exports, {
  getWidgetLabels: () => getWidgetLabels,
  isSupportedLang: () => isSupportedLang
});
module.exports = __toCommonJS(widget_i18n_exports);
const WIDGET_LABELS = {
  de: {
    noRecordings: "Keine Aufnahmen",
    search: "Suche \u2026",
    all: "Alle",
    download: "Herunterladen",
    live: "LIVE"
  },
  en: {
    noRecordings: "No recordings",
    search: "Search \u2026",
    all: "All",
    download: "Download",
    live: "LIVE"
  },
  fr: {
    noRecordings: "Aucun enregistrement",
    search: "Rechercher \u2026",
    all: "Tous",
    download: "T\xE9l\xE9charger",
    live: "LIVE"
  },
  it: {
    noRecordings: "Nessuna registrazione",
    search: "Cerca \u2026",
    all: "Tutti",
    download: "Scarica",
    live: "LIVE"
  },
  es: {
    noRecordings: "Sin grabaciones",
    search: "Buscar \u2026",
    all: "Todos",
    download: "Descargar",
    live: "LIVE"
  },
  pt: {
    noRecordings: "Sem grava\xE7\xF5es",
    search: "Pesquisar \u2026",
    all: "Todos",
    download: "Baixar",
    live: "AO VIVO"
  },
  nl: {
    noRecordings: "Geen opnames",
    search: "Zoeken \u2026",
    all: "Alle",
    download: "Downloaden",
    live: "LIVE"
  },
  pl: {
    noRecordings: "Brak nagra\u0144",
    search: "Szukaj \u2026",
    all: "Wszystkie",
    download: "Pobierz",
    live: "NA \u017BYWO"
  },
  ru: {
    noRecordings: "\u041D\u0435\u0442 \u0437\u0430\u043F\u0438\u0441\u0435\u0439",
    search: "\u041F\u043E\u0438\u0441\u043A \u2026",
    all: "\u0412\u0441\u0435",
    download: "\u0421\u043A\u0430\u0447\u0430\u0442\u044C",
    live: "\u0412 \u042D\u0424\u0418\u0420\u0415"
  },
  uk: {
    noRecordings: "\u041D\u0435\u043C\u0430\u0454 \u0437\u0430\u043F\u0438\u0441\u0456\u0432",
    search: "\u041F\u043E\u0448\u0443\u043A \u2026",
    all: "\u0423\u0441\u0456",
    download: "\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0438\u0442\u0438",
    live: "\u041D\u0410\u0416\u0418\u0412\u041E"
  },
  "zh-cn": {
    noRecordings: "\u65E0\u5F55\u50CF",
    search: "\u641C\u7D22 \u2026",
    all: "\u5168\u90E8",
    download: "\u4E0B\u8F7D",
    live: "\u76F4\u64AD"
  }
};
const SUPPORTED = new Set(Object.keys(WIDGET_LABELS));
function getWidgetLabels(rawLang) {
  var _a;
  const lang = (rawLang || "en").toLowerCase();
  return (_a = WIDGET_LABELS[lang]) != null ? _a : WIDGET_LABELS.en;
}
function isSupportedLang(lang) {
  return SUPPORTED.has(lang.toLowerCase());
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getWidgetLabels,
  isSupportedLang
});
//# sourceMappingURL=widget-i18n.js.map
