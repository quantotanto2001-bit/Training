# Universal Athlete

Private Trainingsplanung als statische, offlinefähige Web-App: [App öffnen](https://quantotanto2001-bit.github.io/Training/).

## Version 4.1

- Gewichtsangabe direkt an den Sätzen: je Kurzhantel, Gesamtlast, Kabelanzeige oder Zusatzgewicht. Belastete Übungen verlangen eine gültige Last; zulässige Varianten ohne Zusatzgewicht können 0 verwenden. Frühere uneindeutige kg-Werte werden erst nach einer ausdrücklichen Bestätigung für Empfehlungen verwendet und nicht umgerechnet.
- Vorschlag für heute und verfügbarer Gewichtsschritt sind sichtbar. Sätze haben beschriftete Speichern-/Ändern-Knöpfe; Technik und RIR bleiben freiwillig aufklappbar.
- Einseitige Übungen erfassen links und rechts getrennt, einschließlich Haltezeiten. Die schwächere Seite bestimmt die Laststeigerung. Alte gemeinsame Seitenwerte bleiben als solche lesbar und bearbeitbar.
- Zeitplanung nutzt die Mitte der vorgegebenen Pausenbereiche. Ab drei vollständig und aktiv erfassten vergleichbaren Einheiten berücksichtigt sie den tatsächlichen Zeitbedarf. Der begrenzte Korrekturfaktor kürzt keine Pausen und wird getrennt für Kraft- und übrige Einheiten ermittelt.
- Das Zeitbudget ist auch während einer Einheit änderbar. Die verbleibende Planung entfernt zuerst unbegonnene Ergänzungen, dann zusätzliche Sätze. Gespeicherte Sätze, Varianten und Eingaben bleiben erhalten; absolvierte Übungen bekommen durch ein größeres Budget keine neuen Pflichtsätze. Ein zu knappes Budget erhält einen konkreten Hinweis.
- Die aktive Dauer schließt ausdrücklich pausierte Trainingsunterbrechungen aus und übersteht Neuladen. Satzpausen und ein normaler Appwechsel zählen weiter. Bei älteren laufenden Einheiten beginnt diese Erfassung mit dem Update; ihre vorherige aktive Dauer wird nicht erfunden.
- Wiederholt verfehlte Zielbereiche oder Ausführungsverlust in zwei vergleichbaren Einheiten können einen leichteren Gewichtsschritt oder einen Satz weniger vorschlagen. Drei vergleichbare Einheiten ohne zusätzliche Wiederholung geben einen erklärten Stillstandshinweis. Verkürzte, unvollständige Vorgaben gelten dafür nicht als Misserfolg. Diese konservativen Regeln sind praktische Heuristiken, keine wissenschaftlich nachgewiesene optimale individuelle Dosierung oder automatische Erholungsdiagnose.
- Fortschritt zeigt bestätigte Laststeigerungen trotz zunächst geringerer Wiederholungen im Zielbereich, zusätzliche Wiederholungen, Haltezeiten und die getrennten Seitenwerte. Vergleiche bleiben auf dieselbe Variante, denselben Aufbau, dieselbe Gewichtsangabe und gleiche Satzzahl beschränkt.
- Halte- und Pausentimer bewahren den Abschlusszustand nach einem Neuladen. Ein verpasster Ablauf wird angezeigt, ohne einen verspäteten Alarmton zu wiederholen. Keine externe Datensicherung oder Cloud-Synchronisierung wurde ergänzt.

## Grundfunktionen

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

Halteübungen haben einen separaten Halte-Timer direkt über der Satzeingabe. Startknöpfe übernehmen die vorgegebenen Sekunden (z. B. 30 oder 45), mit Anhalten/Fortsetzen und erneutem Start für die andere Seite bzw. Richtung. Der Timer zählt auch nach App-Wechsel oder Neuladen korrekt weiter. Bei Ablauf erscheint ein Hinweis und, sofern der Browser es erlaubt, ein kurzer Ton im Vordergrund. Der Ablauf speichert keinen geleisteten Satz automatisch.

Step-up-Varianten verwenden eine eigene Step-up-Videoreferenz von E3 Rehab; der bisher geerbte Pistol-Squat-Link wird auch in bestehenden Trainingsschnappschüssen ersetzt.

Der Pausentimer berechnet die verbleibende Zeit aus einer gespeicherten Endzeit. Hintergrundpausen oder ein App-Wechsel verfälschen die Restzeit beim Zurückkehren dadurch nicht. iOS garantiert einer Web-App keinen laufenden JavaScript-Prozess oder hörbaren Alarm bei gesperrtem Bildschirm.

YouTube-Videos öffnen in einem eingebetteten Player. Eine Sperre der Einbettung durch den Anbieter kann die App nicht aufheben; dafür bleibt ein Link zur Quelle verfügbar.

## Übungsbilder

Kleine, antippbare Vorschaubilder in der Trainingsübersicht, neben dem Übungstitel und im gesamten Plan öffnen eine vergrößerte Ansicht. Das Öffnen aus einer Liste startet keine Einheit. Nur die große Ansicht spielt die Bewegung ab; bei reduzierter Bewegungseinstellung beginnt sie pausiert. Schließen, Escape und Seitenwechsel beenden den Player. Eingetragene Sätze und Entwürfe bleiben erhalten.

Alle **67 aktuellen Übungseinträge einschließlich Alternativen** haben nun eine pausierbare Bildfolge und einen GIF-Download. Gleiche Bewegungen verwenden dieselben Grafiken; abweichende Varianten wie Step-up, Bulgarian Split Squat, Kurzhantel- und geführtes Bankdrücken haben getrennte Darstellungen. Alle Phasen und GIFs werden bei der Installation für die Offline-Nutzung gespeichert. Die vier Richtungen der Nackenisometrie zeigen getrennte Haltepositionen mit neutralem Kopf. Das Runden-Conditioning zeigt eine ausdrücklich bezeichnete Beispielrunde aus bekannten Übungen.

## Nachweise und Prüfung

Die eigens generierten Grafiken wurden mit den Übungshinweisen abgeglichen und als extrahierte Einzelbilder visuell geprüft, zuletzt am 05.10.2026. Frühere fehlerhafte Bankdrück- und Ringruder-Entwürfe wurden ersetzt. Die Bildfolgen sind schematische Technikerinnerungen mit drei oder vier Positionen, keine durchgehenden, biomechanisch vermessenen oder individuell validierten Bewegungen. Ihr Abspieltempo ist keine Trainingsvorgabe. Halteübungen ruhig halten und Bewegungstiefe an die eigene Kontrolle anpassen. Die geführten Übungen zeigen eine Beispielstation; deren Aufbau muss zur tatsächlich verwendeten Station passen. Technikreferenzen bleiben verfügbar.

Der vollständige Zuordnungsstand steht in `assets/motion/COVERAGE.json`, die Produktions- und Sichtprüfungsnotizen in `assets/motion/production-jobs.json`. `scripts/build-motion.py` extrahiert generierte Vorlagen und erstellt GIFs; `scripts/build-motion-catalog.py` veröffentlicht ausschließlich freigegebene Zuordnungen. Die ursprünglichen Vorlagenpfade in den Produktionsnotizen beziehen sich auf die Erstellungssitzung; fertige Frames und GIFs liegen im Repository.

Quellen sind unter Einstellungen verlinkt. Sie stützen allgemeine Trainingsprinzipien; die konkrete Zusammenstellung, Zeitbudgets und Alternativen sind praktische Ableitungen, kein nachgewiesenes individuelles Optimum. Sporttechnik für Klettern, BJJ, Boxen oder Schwimmen erfordert später auch sportartspezifisches Üben.

- `npm test`: Timer, Video-URLs, Zeitpläne, Varianten, Fortschrittsregeln und Wochenauswertung.
- `npm install` und `npx playwright install --with-deps chromium webkit`, dann `npm run test:e2e`: mobile Bedienung, Datenmigration, Eingaben nach Neuladen, verkürzter Abschluss, Gewichtsvorschlag, Ersatzübungen und RDL-Schnellansicht.
- GitHub Actions führt diese Prüfungen für Pushes und Pull Requests aus. WebKit mit iPhone-Viewport ersetzt keinen Test auf physischer iPhone-Hardware.
