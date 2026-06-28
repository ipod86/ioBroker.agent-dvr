// Augments the globally declared AdapterConfig type from "@iobroker/types"
declare global {
    namespace ioBroker {
        interface AdapterConfig {
            // Connection
            ip: string;
            port: number;
            user: string;
            pass: string;
            pollSeconds: number;
            httpTimeoutMs: number;
            // Features
            enableSystemControls: boolean;
            enablePtz: boolean;
            enableUrls: boolean;
            enableSnapshotB64: boolean;
            enableEventDps: boolean;
            enablePush: boolean;
            enableOverview: boolean;
            storeRawJson: boolean;
            // Widget
            enableWidget: boolean;
            widgetMode: 'nojs' | 'js';
            widgetAnzahl: number;
            widgetMinCol: number;
            widgetShowTags: boolean;
            widgetLiveAspect: string;
            widgetTagPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
            widgetMaxModalWidth: number;
            widgetPlayerUrl: string;
            widgetShowSearch: boolean;
            widgetSortNewest: boolean;
            widgetDefaultTag: string;
            widgetThumbSize: 'small' | 'medium' | 'large';
            widgetCompact: boolean;
            widgetColorCardBg: string;
            widgetColorTagBg: string;
            widgetColorTagText: string;
            widgetColorAccent: string;
            widgetColorModalBg: string;
            widgetBorderRadius: number;
            // Dashboard
            dashDefaultView: 'live' | 'recordings';
            dashShowOffline: boolean;
            dashGridCols: number;
            dashBtnsVisible: boolean;
            dashTagPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
            dashRefreshSec: number;
            dashStreamReconnect: boolean;
            dashColorBg: string;
            dashColorSurface: string;
            dashColorAccent: string;
            dashColorText: string;
            dashColorBorder: string;
            dashColorOnline: string;
            dashColorOffline: string;
            // Advanced
            maxDepth: number;
            maxArray: number;
            eventTagsDynamic: boolean;
            eventTagsIgnore: string;
            eventTags: string;
        }
    }
}

export {};
