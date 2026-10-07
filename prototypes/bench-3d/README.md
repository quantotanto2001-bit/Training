# Bankdrücken: geometrischer 3D-Prototyp

## Neues menschliches Modell (07.10.2026)

`bench-human.mp4` und `bench-human.gif` verwenden die detaillierte CC0-Körperoberfläche, das Skelett und die Hautgewichte aus den MakeHuman-Core-Assets. `human.py` setzt diese mit eigener inverser Kinematik und linearem Skinning in die Bankdrück-Pose; `animate-human.py` rendert die Schleife und prüft 81 Posen. Graue Oberfläche, dunkle Shorts/Schuhe und rote Brustmarkierung orientieren sich an der vom Nutzer vorgegebenen Fitness-Illustration. Dies ist eine stilistische Annäherung, keine Kopie des Shutterstock-Clips und keine Animation aus dessen Originalmodell.

Der neue Renderer verwendet einen Tiefenpuffer je Pixel und interpolierte Oberflächennormalen. Er beseitigt die falsche Überdeckung zwischen Arm und Bank im alten Flächensortierer. Die Prüfung zählt Körperpunkte mit überwiegendem Arm-Einfluss innerhalb des Bankpolsters und prüft konstante Knochenlängen; sie ist keine vollständige Kollisionsprüfung sämtlicher Dreiecke. Die untere, mittlere und obere Pose wurden zusätzlich aus zwei Blickwinkeln betrachtet (`human-review.png`). Fingerbewegung, Muskelmarkierung und Schulterbewegung sind weiterhin illustrative Vereinfachungen. Keine fachliche Freigabe als Technikanleitung.

Wiederherstellung: `python animate-human.py`. `human-source.zip` enthält die vollständigen Quelltexte und benötigten CC0-Assets einschließlich Lizenztexten. Die Live-App wurde noch nicht umgestellt.

### Herkunft

- [MakeHuman Core-Repository](https://github.com/makehumancommunity/makehuman): `makehuman/data/3dobjs/base.obj`, `data/rigs/default.mhskel`, `data/rigs/default_weights.mhw`.
- Morphs: `caucasian-male-young.target`, `universal-male-young-maxmuscle-minweight.target` aus `data/targets/macrodetails`.
- [Asset-Lizenz](https://github.com/makehumancommunity/makehuman/blob/master/LICENSE.md): mitgelieferte Modell-Assets unter CC0 1.0. Originalhinweise in `human-assets/LICENSE.md` und `human-assets/LICENSE.ASSETS.md`.

## Historischer einfacher Prototyp

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
