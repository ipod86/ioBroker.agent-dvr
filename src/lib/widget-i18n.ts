export interface WidgetLabels {
	noRecordings: string;
	search: string;
	all: string;
	download: string;
	live: string;
}

const WIDGET_LABELS: Record<string, WidgetLabels> = {
	de: {
		noRecordings: 'Keine Aufnahmen',
		search: 'Suche …',
		all: 'Alle',
		download: 'Herunterladen',
		live: 'LIVE',
	},
	en: {
		noRecordings: 'No recordings',
		search: 'Search …',
		all: 'All',
		download: 'Download',
		live: 'LIVE',
	},
	fr: {
		noRecordings: 'Aucun enregistrement',
		search: 'Rechercher …',
		all: 'Tous',
		download: 'Télécharger',
		live: 'LIVE',
	},
	it: {
		noRecordings: 'Nessuna registrazione',
		search: 'Cerca …',
		all: 'Tutti',
		download: 'Scarica',
		live: 'LIVE',
	},
	es: {
		noRecordings: 'Sin grabaciones',
		search: 'Buscar …',
		all: 'Todos',
		download: 'Descargar',
		live: 'LIVE',
	},
	pt: {
		noRecordings: 'Sem gravações',
		search: 'Pesquisar …',
		all: 'Todos',
		download: 'Baixar',
		live: 'AO VIVO',
	},
	nl: {
		noRecordings: 'Geen opnames',
		search: 'Zoeken …',
		all: 'Alle',
		download: 'Downloaden',
		live: 'LIVE',
	},
	pl: {
		noRecordings: 'Brak nagrań',
		search: 'Szukaj …',
		all: 'Wszystkie',
		download: 'Pobierz',
		live: 'NA ŻYWO',
	},
	ru: {
		noRecordings: 'Нет записей',
		search: 'Поиск …',
		all: 'Все',
		download: 'Скачать',
		live: 'В ЭФИРЕ',
	},
	uk: {
		noRecordings: 'Немає записів',
		search: 'Пошук …',
		all: 'Усі',
		download: 'Завантажити',
		live: 'НАЖИВО',
	},
	'zh-cn': {
		noRecordings: '无录像',
		search: '搜索 …',
		all: '全部',
		download: '下载',
		live: '直播',
	},
};

const SUPPORTED = new Set(Object.keys(WIDGET_LABELS));

export function getWidgetLabels(rawLang: string): WidgetLabels {
	const lang = (rawLang || 'en').toLowerCase();
	return WIDGET_LABELS[lang] ?? WIDGET_LABELS.en;
}

export function isSupportedLang(lang: string): boolean {
	return SUPPORTED.has(lang.toLowerCase());
}
