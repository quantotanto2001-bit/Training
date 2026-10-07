# Bankdrücken: geometrischer 3D-Prototyp

Eigenständig erstellte Low-Poly-Figur mit festem Rumpf, zwei Armsegmenten pro Seite und inverser Kinematik. Hände und Kurzhanteln benutzen dieselbe lokale Transformation. Keine KI-Bildinterpolation, keine Fremdmodelle. Dies ist ein Bewegungs-/Darstellungsprototyp zur Beurteilung durch den Nutzer, keine freigegebene Technikanleitung. Die Live-App verwendet weiterhin die bisherige Animation.

## Dateien

- `bench-3d.mp4`: 800 × 800, 24 fps, fünf Sekunden, H.264.
- `bench-3d.gif`: kompakte Vorschau, 12 fps.
- `review.png`: untere, mittlere und obere Position aus zwei Blickwinkeln.
- `render.py`: vollständiges parametrisches 3D-Modell, Rig und Software-Renderer.
- `validation.json`: Prüfung konstanter Armlängen über alle 120 Frames.

Wiederherstellung: `python render.py` mit Python, NumPy, Pillow, FFmpeg und DejaVu Sans. Körpermaße, Griffdrehung, Kamera und Bewegungsweg sind im Quelltext editierbar. Die Polygone werden nach Tiefe sortiert; an überlappenden Körperteilen können sichtbare Darstellungsartefakte auftreten. Noch kein anatomisch geriggtes, professionelles Character-Modell.

## Prüfung und Grenzen

Visuell geprüft: obere/mittlere/untere Position in Schrägansicht und vom Fußende; feste Auflagepunkte; unveränderliche Hantelgeometrie; Hände folgen den Hanteln; annähernde Ellenbogenstreckung oben. Rechnerisch geprüft: 32 cm Oberarm, 30 cm Unterarm, konstant über alle Frames. Keine fachliche Abnahme oder Kollisionsprüfung aller Oberflächen; keine Simulation von Schulterblattbewegung oder Weichteilen. Der dargestellte Griffwinkel ist ein Beispiel und keine universelle Vorgabe.

Technischer Abgleich am 07.10.2026 mit [ACE Chest Press](https://www.acefitness.org/resources/everyone/exercise-library/19/chest-press/): stabile Auflagepunkte, geschlossener Griff, neutrale Handgelenke und kontrollierte Bewegung. ACE zeigt einen pronierten Griff; die leichte Eindrehung dieses Modells ist eine illustrative Variante. Die Animationsgeschwindigkeit stellt keine individuelle Trainingsvorgabe dar.
