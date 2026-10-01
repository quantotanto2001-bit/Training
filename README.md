# Universal Athlete

Private Trainingsplanung als statische, offlinefähige Web-App: [App öffnen](https://quantotanto2001-bit.github.io/Training/).

## Version 4

- Drei Bereiche: Training, Fortschritt und Einstellungen.
- Flexibler Zyklus mit sechs Einheiten; das ist keine Vorgabe für sechs Trainingstage pro Woche.
- Krafteinheiten mit 45, 60 oder 90 Minuten, Ausdauer/Mobilität mit 20, 30, 45 oder 60 Minuten. Zeitangaben sind Schätzungen einschließlich Aufwärmen, Seitenwechsel und Satzpausen. Ein zu kurzer Grundblock wird ausdrücklich angezeigt. Mehr verfügbare Zeit muss nicht vollständig gefüllt werden.
- Festgelegte Grundbewegungen bleiben bei kürzeren Plänen erhalten. Ergänzungen und zusätzlicher Schwerpunkt sind optional.
- Ersatzübungen erhalten die jeweilige Bewegungsaufgabe. Sie sind nicht in jeder Hinsicht gleichwertig und garantieren keine individuelle muskuläre Balance.
- Letztes Gewicht wird für dieselbe Übungsvariante und denselben Aufbau vorgelegt. Eine vorgeschlagene Steigerung wird erst auf Wunsch übernommen. Wiederholungen und RIR werden nicht als bereits geleistet vorausgefüllt.
- Erreichst du in allen vorgesehenen Kraftsätzen die obere Wiederholungsgrenze mit gleichem Gewicht, erscheint eine Steigerungsempfehlung ohne abschließende Anstrengungsabfrage. Ein konkreter kg-Wert setzt deinen hinterlegten Gewichtsschritt voraus. Gemeldeter Technikverlust oder Training bis ans Limit verhindert eine automatische Steigerung. Mehr geplante Sätze und Last werden nicht gleichzeitig erhöht.
- Die Satztabelle zeigt Gewicht, Wiederholungen und Speicherstatus. Technik und RIR sind gemeinsam freiwillig aufklappbar. 45 statt 60 Minuten reduziert Sätze und Ergänzungen; die Wiederholungsbereiche bleiben gleich.
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

Kleine, antippbare Vorschaubilder in der Trainingsübersicht, neben dem Übungstitel und im gesamten Plan öffnen eine vergrößerte Ansicht. Das Öffnen aus einer Liste startet keine Einheit. Nur die große Ansicht spielt die Bewegung ab; bei reduzierter Bewegungseinstellung beginnt sie pausiert. Schließen, Escape und Seitenwechsel beenden den Player. Eingetragene Sätze und Entwürfe bleiben erhalten.

Pausierbare Bildfolgen zeigen bisher **Kurzhantel-RDL, Goblet Squat und beidbeiniges Wadenheben** in jeweils drei Phasen. Die eigens generierten Grafiken sind schematische Erinnerungen, keine vermessenen Bewegungen oder individuell validierten Technikvorgaben. Sie sind nur den dargestellten Varianten zugeordnet. Wadenheben zeigt das Bewegungsprinzip ohne Zusatzgewicht. Die Dateien sind offline verfügbar und können als GIF heruntergeladen werden. Ein kleines Play-Symbol kennzeichnet vorhandene Animationen. Die anderen Einträge zeigen eine Bild-/Technikansicht mit einem ausdrücklichen Hinweis auf die fehlende Animation. Für abweichende Varianten wie Step-ups oder eine nicht spezifizierte geführte Station wird keine unpassende Übungsgrafik als Darstellung ausgegeben. Bankdrücken und Ringrudern erhalten wegen nicht überzeugender Zeichnungen vorerst keine Bildfolge; ihre Technikvideos bleiben verfügbar. Es gibt noch keine vollständige GIF-Sammlung für die 67 aktuellen Übungseinträge einschließlich Varianten. Prompts und Auswahlhinweise stehen in `assets/motion/PROMPTS.json`; der vollständige Zuordnungsstand steht in `assets/motion/COVERAGE.json`.

## Nachweise und Prüfung

Die Bildfolgen wurden am 30.09.2026 erneut mit den App-Hinweisen und Technikquellen abgeglichen. RDL v2 zeigt eine zum Rumpfwinkel passende Kopfhaltung und fest ausgerichtete Füße. Beide Bankdrück-Entwürfe wurden verworfen: Die überarbeitete Zeichnung bildete Hände und Hantelgriffe nicht überzeugend ab. Wadenheben hebt die untere Halteposition länger hervor. Drei gezeichnete Positionen können keine vollständige, biomechanisch validierte 1:1-Bewegung darstellen. Die Sichtprüfung und ihre Grenzen stehen in `assets/motion/REVIEW.md`.

Quellen sind unter Einstellungen verlinkt. Sie stützen allgemeine Trainingsprinzipien; die konkrete Zusammenstellung, Zeitbudgets und Alternativen sind praktische Ableitungen, kein nachgewiesenes individuelles Optimum. Sporttechnik für Klettern, BJJ, Boxen oder Schwimmen erfordert später auch sportartspezifisches Üben.

- `npm test`: Timer, Video-URLs, Zeitpläne, Varianten, Fortschrittsregeln und Wochenauswertung.
- `npm install` und `npx playwright install --with-deps chromium webkit`, dann `npm run test:e2e`: mobile Bedienung, Datenmigration, Eingaben nach Neuladen, verkürzter Abschluss, Gewichtsvorschlag, Ersatzübungen und RDL-Schnellansicht.
- GitHub Actions führt diese Prüfungen für Pushes und Pull Requests aus. WebKit mit iPhone-Viewport ersetzt keinen Test auf physischer iPhone-Hardware.
