# Universal Athlete

Private Trainingsplanung als statische, offlinefähige Web-App: [App öffnen](https://quantotanto2001-bit.github.io/Training/).

## Version 4

- Drei Bereiche: Training, Fortschritt und Einstellungen.
- Flexibler Zyklus mit sechs Einheiten; das ist keine Vorgabe für sechs Trainingstage pro Woche.
- Krafteinheiten mit 45, 60 oder 90 Minuten, Ausdauer/Mobilität mit 20, 30, 45 oder 60 Minuten. Zeitangaben sind Schätzungen einschließlich Aufwärmen, Seitenwechsel und Satzpausen. Ein zu kurzer Grundblock wird ausdrücklich angezeigt. Mehr verfügbare Zeit muss nicht vollständig gefüllt werden.
- Festgelegte Grundbewegungen bleiben bei kürzeren Plänen erhalten. Ergänzungen und zusätzlicher Schwerpunkt sind optional.
- Ersatzübungen erhalten die jeweilige Bewegungsaufgabe. Sie sind nicht in jeder Hinsicht gleichwertig und garantieren keine individuelle muskuläre Balance.
- Letztes Gewicht wird für dieselbe Übungsvariante und denselben Aufbau vorgelegt. Eine vorgeschlagene Steigerung wird erst auf Wunsch übernommen. Wiederholungen und RIR werden nicht als bereits geleistet vorausgefüllt.
- Kraft, Schnellkraft, Fertigkeiten, Nacken und Ausdauer haben unterschiedliche Fortschrittsregeln. Nacken-Isometrie erfasst Richtung, Widerstand und Anstrengung; bloße Haltezeit ist kein Kraftmaß.
- Laufende Eingaben werden lokal gespeichert. Sätze lassen sich wieder öffnen; eine verkürzte Einheit bewahrt alle geleisteten Sätze und zählt nicht als vollständig absolviert.
- Kalenderwoche und tatsächliche Arbeitssätze statt eines pauschalen Athletik-Scores.

## Daten und Updates

Die bestehende IndexedDB bleibt erhalten. Alte Einheiten behalten ihre ursprüngliche Übungsliste; neu gestartete Einheiten bekommen einen versionierten Plan-Schnappschuss. Historische Freitext-Ersatzübungen und früher gemischte Gerätevarianten bleiben in der Historie, fließen aber nicht ungeprüft in neue Lastempfehlungen ein. Nach der ersten Einheit mit einer eindeutig erfassten Variante steht deren Gewicht beim nächsten Training bereit.

Abschluss, Protokoll und Wechsel zur nächsten Einheit werden atomar gespeichert. Export/Import sichert Protokolle, Übungsnotizen, Einstellungen und eine laufende Einheit. Beim Import werden vorhandene neuere Einträge behalten. Ein auf dem Gerät laufendes Training behält seinen Programmstand.

Daten liegen auf dem jeweiligen Gerät. Exportiere unter Einstellungen regelmäßig eine Sicherung; ein Browser-Reset oder Löschen der Websitedaten kann die lokalen Daten entfernen.

## iPhone-Timer und Videos

Der Pausentimer berechnet die verbleibende Zeit aus einer gespeicherten Endzeit. Hintergrundpausen oder ein App-Wechsel verfälschen die Restzeit beim Zurückkehren dadurch nicht. iOS garantiert einer Web-App keinen laufenden JavaScript-Prozess oder hörbaren Alarm bei gesperrtem Bildschirm.

YouTube-Videos öffnen in einem eingebetteten Player. Eine Sperre der Einbettung durch den Anbieter kann die App nicht aufheben; dafür bleibt ein Link zur Quelle verfügbar.

## Übungsbilder

Die erste animierte Schnellansicht zeigt den **Kurzhantel-RDL** als drei pausierbare Bewegungsphasen. Die Grafik wurde eigens generiert und ist eine schematische Erinnerung, keine vermessene Bewegung oder individuell validierte Technikvorgabe. Sie wird nicht für die geführte RDL-Variante wiederverwendet. Es gibt derzeit keine vollständige GIF-Sammlung für alle Übungen.

## Nachweise und Prüfung

Quellen sind unter Einstellungen verlinkt. Sie stützen allgemeine Trainingsprinzipien; die konkrete Zusammenstellung, Zeitbudgets und Alternativen sind praktische Ableitungen, kein nachgewiesenes individuelles Optimum. Sporttechnik für Klettern, BJJ, Boxen oder Schwimmen erfordert später auch sportartspezifisches Üben.

- `npm test`: Timer, Video-URLs, Zeitpläne, Varianten, Fortschrittsregeln und Wochenauswertung.
- `npm install` und `npx playwright install --with-deps chromium webkit`, dann `npm run test:e2e`: mobile Bedienung, Datenmigration, Eingaben nach Neuladen, verkürzter Abschluss, Gewichtsvorschlag, Ersatzübungen und RDL-Schnellansicht.
- GitHub Actions führt diese Prüfungen für Pushes und Pull Requests aus. WebKit mit iPhone-Viewport ersetzt keinen Test auf physischer iPhone-Hardware.
