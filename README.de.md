![Logo](admin/agent-dvr.png)
# ioBroker.agent-dvr

[![NPM version](https://img.shields.io/npm/v/iobroker.agent-dvr.svg)](https://www.npmjs.com/package/iobroker.agent-dvr)
[![Downloads](https://img.shields.io/npm/dm/iobroker.agent-dvr.svg)](https://www.npmjs.com/package/iobroker.agent-dvr)
![Number of Installations](https://iobroker.live/badges/agent-dvr-installed.svg)

## agent-dvr Adapter für ioBroker

Verbindet ioBroker mit [AgentDVR](https://www.ispyconnect.com): erkennt automatisch alle Kameras, spiegelt jede Geräteeigenschaft als Datenpunkt, stellt Schaltflächen für alle gängigen Befehle bereit (Aufnahme, Scharf, PTZ, …), liefert Push-getriggerte Galerie-Updates bei neuen Aufnahmen, erzeugt ein responsives HTML-Galerie-Widget pro Kamera und enthält ein eingebautes Live-Dashboard mit kameraindividueller Stream-Auswahl (MJPEG, MP4/FLV mit Ton oder go2rtc WebRTC).

## Funktionen

- Automatische Erkennung aller AgentDVR-Kameras beim Start (Mikrofone ausgenommen)
- Alle Geräteeigenschaften als Datenpunkte gespiegelt (aus der API flachgeklopft)
- Schaltflächen pro Gerät: Aufnahme, Snapshot, Erkennung, Scharf/Unscharf, Ein/Aus, Objekterkennung, Zeitplan Ein/Aus, Detektor Ein/Aus, Empfindlichkeit (Min/Max/Gain), Bereinigen, …
- Systemschaltflächen: Scharf/Unscharf, Alle Ein/Aus, Konfiguration neu laden, Speicherverwaltung, Neustart, …
- **Profilauswahl** — beschreibbares Dropdown, das das aktuelle AgentDVR-Profil widerspiegelt (Zuhause / Weg / Nacht / eigene)
- **Snapshot als Base64** — `snapshot_b64`-Zustand pro Kamera, per Schaltfläche oder automatisch bei jedem Poll aktualisierbar
- PTZ-Steuerung mit Halte-Schaltern (links, rechts, oben, unten, diagonal, Zoom, Stopp, Mitte)
- Stream-URLs pro Kamera (Snapshot, Foto, MJPEG, MP4)
- Push-Trigger-Zustand für sofortige Skript-Reaktionen auf neue Aufnahmen
- HTML-Galerie-Widget pro Kamera (reines HTML/CSS oder JS-Modus mit Suche und Tag-Filter)
- Übersichts-Widget, das alle Kameras in einem HTML-Zustand kombiniert
- **Eingebautes Live-Dashboard** unter `http://<iobroker>:<webport>/agent-dvr/` — keine zusätzliche App nötig:
  - Kameraindividuelle Stream-Auswahl: MJPEG, MP4/FLV mit Ton oder go2rtc WebRTC/MSE
  - Kamera-Filter-Badges zum Ein-/Ausblenden einzelner Kameras (Zustand im localStorage gespeichert)
  - Echtzeit-Bewegungs- und Alarm-Indikatoren (gelber / oranger Kachelrahmen) via Socket.io
  - Vollbildansicht mit PTZ-Overlay, Aufnahme-, Ton- und **nativer Browser-Vollbild-Schaltfläche**; Header blendet sich nach 3 s Inaktivität aus
  - Aufnahmen-Tab mit Raster- und Timeline-Ansicht, Suche, **ausklappbarem Tag-Filter** und Video-Player
  - Automatischer Reconnect für alle Stream-Typen nach Netzwerkunterbrechung oder Tab-Wechsel
  - Farbdesign vollständig über die Adapter-Konfiguration anpassbar

## Konfiguration

### Tab: Verbindung

| Einstellung | Beschreibung | Standard |
|-------------|-------------|---------|
| AgentDVR IP | IP-Adresse des AgentDVR-Servers | — |
| Port | AgentDVR HTTP-Port | `8090` |
| Benutzername | Optionaler HTTP-Basic-Auth-Benutzername | — |
| Passwort | Optionales HTTP-Basic-Auth-Passwort | — |
| Poll-Intervall (s) | Wie oft Daten von AgentDVR abgerufen werden (5–3600) | `30` |
| HTTP-Timeout (ms) | Timeout pro API-Anfrage (1000–30000) | `8000` |

### Tab: Funktionen

**Steuerung**

| Einstellung | Beschreibung | Standard |
|-------------|-------------|---------|
| System-Steuertasten | Scharf/Unscharf/Neustart/…-Tasten und Profilauswahl anlegen | `ja` |
| PTZ-Steuertasten | PTZ-Halte-Schalter pro Kamera anlegen | `ja` |
| Stream-URLs generieren | URL-Zustände (Snapshot, MJPEG, MP4) pro Kamera anlegen | `ja` |
| Snapshot als Base64 | Aktuelles Bild bei jedem Poll automatisch als Base64 speichern | `nein` |

**Ereignisse**

| Einstellung | Beschreibung | Standard |
|-------------|-------------|---------|
| Ereignis-Datenpunkte | Aufnahme-Metadaten (neuestes Ereignis, Anzahl, Tags, …) pro Kamera spiegeln | `ja` |
| Echtzeit-Push-Trigger | Push-Trigger-Zustand anlegen, auf den Skripte bei neuen Aufnahmen reagieren können | `ja` |

**Anzeige**

| Einstellung | Beschreibung | Standard |
|-------------|-------------|---------|
| Übersichts-Widget | Einen HTML-Zustand mit allen Kamerakacheln zusammengefasst anlegen | `ja` |

**Debug**

| Einstellung | Beschreibung | Standard |
|-------------|-------------|---------|
| Rohe API-JSON speichern | Die vollständige getObjects-Antwort unter `system.raw_getObjects` ablegen | `nein` |

### Tab: Dashboard

**Standardansicht**

| Einstellung | Beschreibung | Standard |
|-------------|-------------|---------|
| Standardansicht | Welcher Tab beim Öffnen des Dashboards aktiv ist: Live oder Aufnahmen | `Live` |
| Offline-Kameras anzeigen | Kamerakacheln auch dann anzeigen, wenn die Kamera offline ist | `ja` |

**Kameraraster**

| Einstellung | Beschreibung | Standard |
|-------------|-------------|---------|
| Spalten | Anzahl der Rasterspalten (0 = automatisch anhand der Kachelbreite) | `0` |
| Buttons immer sichtbar | Aufnahme-/PTZ-Tasten dauerhaft anzeigen statt nur beim Hover | `nein` |
| Tag-Badge Position | Ecke, in der das Kamera-Namens-Badge auf der Kachel erscheint | `unten rechts` |

**Stream**

| Einstellung | Beschreibung | Standard |
|-------------|-------------|---------|
| Refresh-Intervall (s) | Wie oft das Dashboard Kameradaten neu lädt (10–600) | `60` |
| Automatisch wiederverbinden | MJPEG-, MP4/FLV- und go2rtc-Streams bei Fehler oder Tab-Wechsel automatisch neu verbinden | `ja` |

**Farbdesign** — 7 Farbfelder zur Anpassung der Oberfläche:

| Einstellung | Beschreibung |
|-------------|-------------|
| Hintergrund | Seiten-/Raster-Hintergrundfarbe |
| Kachel (Surface) | Hintergrundfarbe der Kamerakacheln |
| Akzent | Hervorhebungs- / aktive Elementfarbe |
| Text | Primäre Textfarbe |
| Rahmen | Rahmenfarbe der Kacheln |
| Online-Indikator | Farbe des Online-Statuspunkts |
| Offline-Indikator | Farbe des Offline-Statuspunkts |

**Stream-Zuweisung**

Hier wird jeder Kamera individuell eine Stream-Quelle zugewiesen. Das Dropdown listet alle von AgentDVR erkannten Kameras (Mikrofone werden nicht angezeigt).

| Option | Beschreibung |
|--------|-------------|
| MJPEG *(AgentDVR)* | Klassischer MJPEG-Stream von AgentDVR — geringste Latenz, kein Ton |
| MP4 / FLV mit Ton *(AgentDVR)* | FLV-Stream über ioBroker proxied mit flv.js — inklusive Ton, korrektes Seitenverhältnis |
| *Streamname* *(go2rtc)* | WebRTC/MSE-Stream von go2rtc — flüssig, geringe Latenz, Ton-Unterstützung |

Die go2rtc-Streamnamen werden automatisch vom go2rtc-Server abgerufen, wenn das Admin-UI geöffnet ist. Falls der Browser go2rtc nicht direkt erreichen kann (z. B. Mixed-Content bei HTTPS), holt der Adapter sie serverseitig als Fallback.

**go2rtc-URL** *(erscheint nur, wenn mindestens eine Kamera einen go2rtc-Stream nutzt)*

| Einstellung | Beschreibung | Beispiel |
|-------------|-------------|---------|
| go2rtc-URL | Basis-URL der go2rtc-Instanz | `http://192.168.1.10:1984` |

> **Hinweis:** go2rtc muss bereits installiert und die Streams dort konfiguriert sein. Der Adapter liest nur die Stream-Liste und proxied den WebSocket — er konfiguriert go2rtc nicht.

### Tab: Widget (Galerie-Widget pro Kamera)

**Allgemein**

| Einstellung | Beschreibung | Standard |
|-------------|-------------|---------|
| Widget aktivieren | HTML-Galerie-Widget pro Kamera erzeugen | `ja` |
| Widget-Modus | `Kein JS` — reines HTML/CSS, überall einbettbar; `JS` — vollständige Interaktivität mit Suche und Tag-Filter | `Kein JS` |

**Layout**

| Einstellung | Beschreibung | Standard |
|-------------|-------------|---------|
| Max. Einträge | Maximale Anzahl der im Widget angezeigten Aufnahmen | `20` |
| Min. Spaltenbreite (px) | Mindestbreite einer Thumbnail-Spalte | `150` |
| Max. Modal-Breite (px) | Maximale Breite des Video-Wiedergabe-Modals | `900` |

**Tags**

| Einstellung | Beschreibung | Standard |
|-------------|-------------|---------|
| Tags anzeigen | Aufnahme-Tags auf jedem Thumbnail anzeigen | `ja` |
| Tag-Badge Position | Ecke, in der Tags auf dem Thumbnail erscheinen | `unten links` |

**Filter**

| Einstellung | Beschreibung | Standard |
|-------------|-------------|---------|
| Neueste zuerst | Aufnahmen absteigend nach Datum sortieren | `ja` |
| Suche anzeigen | Textsuchfeld im JS-Modus einblenden | `nein` |
| Kompakt-Modus | Dichteres Layout mit kleineren Thumbnails | `nein` |
| Standard-Tag | Diesen Tag-Filter beim Laden des Widgets vorauswählen | — |
| Vorschaugröße | `Klein` / `Mittel` / `Groß` | `Mittel` |

**Player**

| Einstellung | Beschreibung | Standard |
|-------------|-------------|---------|
| Live-Seitenverhältnis | Seitenverhältnis der Live-Vorschau, z. B. `16/9` | — |
| Player-URL | Benutzerdefinierte URL für den Video-Player im Widget | — |

**Farbdesign** — 5 Farbfelder + Border-Radius:

| Einstellung | Beschreibung |
|-------------|-------------|
| Karten-Hintergrund | Hintergrundfarbe der Widget-Karten |
| Tag-Hintergrund | Hintergrundfarbe der Tag-Chips |
| Tag-Text | Textfarbe der Tag-Chips |
| Akzent | Hervorhebungsfarbe |
| Modal-Hintergrund | Hintergrundfarbe des Video-Modals |
| Border-Radius (px) | Abrundungsradius der Kartenecken | `4` |

### Tab: Erweitert

| Einstellung | Beschreibung | Standard |
|-------------|-------------|---------|
| Max. Rekursionstiefe | Wie viele Ebenen tief das API-JSON in Datenpunkte umgewandelt wird (1–10) | `6` |
| Max. Array-Einträge | Maximale Anzahl der gespiegelten Array-Elemente pro Eigenschaft (1–500) | `30` |
| Tags dynamisch | Für jeden eindeutigen Aufnahme-Tag automatisch einen Datenpunkt anlegen | `nein` |
| Tags ignorieren (kommagetrennt) | Aufnahme-Tags, die bei Ereignis-Datenpunkten ausgeschlossen werden | — |
| Tag-Filter (kommagetrennt) | Nur Aufnahmen mit diesen Tags als Ereignis-Datenpunkte anlegen | — |

## Live-Dashboard

Das eingebaute Live-Dashboard ist erreichbar unter `http://<iobroker>:<webport>/agent-dvr/`.

**Funktionen:**
- Kameraindividuelle Stream-Auswahl: MJPEG, MP4/FLV mit Ton (via flv.js) oder go2rtc WebRTC/MSE
- Kamera-Filter-Badges — per Klick einzelne Kameras ein-/ausblenden; Zustand wird im localStorage gespeichert
- Vollbildansicht mit PTZ-Overlay, Aufnahme-, Ton- und nativer Browser-Vollbild-Schaltfläche; Header blendet sich nach 3 s Inaktivität aus
- Echtzeit-Bewegungs- (gelber Rahmen) und Alarm-Indikatoren (oranger Rahmen) via Socket.io
- Automatischer Reconnect: MJPEG und FLV bei Fehler; go2rtc bei unerwartetem WebSocket-Close oder 10 s ohne Bild
- Aufnahmen-Tab mit Raster- und Timeline-Ansicht, Suche und ausklappbarem Tag-Filter, Video-Player mit Vor-/Zurück-Navigation
- Farbdesign über die Adapter-Konfiguration einstellbar

### go2rtc WebRTC-Streams

[go2rtc](https://github.com/AlexxIT/go2rtc) liefert flüssige, latenzarme WebRTC/MSE-Streams mit Ton.

**Einrichtung:**
1. go2rtc installieren und starten, Kamera-Streams in der go2rtc-Konfiguration einrichten.
2. Im Adapter-Admin → Tab *Dashboard* → *Stream-Zuweisung* für jede Kamera den gewünschten go2rtc-Streamnamen aus dem Dropdown wählen.
3. Die **go2rtc-URL** eintragen, die unterhalb der Tabelle erscheint (z. B. `http://192.168.1.10:1984`).
4. Speichern und Adapter neu starten. Der Adapter proxied den WebSocket-Traffic über ioBroker, um Browser-CORS-Probleme zu umgehen.

## Datenpunkte

`<cam>` steht für `cam_<oid>_<name>`, z. B. `cam_8_Reolink`.

### System

| Datenpunkt | Typ | R/W | Beschreibung |
|-----------|-----|-----|-------------|
| `system.online` | boolean | R | Verbindung zu AgentDVR aktiv |
| `system.lastUpdate` | string | R | ISO-Zeitstempel des letzten erfolgreichen Polls |
| `system.lastPoll` | number | R | Unix-Zeitstempel des letzten Polls |
| `system.cameraCount` | number | R | Anzahl erkannter Kameras |
| `system.disk_free_gb` | number | R | Freier Speicherplatz in GB |
| `system.settings.*` | verschieden | R | Flachgeklopfte AgentDVR-Servereinstellungen |
| `system.stats.*` | verschieden | R | CPU-/RAM-/Festplatten-Statistiken |
| `system.status.*` | verschieden | R | Systemstatus (scharf, Geräte, Version, …) |
| `system.raw_getObjects` | string | R | Rohe getObjects-JSON (wenn aktiviert) |

### Systemsteuerung *(erfordert „System-Steuertasten")*

| Datenpunkt | Typ | R/W | Beschreibung |
|-----------|-----|-----|-------------|
| `system.control.arm` | Taste | W | System scharf schalten |
| `system.control.disarm` | Taste | W | System unscharf schalten |
| `system.control.allOn` | Taste | W | Alle Geräte einschalten |
| `system.control.allOff` | Taste | W | Alle Geräte ausschalten |
| `system.control.reloadConfig` | Taste | W | AgentDVR-Konfiguration neu laden |
| `system.control.reloadObjects` | Taste | W | Objekte neu laden |
| `system.control.runStorageMgmt` | Taste | W | Speicherverwaltung ausführen |
| `system.control.blockExternal` | Taste | W | Externen Zugriff sperren |
| `system.control.unblockExternal` | Taste | W | Externen Zugriff freigeben |
| `system.control.restart` | Taste | W | AgentDVR neu starten |
| `system.control.refresh` | Taste | W | Sofortigen Poll erzwingen |
| `system.profile.selector` | number | R/W | Aktiver Profilindex — Dropdown (0 = Zuhause, 1 = Weg, …) |
| `system.profile.list` | string | R | Verfügbare Profile als JSON-Array |

### Pro Kamera

| Datenpunkt | Typ | R/W | Beschreibung |
|-----------|-----|-----|-------------|
| `<cam>.name` | string | R | Kameraname |
| `<cam>.data.online` | boolean | R | Kamera ist online |
| `<cam>.data.connected` | boolean | R | Stream ist verbunden |
| `<cam>.data.recording` | boolean | R | Nimmt gerade auf |
| `<cam>.data.detected` | boolean | R | Bewegung/Objekt erkannt |
| `<cam>.data.detectorActive` | boolean | R | Bewegungserkennung aktiv |
| `<cam>.data.alertsActive` | boolean | R | Alarme aktiv |
| `<cam>.data.alerted` | boolean | R | Alarm gerade ausgelöst |
| `<cam>.data.scheduleActive` | boolean | R | Zeitplan aktiv |
| `<cam>.data.width` / `height` | number | R | Stream-Auflösung |
| `<cam>.data.*` | verschieden | R | Alle weiteren Geräteeigenschaften von AgentDVR |
| `<cam>.snapshot_b64` | string | R | Aktuelles Bild als `data:image/jpeg;base64,…` (Rolle `media.picture`) |
| `<cam>.control.record` | Taste | W | Aufnahme starten |
| `<cam>.control.recordStop` | Taste | W | Aufnahme stoppen |
| `<cam>.control.recordRestart` | Taste | W | Aufnahme neu starten |
| `<cam>.control.triggerRecord` | Taste | W | Aufnahme auslösen (läuft bis Timeout) |
| `<cam>.control.snapshot` | Taste | W | AgentDVR anweisen, Snapshot auf Disk zu speichern |
| `<cam>.control.refreshSnapshotB64` | Taste | W | Aktuelles Bild abrufen und in `snapshot_b64` schreiben |
| `<cam>.control.detect` | Taste | W | Bewegungserkennung auslösen |
| `<cam>.control.alertOn` | Taste | W | Alarme aktivieren |
| `<cam>.control.alertOff` | Taste | W | Alarme deaktivieren |
| `<cam>.control.switchOn` | Taste | W | Kamera einschalten |
| `<cam>.control.switchOff` | Taste | W | Kamera ausschalten |
| `<cam>.control.objectDetectOn` | Taste | W | Objekterkennung einschalten *(nur Kameras)* |
| `<cam>.control.objectDetectOff` | Taste | W | Objekterkennung ausschalten *(nur Kameras)* |
| `<cam>.control.scheduleOn` | Taste | W | Gerätezeitplan aktivieren |
| `<cam>.control.scheduleOff` | Taste | W | Gerätezeitplan deaktivieren |
| `<cam>.control.detectorOn` | Taste | W | Bewegungsmelder aktivieren |
| `<cam>.control.detectorOff` | Taste | W | Bewegungsmelder deaktivieren |
| `<cam>.control.sensitivityMin` | Zahl 0–100 | R/W | Empfindlichkeit — untere Schwelle *(nur Kameras)* |
| `<cam>.control.sensitivityMax` | Zahl 0–100 | R/W | Empfindlichkeit — obere Schwelle *(nur Kameras)* |
| `<cam>.control.sensitivityGain` | Zahl 0–100 | R/W | Empfindlichkeit — Verstärkung *(nur Kameras)* |
| `<cam>.control.recOnAlert` | Taste | W | „Bei Alarm aufnehmen" aktivieren |
| `<cam>.control.recOnDetect` | Taste | W | „Bei Erkennung aufnehmen" aktivieren |
| `<cam>.control.purge` | Taste | W | Alle Aufnahmen dieser Kamera löschen |

### PTZ *(erfordert „PTZ-Steuertasten")*

| Datenpunkt | Typ | R/W | Beschreibung |
|-----------|-----|-----|-------------|
| `<cam>.control.ptz.left` | Schalter | R/W | Links schwenken (halten = weiter bewegen) |
| `<cam>.control.ptz.right` | Schalter | R/W | Rechts schwenken |
| `<cam>.control.ptz.up` | Schalter | R/W | Nach oben neigen |
| `<cam>.control.ptz.down` | Schalter | R/W | Nach unten neigen |
| `<cam>.control.ptz.upLeft` | Schalter | R/W | Diagonal oben-links |
| `<cam>.control.ptz.upRight` | Schalter | R/W | Diagonal oben-rechts |
| `<cam>.control.ptz.downLeft` | Schalter | R/W | Diagonal unten-links |
| `<cam>.control.ptz.downRight` | Schalter | R/W | Diagonal unten-rechts |
| `<cam>.control.ptz.zoomIn` | Schalter | R/W | Heranzoomen |
| `<cam>.control.ptz.zoomOut` | Schalter | R/W | Herauszoomen |
| `<cam>.control.ptz.stop` | Taste | W | PTZ-Bewegung stoppen |
| `<cam>.control.ptz.center` | Taste | W | Mitte-/Ausgangsposition anfahren |

### Stream-URLs *(erfordert „Stream-URLs generieren")*

| Datenpunkt | Typ | R/W | Beschreibung |
|-----------|-----|-----|-------------|
| `<cam>.urls.snapshot` | string | R | URL zum aktuellen JPEG-Snapshot *(nur Kameras)* |
| `<cam>.urls.photo` | string | R | URL zum Foto-Endpoint *(nur Kameras)* |
| `<cam>.urls.mjpeg` | string | R | URL zum MJPEG-Livestream *(nur Kameras)* |
| `<cam>.urls.mp4` | string | R | URL zum MP4-Livestream *(nur Kameras)* |
| `<mic>.urls.audio_mp3` | string | R | URL zum MP3-Audiostream *(nur Mikrofone)* |
| `<mic>.urls.audio_ogg` | string | R | URL zum OGG-Audiostream *(nur Mikrofone)* |

### Ereignisse / Galerie

| Datenpunkt | Typ | R/W | Beschreibung |
|-----------|-----|-----|-------------|
| `<cam>.events.*` | verschieden | R | Metadaten der letzten Aufnahme — erfordert „Ereignis-Datenpunkte" |
| `<cam>.push` | string | R | Push-Trigger — wird bei neuer Aufnahme sofort aktualisiert — erfordert „Echtzeit-Push-Trigger" |
| `<cam>.gallery` | string | R | HTML-Aufnahmegalerie — erfordert „Galerie-Widget" |

### Übersicht *(erfordert „Übersichts-Widget")*

| Datenpunkt | Typ | R/W | Beschreibung |
|-----------|-----|-----|-------------|
| `overview` | string | R | HTML-Kachelraster aller Kameras |

## Changelog

<!--
	Placeholder for the next version (at the beginning of the line):
	### **WORK IN PROGRESS**
-->
### 0.3.0 (2026-07-06)
* (ipod86) feat: Steuerbuttons scheduleOn/Off und detectorOn/Off für Kameras und Mikrofone
* (ipod86) feat: Empfindlichkeitszustände sensitivityMin, sensitivityMax, sensitivityGain für Kameras (0–100)
* (ipod86) feat: URL-Zustände audio_mp3 und audio_ogg für Mikrofone
* (ipod86) fix: objectDetectOn/Off und Snapshot-Schaltfläche auf Kameras (ot=2) beschränkt
* (ipod86) feat: flv.js in Dashboard-HTML eingebettet — keine externe Datei mehr nötig
* (ipod86) fix: FLV-Stream-Seitenverhältnis nach Tab-Wechsel korrekt beibehalten
* (ipod86) feat: ausklappbarer Tag-Filter in Aufnahmen- und Timeline-Ansicht
* (ipod86) feat: nativer Browser-Vollbild-Button im Live-View-Modal mit korrektem Seitenverhältnis
* (ipod86) feat: Header im Live-View-Modal blendet sich nach 3 s Inaktivität aus, erscheint bei Maus/Touch wieder
* (ipod86) fix: i18n-Keys fsEnter, fsExit, filterByLabel, timelineView, closePanel in allen 10 Sprachen

### 0.2.2 (2026-07-04)
* (ipod86) fix: verbleibende deutsche Strings im DashboardPanel via I18n.t() übersetzt
* (ipod86) fix: i18n-Keys loadingCamerasAndStreams, cfgCameraColumn, cfgStreamSourceColumn, reload in allen 11 Sprachen ergänzt
* (ipod86) chore: POSIX mv durch plattformübergreifendes node rename im src-admin Build-Script ersetzt

### 0.2.1 (2026-07-04)
* (ipod86) fix: alle deutschen Benutzer-Strings und Fehlermeldungen auf Englisch übersetzt
* (ipod86) fix: DashboardPanel zeigt i18n-fähige Meldungen bei fehlender IP und leerer Kameraliste
* (ipod86) chore: .npmignore entfernt — files-Feld in package.json steuert npm-Paketinhalt korrekt

### 0.2.0 (2026-07-04)
* (ipod86) feat: Kamera-Filter-Badges im Dashboard mit localStorage-Persistenz
* (ipod86) feat: FLV/MP4-Stream automatischer Reconnect nach Netzwerkfehler (5 s Verzögerung)
* (ipod86) feat: go2rtc WebSocket automatischer Reconnect nach unerwartetem Verbindungsabbruch (5 s)
* (ipod86) feat: go2rtc Stall-Erkennung — Retry wenn Stream nach 10 s schwarz bleibt
* (ipod86) fix: cameraStreams fehlte in io-package.json native-Defaults (Einstellungen wurden nicht gespeichert)
* (ipod86) fix: adminUI.config „custom" → „materialize" (404 auf der Adapter-Einstellungsseite)
* (ipod86) fix: Auflösungsanzeige beim FLV-Stream-Laden entfernt
* (ipod86) fix: CDN-Fallback für flv.js entfernt — nur lokale Kopie
* (ipod86) fix: AgentDVR/go2rtc-Sektionsüberschriften aus dem Dashboard-Raster entfernt
* (ipod86) fix: cfgGo2rtcMapping_tt Tooltip in allen 11 Sprachen korrigiert
* (ipod86) fix: setTimeout() durch this.setTimeout() ersetzt (E5005)
* (ipod86) fix: veraltete jsonConfig.json entfernt — Einstellungen werden durch React-Admin verwaltet (W5046)
* (ipod86) chore: admin/-Verzeichnis aus ESLint ausgeschlossen (OOM im CI verhindert)
* (ipod86) docs: README und README.de vollständig neu geschrieben mit allen Tabs und Einstellungen

### 0.1.0 (2026-07-01)
* (ipod86) feat: vollständige i18n im Live-Dashboard — alle UI-Texte in 11 Sprachen übersetzt
* (ipod86) fix: fehlende sm/md/lg/xl-Größenattribute in go2rtcMapping-Tabelle ergänzt (E5507)
* (ipod86) fix: fehlende Admin-i18n-Keys in 9 Sprachen übersetzt (E5606)

[Ältere Changelog-Einträge in CHANGELOG_OLD.md](CHANGELOG_OLD.md)

## Lizenz
MIT License

Copyright (c) 2026 ipod86 <david@graef.email>

Hiermit wird unentgeltlich jeder Person, die eine Kopie der Software und der zugehörigen Dokumentationen (die „Software") erhält, die Erlaubnis erteilt, sie uneingeschränkt zu nutzen, inklusive und ohne Ausnahme mit dem Recht, sie zu verwenden, zu kopieren, zu ändern, zusammenzuführen, zu veröffentlichen, zu verteilen, zu unterlizenzieren und/oder zu verkaufen, und Personen, denen diese Software überlassen wird, diese Rechte zu verschaffen, unter den folgenden Bedingungen: Der obige Urheberrechtsvermerk und dieser Erlaubnishinweis sind in allen Kopien oder Teilkopien der Software beizulegen.

DIE SOFTWARE WIRD OHNE JEDE AUSDRÜCKLICHE ODER IMPLIZIERTE GARANTIE BEREITGESTELLT, EINSCHLIEßLICH DER GARANTIE ZUR BENUTZUNG FÜR DEN VORGESEHENEN ODER EINEM BESTIMMTEN ZWECK SOWIE JEGLICHER RECHTSVERLETZUNG, JEDOCH NICHT DARAUF BESCHRÄNKT. IN KEINEM FALL SIND DIE AUTOREN ODER COPYRIGHTINHABER FÜR JEGLICHEN SCHADEN ODER SONSTIGE ANSPRÜCHE HAFTBAR ZU MACHEN, OB INFOLGE DER ERFÜLLUNG EINES VERTRAGES, EINES DELIKTES ODER ANDERS IM ZUSAMMENHANG MIT DER SOFTWARE ODER SONSTIGER VERWENDUNG DER SOFTWARE ENTSTANDEN.
