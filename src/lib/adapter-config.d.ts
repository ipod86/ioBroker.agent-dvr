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
