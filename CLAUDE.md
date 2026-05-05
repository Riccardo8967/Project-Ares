# Projekt Ares — Training Dashboard

Single-File HTML Trainings-Dashboard für **Riccardo Imboden**, Sub-Elite Läufer & Triathlet im Comeback nach Stressfraktur (Comeback aktiv seit Januar 2026).

## Architektur — wichtig zu verstehen

**Alles in einer einzigen Datei**: `projekt_ares.html` (~2000 Zeilen, ~150KB).

- Inline CSS, HTML, JS — kein Framework, kein Build-System, kein Bundler.
- Daten persistieren ausschliesslich in `localStorage`.
- KI-Chat nutzt Anthropic API direkt im Browser (`anthropic-dangerous-direct-browser-access: true`) mit Modell `claude-haiku-4-5-20251001`. API-Key wird lokal gespeichert.
- Sprache: Deutsch (Schweizer Deutsch in Locale-Strings: `de-CH`, Zeitzone `Europe/Zurich`).
- Wenn neue Features gewünscht sind: NIEMALS aus dem Single-File-Konzept ausbrechen, ohne mit dem User zu sprechen. Das ist eine bewusste Design-Entscheidung (portable, keine Server-Abhängigkeit, läuft offline ausser für KI-Chat).

## Athletenprofil (hardcoded im HTML)

- PBs: 5km **17:05** (3:25/km) · 10km **35:00** (3:30/km) · HM **1:16:25** (3:37/km)
- Stressfraktur → Comeback seit Januar 2026, ca. 65% zurück (Stand April 2026)
- Easy-Run-Pace im Comeback: 4:30–5:00/km
- Hauptdisziplin Laufen, sekundär Triathlon (Rennvelo + Schwimmen, aktuell mehr Velo wegen Comeback)
- Standard-Wochenplan: Mo Gym+Easy · Di⚡ Intervalle 400/800m · Mi Gym leicht+Easy+Stabi · Do⚡ Intervalle 1km · Fr Ruhetag · Sa Long Ride 3h · So Long Run+Stabi
- Airofit (Atemtraining) und Push-ups jeden Tag im Morgenslot

## Datei-Layout (alles in `projekt_ares.html`)

| Block | Zeilen ungefähr | Inhalt |
|-------|------|--------|
| `<style>` | 7–500 | Alle CSS Variablen, Layout, Themes (Dark Mode mit `--accent` rot, `--green`, `--blue`, `--yellow`, `--purple`) |
| HTML body | 500–800 | Nav, Profil-Section, Wochenplan-Section, Adjuster-Section, Verlauf-Section, Modals, Chat-FAB |
| `<script>` | 800–1968 | Alles JS — Datenlayer, Render-Funktionen, Modale, Chat |

Section-IDs für Navigation: `sec-profile`, `sec-plan`, `sec-adjuster`, `sec-verlauf`.

## localStorage Keys

```
ares_plan        Array von 7 Tagen (Mo–So) — Wochenplan-Template
ares_activities  Array geloggter Aktivitäten, neueste zuerst
ares_adjuster    Adjuster-Settings (Meeting-Zeit, gesperrte Morgen, Ankunft)
ares_goals       { weekKm, p5k, p10k, pHm } — Wochenziel + Saison-Pace-Ziele
ares_api_key     Anthropic API Key für Chat (sk-ant-...)
```

### Schema: Tages-Eintrag in `ares_plan`

```js
{
  name: 'Montag',
  isKey: false,    // hervorgehoben in rot wenn Key-Day
  isRest: false,   // gedimmt wenn Ruhetag
  morning:  [ { text:'🫁 Airofit', t:'t-airofit', type:'airofit', subtype:'Standard' }, ... ],
  evening:  [ { text:'🏃 Easy Run', t:'t-run' }, ... ],
  daytime:  [ { text:'🚴 Long Ride 3h', t:'t-ride' }, ... ],
  keySession: { text:'⚡ Intervalle 400m/800m', shiftTo:2 }  // Optional, für Adjuster-Logik
}
```

`type` und `subtype` sind bei Picker-erstellten Sessions gesetzt; bei legacy BASE_PLAN-Sessions nur `text` und `t` (CSS-Klasse).

CSS Pill-Klassen: `t-run` (grün), `t-key` (rot, Intervalle), `t-ride` (gelb), `t-gym` (lila), `t-airofit` (blau).

### Schema: Aktivitäts-Eintrag in `ares_activities`

```js
{
  id: 'act_1745000000000',
  date: '2026-04-30',          // ISO YYYY-MM-DD (siehe TZ-Hinweis unten)
  dayIndex: 3,                  // 0=Mo bis 6=So
  sessionName: 'Zone 2',        // Subtype-Name aus SUBTYPES
  type: 'run',                  // run | ride | gym | airofit (intervals existiert legacy noch)
  rating: 4,                    // 0-5 Sterne (Gefühl)
  reflection: '...',            // freitext
  metrics: {
    distance:  '8.5',           // km (string aus form input)
    duration:  '42:30',         // min:sec für run/intervals; h:min für ride
    pace:      '4:55',          // min/km
    hr:        '145',           // bpm
    elevation: '800',           // m (ride only)
    reps:      '8',             // intervalle only
    repDist:   '400',           // m für Bahnintervalle, km für Strassenintervalle
    rest:      '90',            // sek pause
    notes:     '...'            // gym free-text
  }
}
```

Wichtig: `type='intervals'` existiert nur in **legacy** Logs (vor dem Run/Intervalle-Merge). Neue Intervall-Aktivitäten sind `type='run'` mit `sessionName` aus `RUN_INTERVAL_SUBTYPES = ['Fahrtspiel', 'Bahnintervalle', 'Intervalle']`. Helper `isIntervalSession(a)` deckt beide Fälle ab — IMMER den Helper benutzen, nicht direkt auf `type` prüfen.

## Konstanten (oben im Script-Block)

```js
SHORT = ['Mo','Di','Mi','Do','Fr','Sa','So']
FULL  = ['Montag', 'Dienstag', ...]
SUBTYPES = {
  run:     ['Zone 2', 'Long Run', 'Tempo Run', 'Recovery Run', 'Fahrtspiel', 'Bahnintervalle', 'Intervalle'],
  ride:    ['Zone 2', 'Long Ride', 'Easy Ride', 'Intervalle Rad'],
  gym:     ['Gym schwer', 'Gym leicht', 'Stabi Beine', 'Core'],
  airofit: ['Standard', 'Intensiv', 'Recovery']
}
RUN_INTERVAL_SUBTYPES = ['Fahrtspiel', 'Bahnintervalle', 'Intervalle']
PB_DATA              // mapping für Saisonziel-Vergleich
DEFAULT_GOALS        // Initial-Werte für ares_goals
ICS_SLOTS            // Standard-Zeiten für Kalender-Export (06:30/09:00/19:00)
ICS_TIMEZONE_BLOCK   // VTIMEZONE Europe/Zurich für ICS-Export
MW_WEEKS_BACK = 5    // Mehrwochenansicht: 5 Wochen rückwärts
MW_WEEKS_FWD  = 2    // Mehrwochenansicht: 2 Wochen vorwärts
```

## Features (was implementiert ist)

**Profil-Section**
- Hardcoded Hero-Card mit Avatar, Name, Comeback-Status
- 3 PB-Cards (5k, 10k, HM) — hardcoded
- Saisonziele-Section mit 3 Goal-Cards + "Bearbeiten"-Button → öffnet Goals-Modal mit Auto-Save
- Comeback-Fortschrittsbalken (animiert auf 65%)

**Wochenplan-Section**
- Zwei Ansichten via Toggle: "📋 Woche" (default) und "📅 Mehrwochen"
- "📥 In Kalender"-Button öffnet ICS-Export-Modal (Diese Woche / 2 Wochen / 4 Wochen)
- **Wochenstatistik-Block** (nur in Wochen-Ansicht): Distanz mit Wochenziel-Progress, Trainingszeit, Anzahl Sessions nach Typ
- **Wochengrid**: 7 Day-Cards mit Pills pro Slot (Morgen/Tagsüber/Abend), Häkchen-Badge "✓ N" oben rechts wenn Aktivitäten geloggt, ✏️ Bearbeiten-Button (hover), "+ Einheit loggen"-Button
- **Mehrwochenansicht**: 8-Wochen-Kalender mit farbigen Dots pro Tag (1 Dot pro Aktivität), Klick auf Tag öffnet Detail-Modal

**Adjuster-Section ("Woche anpassen")**
- Inputs: Meeting-Zeit (Start/Ende), Ankunftszeit, gesperrte Morgen (Mo–So Checkboxen)
- "⚡ PLAN GENERIEREN"-Button rendert angepassten Plan mit Google-Calendar-Links pro Tag (eventedit URLs)
- Auto-Save aller Inputs (silent), Status-Pill "✓ Auto-gespeichert"

**Verlauf-Section**
- Toolbar: Counter "N Aktivitäten gespeichert" + "⬇ CSV Export"-Button
- Activity-List: letzte 20 Aktivitäten als Cards mit Sterne-Rating, Reflection, Metric-Chips
- Auf Cards mit Datum-Mismatch (date passt nicht zu dayIndex) erscheint "⚠ Datum korrigieren"-Button
- **Progress-Sidebar**: Mini-Balkendiagramme für letzte 5 Sessions pro Typ+Subtype (nur wenn ≥2 Logs)

**Modals**
- Plan-Edit: Sessions pro Slot editierbar als Textfelder, "+ Session hinzufügen" öffnet **Inline-Picker** (Type-Buttons + Subtype-Pills, gleiches Look wie Log-Modal). Auto-Save bei jeder Aktion. Save-Button heisst "✓ Schliessen".
- Log-Activity (2-Schritt): Type-Picker (Run/Rennvelo/Gym/Airofit) → Subtype-Pills → Datum (default: Wochentag dieser Woche) + Gefühl + Reflektion + Metriken (typspezifisch)
- Progress-Report (post-log): zeigt Vergleich zur letzten ähnlichen Einheit (FORTSCHRITT/RÜCKSCHRITT/STABIL)
- Day-Detail (Mehrwochenansicht-Klick): zeigt alle Aktivitäten dieses Tages
- Goals-Edit: Wochenziel-km + 3 Pace-Inputs, debounced Auto-Save
- Kalender-Export: 3 Scope-Buttons (Diese Woche / 2 Wochen / 4 Wochen) → generiert ICS-Datei, Download

**KI-Chat (Floating Action Button unten rechts)**
- System-Prompt enthält Athletenprofil + Standard-Wochenplan
- API-Key-Modal beim ersten Open
- Suggestion-Chips für Quick-Fragen
- Chat-History wird NICHT in localStorage persisitert (nur In-Memory, max 20 Messages)

## Auto-Save

Wichtig für UX: alle Modals und der Adjuster speichern automatisch. Es gibt keine manuellen "Speichern"-Buttons mehr (nur "✓ Schliessen"-Buttons). Status-Pill `.autosave-pill` zeigt "✓ Auto-gespeichert" mit kurzem "⏳ Speichere…"-Flash bei jeder Änderung.

Implementierungs-Pattern:
- Adjuster: `onchange="autoSaveAdjuster()"` auf jedem Input, `toggleChk` ruft auch autoSave
- Goals: `oninput="autoSaveGoals()"` mit 350ms debounce
- Plan-Edit: `oninput="updateSessionText(...)"` mit 300ms debounce für Text, sofortiger Save bei Add/Remove/Picker

## ICS Kalender-Export

Generiert RFC5545-konforme .ics-Datei mit:
- VTIMEZONE für Europe/Zurich (mit Sommerzeit-Regeln)
- Ein VEVENT pro Slot pro Tag (nicht pro Session — Sessions desselben Slots werden im SUMMARY mit `+` verknüpft)
- VALARM 30min vor Start
- Eindeutige UIDs (`ares-{date}-{slot}@projekt-ares`) → Re-Import überschreibt vorhandene Events

User-Workflow: Button klicken → ICS runterladen → Doppelklick öffnet Standard-Kalender mit Import-Dialog. Bei Google Calendar im Browser: Einstellungen → Importieren & Exportieren → Datei wählen.

## Bekannte Eigenheiten / Design-Entscheidungen

- **Date-Handling**: Activity-Datum wird beim Loggen aus dem geklickten Wochentag der aktuellen Woche abgeleitet (`dateForDayIndex(idx)`), NICHT aus `new Date()`. User kann im Datums-Input überschreiben. Datum-Strings sind lokale `YYYY-MM-DD` (siehe Helper `ymd(d)`).
- **TZ-Risiko**: Activity-Datum wird mit lokalen Date-Komponenten gebildet, alte Logs (vor dem Fix) können `new Date().toISOString().slice(0,10)` verwenden — UTC. Für CET/CEST Edge-Cases (sehr späte Nacht) kann das einen Tag verschieben. Helper `suggestCorrectedDate(act)` zeigt User einen "⚠ Datum korrigieren"-Button im Verlauf.
- **Pillen-Matching für Häkchen**: Funktion `pillMatchesActivity(pill, act)` mit mehrstufigem Fallback — Subtype exact (für Picker-Pills), Type-Level für Airofit/Intervalle/Gym, Cleaned-Text-Match (Emoji entfernt), Loose-Match für Run/Ride. Lieber zu liberal matchen als gar nicht.
- **Backward Compat**: Alte type='intervals' Logs werden in `isIntervalSession()`, `buildComparison()` (mit `norm` helper) und `activityKm()` korrekt behandelt. Niemals `a.type === 'intervals'` direkt prüfen — immer Helper verwenden.
- **Bahnintervalle vs Strassenintervalle**: Bahnintervalle (`repDist` in **Meter**) vs Intervalle/Strasse (`repDist` in **km**). `activityKm()` berücksichtigt das.

## Konventionen für neue Features

- Vor jeder grossen Änderung mit User über Architektur sprechen — Single-File-Konzept ist heilig
- Deutsch in allen UI-Strings, `de-CH` Locale für Datums-Formatierung, `Europe/Zurich` Zeitzone
- Bei Auto-Save: Pattern mit `.autosave-pill`-Status verwenden, debounced Save für rapid input
- Neue localStorage-Keys: Prefix `ares_*`, JSON-stringified, immer mit Default-Fallback laden
- CSS-Variablen statt fester Farben (siehe `:root` oben in style)
- Kein Bullet-Heavy Code, keine externe Build-Pipeline einführen
- Bei Modals: bestehendes Pattern wiederverwenden (`.overlay` + `.modal`, `is-open`-Class, Background-Click-to-close-Funktion)

## Bekannte offene Themen / mögliche Roadmap

**Coros FIT-Importer (User hat ZIP mit ~100 .fit Files vom Coros Watch)**
- User entschied gegen Bulk-Import, will manuell die Schlüssel-Sessions nachtragen
- Falls später gewünscht: JSZip + fit-file-parser via CDN, Upload-UI mit Datum-Filter, Vorschau-Liste, Duplikat-Erkennung gegen `ares_activities`
- ZIP-Beispiel liegt aktuell auf User-Desktop unter `exportSportData_*` (nur als Referenz)

**Strava/Garmin Sync**
- User hat das mehrmals erwähnt aber explizit verworfen wegen OAuth-Komplexität in Single-File-Architektur
- Falls jemals: Cloudflare Worker als OAuth-Proxy, würde Single-File-Konzept brechen

**Push-Notifications**
- Wurde diskutiert, verworfen weil Service Worker für lokale HTML keinen Sinn macht
- Lösung: User nutzt Google Calendar (ICS-Export) für Reminders

## Ausführen / Testen

- Datei einfach in Browser öffnen: `file:///C:/Users/imbod/Documents/Claude/Projects/Projekt%20Ares/projekt_ares.html`
- Funktioniert offline (ausser KI-Chat — der braucht Internet für Anthropic API)
- Edge, Chrome, Firefox sollten alle gehen (moderne Browser, ES2020+ Features)
- Mobile responsive (Breakpoints bei 960px und 600px)

## Datei-Pfad

`C:\Users\imbod\Documents\Claude\Projects\Projekt Ares\projekt_ares.html`
