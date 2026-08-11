// Universal Athlete v3.2 — Trainingsplan als Datenmodell
// Übertragen aus Universal_Athlete_v3_2_Layout_Fixed.pdf + Video_Technikguide.pdf
// Alle Video-URLs sind aus den echten Hyperlink-Annotationen des PDFs extrahiert (keine erfundenen Links).

export const TYPES = {
  STRENGTH: 'strength',
  POWER: 'power',
  SKILL: 'skill',
  MOBILITY_ACTIVE: 'mobility_active',
  MOBILITY_LOADED: 'mobility_loaded',
  STRETCH_STATIC: 'stretch_static',
  CARDIO: 'cardio',
  FINISHER: 'finisher',
};

export const TYPE_LABELS = {
  strength: 'Kraft',
  power: 'Power',
  skill: 'Skill',
  mobility_active: 'Aktive Mobility',
  mobility_loaded: 'Belastete Mobility',
  stretch_static: 'Statisches Stretching',
  cardio: 'Cardio',
  finisher: 'Finisher',
};

// Aufwärmarten -> Ramp-Regeln aus "Klare Warm-up-Satz-Regel"
export const WARMUP_KINDS = {
  power: {
    label: 'Power-Aufwärmsätze',
    desc: '2-4 progressive Probe-/Sprungsätze mit wenigen Wiederholungen. Intensität steigern, keine Ermüdung erzeugen.',
    ramp: null,
  },
  heavy: {
    label: 'Ramp-Sätze (schwere Mehrgelenksübung)',
    desc: '3 Ramp-Sätze vor den Arbeitssätzen.',
    ramp: [
      { pct: 0.45, pctLabel: '40-50%', reps: '5-6' },
      { pct: 0.65, pctLabel: '60-70%', reps: '3-4' },
      { pct: 0.85, pctLabel: '80-90%', reps: '1-2' },
    ],
  },
  moderate: {
    label: 'Ramp-Sätze (moderate Mehrgelenksübung)',
    desc: '1-2 Ramp-Sätze vor den Arbeitssätzen.',
    ramp: [
      { pct: 0.55, pctLabel: '50-60%', reps: '5-8' },
      { pct: 0.77, pctLabel: '75-80%', reps: '2-4', optional: true },
    ],
  },
  light: {
    label: 'Leichter Vorbereitungssatz',
    desc: '0-1 leichter Satz, wenn Gelenk/Bewegung bereits warm ist.',
    ramp: null,
  },
};

function ex(o) {
  return {
    perSide: false,
    warmup: null,
    video: null,
    note: null,
    ...o,
  };
}

export const PLAN = [
  {
    id: 'mo',
    order: 0,
    name: 'Full Body A',
    subtitle: 'Strength + Power',
    isFullBody: true,
    mobilitySkillFocus: 'Ankle/Hip + Shoulder Endrange',
    warmupGeneral: '5-8 min dynamisch: ankle rocks, 90/90 switches, scapular circles. Danach Power-Warm-up. Explosives immer frisch.',
    blocks: [
      {
        title: null,
        exercises: [
          ex({
            id: 'mo-jump', name: 'Broad oder Vertical Jump', dosage: '4 x 3', sets: 4, reps: { min: 3, max: 3 },
            restSec: { min: 120, max: 240 }, type: TYPES.POWER, warmup: 'power',
            video: { label: 'HSS: Pogo/Plyometrie-Referenz', url: 'https://www.youtube.com/watch?v=8VddB27UkY4', match: 'ähnlich',
              note: 'Nutze das Video für elastische Landung und Fuss-/Sprunggelenkskontrolle. Für Broad/Vertical Jump aber deutlich mehr Knie-/Hüftbeugung, maximalen Absprung und volle Erholung zwischen Einzelreps/Sätzen. Keine schnellen Dauerhüpfer.',
              cues: 'Maximal hoch/weit; leise, stabile Landung; Knie folgen Fussrichtung.' },
          }),
          ex({
            id: 'mo-pullup', name: 'Weighted Pull-up, voller kontrollierter ROM', dosage: '4 x 4-7', sets: 4, reps: { min: 4, max: 7 },
            restSec: { min: 180, max: 240 }, type: TYPES.STRENGTH, warmup: 'heavy', targetRIR: '1-2',
            video: { label: 'FitnessFAQs: Pull-up Technique', url: 'https://fitnessfaqs.com/articles/ff-video-tag/pull-up-technique/', match: 'passend',
              note: 'Zusatzgewicht an Dip-Belt/Gürtel ändert die Grundtechnik nicht. Beginne jede Wiederholung aus derselben kontrollierten unteren Position; kein Kipping. Gewicht nur erhöhen, wenn die ROM erhalten bleibt.',
              cues: 'Rippen kontrolliert; Beine ruhig; Zug ohne Schwung; reproduzierbare obere Endposition.' },
          }),
          ex({
            id: 'mo-dip', name: 'Weighted Ring Dip, kontrolliert tief', dosage: '4 x 5-8', sets: 4, reps: { min: 5, max: 8 },
            restSec: { min: 180, max: 240 }, type: TYPES.STRENGTH, warmup: 'heavy', targetRIR: '1-2',
            video: { label: 'FitnessFAQs: Dip Technique', url: 'https://fitnessfaqs.com/articles/ff-video-tag/dip-technique/', match: 'passend',
              note: 'Für deinen Plan die Tiefe nur so weit steigern, wie Schulter und Ringe aktiv kontrolliert bleiben. Zusatzgewicht darf nicht zu kürzerer ROM führen.',
              cues: 'Ringe stabil; kontrolliert absenken; kein Fallen in die Schulter; kraftvoll hoch.' },
          }),
          ex({
            id: 'mo-splitsquat', name: 'Deep Bulgarian Split Squat KH', dosage: '3 x 6-10 / Bein', sets: 3, reps: { min: 6, max: 10 }, perSide: true,
            restSec: { min: 120, max: 180 }, type: TYPES.STRENGTH, warmup: 'moderate', targetRIR: '1-2',
            video: { label: 'E3 Rehab: Split Squat Guide', url: 'https://e3rehab.com/how-to-perform-split-squats/', match: 'ähnlich',
              note: 'E3 zeigt die Split-Squat-Grundmechanik. Für deinen Plan hinteren Fuss erhöhen und bewusst tiefere, kontrollierte ROM nutzen. Bei Bedarf an Stütze festhalten, damit Balance nicht die ROM begrenzt.',
              cues: 'Vorderer Fuss voll belastet; kontrolliert tief; kein Aufprall unten; Becken stabil.' },
          }),
          ex({
            id: 'mo-rdl', name: 'RDL KH/geführt, kontrollierte Tiefe', dosage: '3 x 6-10', sets: 3, reps: { min: 6, max: 10 },
            restSec: { min: 120, max: 180 }, type: TYPES.STRENGTH, warmup: 'light', targetRIR: '1-2',
            video: { label: 'E3 Rehab: Perfect RDL', url: 'https://www.youtube.com/watch?v=uhghy9pFIPY', match: 'passend',
              note: 'Die Tiefe wird durch deinen kontrollierten Hip-Hinge bestimmt - nicht dadurch, wie tief das Gewicht kommt. Bei geführter Variante dieselbe Hüftmechanik beibehalten.',
              cues: 'Hüfte nach hinten; leichte Kniebeugung; Gewicht körpernah; Spannung in Hamstrings.' },
          }),
          ex({
            id: 'mo-calf', name: 'Full-ROM Calf Raise + Pause unten', dosage: '3 x 8-15', sets: 3, reps: { min: 8, max: 15 },
            restSec: { min: 90, max: 120 }, type: TYPES.STRENGTH, warmup: 'light', targetRIR: '1-2',
            video: { label: 'Video-Suche: full ROM calf raise', url: 'https://www.youtube.com/results?search_query=full+range+of+motion+calf+raise+technique', match: 'ähnlich',
              note: 'Viele Demos sind zu kurz. Für deinen Plan unten bewusst in tolerierbare Dorsalflexion, dort kurz kontrollieren, dann voll hoch. Kein Federn aus der Achillessehne.',
              cues: 'Lang unten; Pause; volle Plantarflexion; Fuss nicht nach innen/aussen kippen.' },
          }),
          ex({
            id: 'mo-extrot', name: 'Cable External Rotation', dosage: '2 x 12-20', sets: 2, reps: { min: 12, max: 20 },
            restSec: { min: 60, max: 90 }, type: TYPES.STRENGTH, warmup: 'light', targetRIR: '1-2',
            video: { label: 'E3 Rehab: Rotator Cuff Exercises', url: 'https://e3rehab.com/rotator-cuff-exercises/', match: 'passend',
              note: 'Wähle dort die stehende Cable/Band External Rotation. Für die Planvariante Oberarm am Körper stabil halten, sofern du nicht bewusst die 90/90-Progression nutzt.',
              cues: 'Ellbogen ca. 90 Grad; Oberarm ruhig; nur Schulter rotiert; Rückweg kontrolliert.' },
          }),
        ],
      },
    ],
  },
  {
    id: 'di',
    order: 1,
    name: 'Aerobic + Front Split',
    subtitle: null,
    mobilitySkillFocus: 'Front Split + Hamstrings',
    warmupGeneral: 'Polar: 35-50 min überwiegend Polar Zone 2 (60-70% HFmax). Ganze Sätze sprechen können; bei dauerhaft höherer HF Tempo reduzieren.',
    blocks: [
      {
        title: null,
        exercises: [
          ex({
            id: 'di-cardio', name: 'Aerobic mit Polar-Gurt', dosage: '35-50 min, Zone 2', type: TYPES.CARDIO,
            durationSec: { min: 35 * 60, max: 50 * 60 }, hrZonePct: '60-70% HFmax (Polar Zone 2)',
            note: 'Nicht dem Tempo hinterherlaufen; Herzfrequenz und lockeres Gefühl steuern.',
            video: { label: 'Polar Heart Rate Zones', url: 'https://www.polar.com/us-en/guide/heart-rate-zones', match: 'passend',
              note: 'Kein Technikvideo nötig - Referenz zu den Herzfrequenzzonen.', cues: null },
          }),
          ex({
            id: 'di-atg', name: 'ATG/Long Split Squat, leicht', dosage: '2 x 8 / Seite', sets: 2, reps: { min: 8, max: 8 }, perSide: true,
            restSec: { min: 60, max: 90 }, type: TYPES.MOBILITY_LOADED,
            video: { label: 'Video-Suche: ATG split squat', url: 'https://www.youtube.com/results?search_query=ATG+split+squat+technique+knees+over+toes', match: 'ähnlich',
              note: 'Nutze die ATG-Split-Squat-Mechanik, aber hier leicht und als aktive Mobility: keine schwere Grind-Wiederholung. Hintere Hüfte lang, vorderes Bein kontrolliert durch grosse ROM.',
              cues: 'Leicht; langsam tief; hinteres Bein/Hüftbeuger lang; keine Schmerz-ROM.' },
          }),
          ex({
            id: 'di-rdl-light', name: 'Straight-leg RDL / Hamstring hinge, leicht', dosage: '2 x 8-10', sets: 2, reps: { min: 8, max: 10 },
            restSec: { min: 60, max: 90 }, type: TYPES.MOBILITY_LOADED,
            video: { label: 'E3 Rehab: RDL', url: 'https://www.youtube.com/watch?v=uhghy9pFIPY', match: 'ähnlich',
              note: 'Gleicher Hip-Hinge wie im RDL-Video, aber Knie deutlich gerader und Last leichter. Ziel ist kontrollierte Hamstring-Länge, nicht maximale Last.',
              cues: 'Rücken kontrolliert; Hüfte zurück; nur so tief wie Becken/Wirbelsäule sauber bleiben.' },
          }),
          ex({
            id: 'di-aslr', name: 'Active Straight-Leg Raise', dosage: '2 x 8-12 / Seite', sets: 2, reps: { min: 8, max: 12 }, perSide: true,
            restSec: { min: 45, max: 60 }, type: TYPES.MOBILITY_ACTIVE,
            video: { label: 'Video-Suche: active straight leg raise', url: 'https://www.youtube.com/results?search_query=active+straight+leg+raise+mobility+exercise', match: 'ähnlich',
              note: 'Nimm eine aktive Demo ohne Zugband-/Handhilfe. Bein aus eigener Kraft anheben; Becken nicht stark ausweichen lassen.',
              cues: 'Knie gestreckt; Gegenbein ruhig; aktiv hoch, kontrolliert runter.' },
          }),
          ex({
            id: 'di-hipflexor', name: 'Half-kneeling Hip Flexor Hold', dosage: '2 x 30-45 s / Seite', sets: 2, holdSec: { min: 30, max: 45 }, perSide: true,
            restSec: { min: 30, max: 60 }, type: TYPES.STRETCH_STATIC,
            video: { label: 'Video-Suche: half kneeling hip flexor stretch', url: 'https://www.youtube.com/results?search_query=half+kneeling+hip+flexor+stretch+posterior+pelvic+tilt+glute', match: 'ähnlich',
              note: 'Falls das Video stark nach vorne schiebt: für deinen Plan weniger Weg, dafür Gesäss des hinteren Beins anspannen und Becken kontrollieren. Kein Hohlkreuz als Ersatz-ROM.',
              cues: 'Gesäss an; Rippen unten; Becken leicht posterior; Stretch vorne an der Hüfte.' },
          }),
          ex({
            id: 'di-frontsplit', name: 'Front Split mit Blocks/Stütze', dosage: '2 x 30-60 s / Seite', sets: 2, holdSec: { min: 30, max: 60 }, perSide: true,
            restSec: { min: 30, max: 60 }, type: TYPES.STRETCH_STATIC,
            video: { label: 'Dani Winks: Active Front Split Slides', url: 'https://www.youtube.com/watch?v=pNrx5WILVtw', match: 'passend',
              note: 'Das Video ist besonders gut für aktive Split-Kontrolle. Für den statischen Plan-Hold darfst du Blocks/Stütze nutzen und 30-60s kontrolliert halten.',
              cues: 'Hüften möglichst quadratisch; nicht federn; Tiefe nur kontrolliert steigern.' },
          }),
        ],
      },
    ],
  },
  {
    id: 'mi',
    order: 2,
    name: 'Active Mobility',
    subtitle: null,
    mobilitySkillFocus: 'Rotation + Spine + Recovery',
    warmupGeneral: null,
    blocks: [
      {
        title: null,
        exercises: [
          ex({
            id: 'mi-shouldercars', name: 'Controlled Articular Rotations: Schulter', dosage: '2 x 3 langsam / Seite', sets: 2, reps: { min: 3, max: 3 }, perSide: true,
            restSec: { min: 30, max: 60 }, type: TYPES.MOBILITY_ACTIVE,
            video: { label: 'Shoulder CARs Demo', url: 'https://www.youtube.com/watch?v=898QrvpmRWc', match: 'passend',
              note: 'Sehr langsam und aktiv ausführen. Bewegungsradius so gross wie möglich, ohne den Rumpf stark mitzudrehen.',
              cues: 'Ganzkörperspannung; Schulterkreis aktiv; keine Schwungbewegung.' },
          }),
          ex({
            id: 'mi-9090', name: '90/90 Hip Switch + Lift-off', dosage: '2 x 6 + 5 / Seite', sets: 2, reps: { min: 6, max: 6 }, perSide: true,
            restSec: { min: 45, max: 60 }, type: TYPES.MOBILITY_ACTIVE,
            video: { label: '90/90 Lift-off Demo', url: 'https://www.youtube.com/watch?v=MoFes2W7qKE', match: 'passend',
              note: 'Die Referenz deckt den Lift-off ab. Ergänze zwischen den Seiten kontrollierte 90/90-Switches ohne Schwung.',
              cues: 'Becken kontrollieren; Lift-off aktiv aus Hüftrotation; ROM nicht erzwingen.' },
          }),
          ex({
            id: 'mi-cossack', name: 'Cossack Squat Flow', dosage: '2 x 6 / Seite', sets: 2, reps: { min: 6, max: 6 }, perSide: true,
            restSec: { min: 45, max: 60 }, type: TYPES.MOBILITY_ACTIVE,
            video: { label: 'Video-Suche: Cossack squat mobility', url: 'https://www.youtube.com/results?search_query=Cossack+squat+mobility+controlled+full+range', match: 'ähnlich',
              note: 'Nimm eine kontrollierte Cossack-Demo, aber für Mittwoch als Flow: leicht, flüssig und ohne Nähe zum Versagen. Tiefe nach Beweglichkeit.',
              cues: 'Belasteter Fuss voll am Boden; Knie folgt Zehen; langes Bein kontrolliert.' },
          }),
          ex({
            id: 'mi-squatpry', name: 'Deep Squat Pry', dosage: '2 x 30-45 s', sets: 2, holdSec: { min: 30, max: 45 },
            restSec: { min: 30, max: 60 }, type: TYPES.MOBILITY_ACTIVE,
            video: { label: 'Video-Suche: deep squat pry', url: 'https://www.youtube.com/results?search_query=deep+squat+pry+mobility', match: 'ähnlich',
              note: 'Nicht aggressiv mit den Ellbogen die Knie auseinanderpressen. Ziel ist entspannt-kontrollierte tiefe Squatposition und kleine Gewichtsverlagerungen.',
              cues: 'Füsse stabil; Atmung ruhig; keine scharfen Gelenkgefühle.' },
          }),
          ex({
            id: 'mi-thoracic', name: 'Thoracic Rotation im Vierfüssler', dosage: '2 x 6 / Seite', sets: 2, reps: { min: 6, max: 6 }, perSide: true,
            restSec: { min: 30, max: 45 }, type: TYPES.MOBILITY_ACTIVE,
            video: { label: 'Video-Suche: quadruped thoracic rotation', url: 'https://www.youtube.com/results?search_query=quadruped+thoracic+rotation+exercise', match: 'ähnlich',
              note: 'Wähle eine Vierfüssler-Demo. Für deinen Plan Becken möglichst ruhig lassen, damit die Bewegung vor allem aus der BWS kommt.',
              cues: 'Becken ruhig; Rotation statt Seitneigung; langsam.' },
          }),
          ex({
            id: 'mi-catcow', name: 'Segmental Cat-Cow', dosage: '2 x 6', sets: 2, reps: { min: 6, max: 6 },
            restSec: { min: 30, max: 45 }, type: TYPES.MOBILITY_ACTIVE,
            video: { label: 'Video-Suche: segmental cat cow', url: 'https://www.youtube.com/results?search_query=segmental+cat+cow+spinal+segmentation', match: 'ähnlich',
              note: 'Normales Cat-Cow ist nur ähnlich. Für deinen Plan Wirbel für Wirbel bewegen - nicht die ganze Wirbelsäule gleichzeitig rund/hohl machen.',
              cues: 'Langsam segmentieren; keine Endrange erzwingen; Atmung mit Bewegung.' },
          }),
          ex({
            id: 'mi-wrist', name: 'Wrist Rocks', dosage: '2 x 10 je Richtung', sets: 2, reps: { min: 10, max: 10 },
            restSec: { min: 30, max: 45 }, type: TYPES.MOBILITY_ACTIVE,
            video: { label: 'Video-Suche: wrist rocks handstand', url: 'https://www.youtube.com/results?search_query=wrist+rocks+handstand+warm+up+extension+side+to+side', match: 'ähnlich',
              note: 'Nutze Extension- und Side-to-side-Varianten. Belastung progressiv über die Hände verschieben, Finger/Handfläche bleiben kontrolliert.',
              cues: 'Keine scharfen Schmerzen; Druck langsam steigern; Ellbogen kontrolliert.' },
          }),
          ex({
            id: 'mi-hang', name: 'Passive Hang -> Active Hang', dosage: '2 x 20-30 s + 5 reps', sets: 2, holdSec: { min: 20, max: 30 }, reps: { min: 5, max: 5 },
            restSec: { min: 60, max: 60 }, type: TYPES.MOBILITY_ACTIVE,
            video: { label: 'FitnessFAQs: Scap Pull / Pull-up Library', url: 'https://fitnessfaqs.com/articles/ff-video-tag/pull-up-technique/', match: 'ähnlich',
              note: 'Beginne wirklich passiv, dann ohne Ellbogenbeugung nur die Schulterblätter aktiv nach unten/oben bewegen. Nicht zu einem halben Pull-up machen.',
              cues: 'Arme lang; Scapula bewegt; Rumpf ruhig.' },
          }),
        ],
      },
    ],
  },
  {
    id: 'do',
    order: 3,
    name: 'Full Body B',
    subtitle: 'Strength + Skills',
    isFullBody: true,
    mobilitySkillFocus: 'Pancake + Shoulder/Wrist',
    warmupGeneral: 'Handstand zuerst. Bei Skills Qualität beenden, bevor Balance/Position deutlich zerfällt.',
    blocks: [
      {
        title: null,
        exercises: [
          ex({
            id: 'do-handstand', name: 'Handstand', dosage: '10-15 min', type: TYPES.SKILL, durationSec: { min: 600, max: 900 },
            restSec: { min: 60, max: 120 },
            note: 'Skill-Qualität vor Ermüdung: passende Wand-/Freestanding-Progression wählen und stoppen, bevor Linie/Balance deutlich zerfällt.',
            video: { label: 'FitnessFAQs: Handstand Tutorials', url: 'https://fitnessfaqs.com/articles/ff-video-tag/handstand-tutorial/', match: 'passend',
              note: 'Für deinen Plan Skill-Qualität vor Ermüdung: passende Wand-/Freestanding-Progression wählen und stoppen, bevor Linie/Balance deutlich zerfällt.',
              cues: 'Boden aktiv wegdrücken; Rippen/Becken kontrollieren; Finger für Balance nutzen.' },
          }),
          ex({
            id: 'do-pistol', name: 'Pistol Squat / high Step-up', dosage: '3 x 5-8 / Bein', sets: 3, reps: { min: 5, max: 8 }, perSide: true,
            restSec: { min: 120, max: 180 }, type: TYPES.STRENGTH, warmup: 'moderate', targetRIR: '1-2',
            video: { label: 'Video-Suche: pistol squat progression', url: 'https://www.youtube.com/results?search_query=pistol+squat+progression+controlled+full+range', match: 'ähnlich',
              note: 'Wenn eine saubere Pistol noch nicht geht, exakt wie im Plan auf High Step-up wechseln. Keine erzwungene Pistol mit starkem Kollaps oder Schwung.',
              cues: 'Ganzer Fuss; Knie kontrolliert; Tiefe nur mit Balance und Spannung.' },
          }),
          ex({
            id: 'do-bench', name: 'KH-/geführtes Bankdrücken', dosage: '3 x 6-10', sets: 3, reps: { min: 6, max: 10 },
            restSec: { min: 150, max: 210 }, type: TYPES.STRENGTH, warmup: 'moderate', targetRIR: '1-2',
            video: { label: 'Video-Suche: machine bench press technique', url: 'https://www.youtube.com/results?search_query=machine+chest+press+bench+press+full+range+technique', match: 'ähnlich',
              note: 'Bei geführter Maschine Sitz/Bank so einstellen, dass die Druckbahn zur Schulter passt. Für deinen Plan kontrollierte, schmerzfreie grosse ROM; nicht extra kurz für mehr Gewicht.',
              cues: 'Schulterblätter stabil; Handgelenke über Unterarmen; kontrolliert absenken.' },
          }),
          ex({
            id: 'do-ringrow', name: 'Ring Row mit maximal sauberem ROM', dosage: '3 x 6-12', sets: 3, reps: { min: 6, max: 12 },
            restSec: { min: 120, max: 180 }, type: TYPES.STRENGTH, warmup: 'moderate', targetRIR: '1-2',
            video: { label: 'FitnessFAQs: Inverted Row', url: 'https://fitnessfaqs.com/articles/ff-video-tag/inverted-row/', match: 'passend',
              note: 'Ringe erlauben freie Handrotation. Körper als Einheit bewegen und die obere Position nur so weit ziehen, wie Schulter/Rumpf stabil bleiben.',
              cues: 'Kein Hüftknick; Brust zu den Ringen; Scapula kontrolliert.' },
          }),
          ex({
            id: 'do-hipthrust', name: 'Hip Thrust', dosage: '3 x 8-12', sets: 3, reps: { min: 8, max: 12 },
            restSec: { min: 120, max: 180 }, type: TYPES.STRENGTH, warmup: 'moderate', targetRIR: '1-2',
            video: { label: 'Video-Suche: hip thrust technique', url: 'https://www.youtube.com/results?search_query=hip+thrust+technique+glute+full+lockout', match: 'ähnlich',
              note: 'Nutze Standard-Hip-Thrust-Technik. Für deinen Plan oben volle Hüftextension ohne Überstreckung der LWS; Kinn/Rippen kontrolliert.',
              cues: 'Becken hoch durch Gesäss; Schienbein oben etwa senkrecht; kein Hohlkreuz-Lockout.' },
          }),
          ex({
            id: 'do-revnordic', name: 'Reverse Nordic', dosage: '2-3 x 6-10', sets: 3, reps: { min: 6, max: 10 },
            restSec: { min: 90, max: 150 }, type: TYPES.STRENGTH, warmup: 'light', targetRIR: '1-2',
            video: { label: 'E3 Rehab: Reverse Nordic', url: 'https://e3rehab.com/reversenordic/', match: 'passend',
              note: 'Sehr gute Planreferenz: Knie-Hüfte-Schulter als Linie; ROM regressieren, wenn die Linie verloren geht.',
              cues: 'Gesäss/Bauch an; kontrolliert zurück; ROM progressiv.' },
          }),
          ex({
            id: 'do-lsit', name: 'L-Sit / Tuck L-Sit', dosage: '3-4 Sätze', sets: 4, holdSec: { min: 10, max: 30 }, type: TYPES.SKILL,
            restSec: { min: 60, max: 120 },
            video: { label: 'FitnessFAQs: L-Sit', url: 'https://fitnessfaqs.com/articles/ff-video-tag/l-sit/', match: 'passend',
              note: 'Tuck ist ausdrücklich erlaubt. Erst Schulterdepression und aktive Compression sauber halten, dann Beine weiter strecken.',
              cues: 'Boden/Barren wegdrücken; Hüfte aktiv beugen; kein passives Hängen.' },
          }),
          ex({
            id: 'do-scappullup', name: 'Scapular Pull-up', dosage: '2 x 8-12', sets: 2, reps: { min: 8, max: 12 },
            restSec: { min: 60, max: 90 }, type: TYPES.STRENGTH, warmup: 'light', targetRIR: '1-2',
            video: { label: 'FitnessFAQs: Pull-up/Scap Pull Library', url: 'https://fitnessfaqs.com/articles/ff-video-tag/pull-up-technique/', match: 'passend',
              note: 'Arme bleiben gestreckt. Nur Schulterblattbewegung - keine Ellbogenbeugung.',
              cues: 'Aus Hang aktiv depressieren; kurze Kontrolle; langsam zurück.' },
          }),
        ],
      },
      {
        title: 'Pancake / Shoulder Block',
        exercises: [
          ex({
            id: 'do-straddlegm', name: 'Straddle Good Morning, leicht', dosage: '2 x 8-12', sets: 2, reps: { min: 8, max: 12 },
            restSec: { min: 60, max: 90 }, type: TYPES.MOBILITY_LOADED,
            video: { label: 'Video-Suche: straddle good morning pancake', url: 'https://www.youtube.com/results?search_query=straddle+good+morning+pancake+mobility', match: 'ähnlich',
              note: 'Viele Videos machen daraus einen schweren Kraftlift. Für deinen Plan leicht, breite Straddle-Position, aus der Hüfte nach vorne kippen und lange Wirbelsäule halten.',
              cues: 'Hip hinge; leicht; Adduktoren/Hamstrings unter kontrollierter Last.' },
          }),
          ex({
            id: 'do-pikelift', name: 'Seated Pike/Straddle Compression Lift', dosage: '2 x 8-12', sets: 2, reps: { min: 8, max: 12 },
            restSec: { min: 60, max: 90 }, type: TYPES.MOBILITY_ACTIVE,
            video: { label: 'Video-Suche: straddle compression lift', url: 'https://www.youtube.com/results?search_query=seated+straddle+compression+lift+active+flexibility', match: 'ähnlich',
              note: 'Wichtig: nicht mit den Händen die Beine hochheben. Hände am Boden als Stütze, Beine aktiv aus Hüftflexion anheben.',
              cues: 'Knie lang; Oberschenkel aktiv; kleine saubere Lift-offs reichen.' },
          }),
          ex({
            id: 'do-pancake', name: 'Pancake Hold', dosage: '2 x 30-60 s', sets: 2, holdSec: { min: 30, max: 60 },
            restSec: { min: 30, max: 60 }, type: TYPES.STRETCH_STATIC,
            video: { label: 'Dani Winks: Pancake Stretch', url: 'https://www.youtube.com/results?search_query=Dani+Winks+pancake+stretch', match: 'ähnlich',
              note: 'Für deinen Plan statischer 30-60s-Hold. Nicht federn; Tiefe über Hüftbeugung statt aggressives Rundziehen erzwingen.',
              cues: 'Straddle stabil; ruhig atmen; kontrollierte Endposition.' },
          }),
          ex({
            id: 'do-wallshoulder', name: 'Wall Shoulder Flexion Lift-off', dosage: '2 x 6-10', sets: 2, reps: { min: 6, max: 10 },
            restSec: { min: 45, max: 60 }, type: TYPES.MOBILITY_ACTIVE,
            video: { label: 'Video-Suche: shoulder flexion lift off wall', url: 'https://www.youtube.com/results?search_query=wall+shoulder+flexion+lift+off+active+mobility', match: 'ähnlich',
              note: 'Wähle eine aktive Lift-off-Demo. Nicht nur passiv an der Wand stretchen: Arm aktiv von der Wand wegheben, ohne stark ins Hohlkreuz zu gehen.',
              cues: 'Rippen unten; Ellbogen lang; aktive Schulterflexion.' },
          }),
          ex({
            id: 'do-latstretch', name: 'Lat/Overhead Stretch an Ringen', dosage: '2 x 30-45 s', sets: 2, holdSec: { min: 30, max: 45 },
            restSec: { min: 30, max: 60 }, type: TYPES.STRETCH_STATIC,
            video: { label: 'Video-Suche: ring lat overhead stretch', url: 'https://www.youtube.com/results?search_query=gymnastic+rings+lat+overhead+stretch', match: 'ähnlich',
              note: 'Körper nach hinten/unten verlagern, bis Lat/Schulter angenehm gedehnt werden. Für deinen Plan passiver Zusatz-ROM, nicht aggressiv in die Schulter ziehen.',
              cues: 'Ruhige Atmung; Schulter tolerierbar; kein Schmerz vorne im Gelenk.' },
          }),
        ],
      },
    ],
  },
  {
    id: 'fr',
    order: 4,
    name: 'Middle Split + Adductors',
    subtitle: null,
    mobilitySkillFocus: 'Middle Split + Adductors',
    warmupGeneral: null,
    blocks: [
      {
        title: null,
        exercises: [
          ex({
            id: 'fr-cossack', name: 'Cossack Squat', dosage: '3 x 6-10 / Seite', sets: 3, reps: { min: 6, max: 10 }, perSide: true,
            restSec: { min: 90, max: 120 }, type: TYPES.MOBILITY_LOADED,
            video: { label: 'Video-Suche: Cossack squat technique', url: 'https://www.youtube.com/results?search_query=Cossack+squat+proper+technique+full+range', match: 'ähnlich',
              note: 'Am Freitag darf die Variante kräftiger sein als Mittwoch. Trotzdem kontrollierte ROM; keine Tiefe erzwingen, wenn Fuss/Knie/Becken ausweichen.',
              cues: 'Belasteter Fuss stabil; Knie folgt Zehen; aktiv aus der Tiefe.' },
          }),
          ex({
            id: 'fr-laterallunge', name: 'Lateral Lunge, langsam/tief', dosage: '2 x 8 / Seite', sets: 2, reps: { min: 8, max: 8 }, perSide: true,
            restSec: { min: 90, max: 120 }, type: TYPES.MOBILITY_LOADED,
            video: { label: 'Video-Suche: lateral lunge technique', url: 'https://www.youtube.com/results?search_query=lateral+lunge+slow+deep+technique', match: 'ähnlich',
              note: 'Nutze eine Standard-Lateral-Lunge-Demo, aber für deinen Plan langsamer und tiefer innerhalb sauberer ROM. Das lange Bein bleibt kontrolliert.',
              cues: 'Hüfte zur belasteten Seite; Fuss voll; kein Abprallen.' },
          }),
          ex({
            id: 'fr-horsestance', name: 'Horse Stance', dosage: '2 x 30-60 s', sets: 2, holdSec: { min: 30, max: 60 },
            restSec: { min: 60, max: 90 }, type: TYPES.MOBILITY_LOADED,
            video: { label: 'Video-Suche: horse stance exercise form', url: 'https://www.youtube.com/results?search_query=horse+stance+exercise+proper+form', match: 'ähnlich',
              note: 'Viele Martial-Arts-Demos variieren stark. Für deinen Plan als isometrische Bein-/Adduktorenarbeit: stabile breite Position, Knie in Fussrichtung, 30-60s.',
              cues: 'Rumpf aufrecht; Knie nicht nach innen; gleichmässig belasten.' },
          }),
          ex({
            id: 'fr-adductor', name: 'Adductor Lift-off', dosage: '2 x 8-12 / Seite', sets: 2, reps: { min: 8, max: 12 }, perSide: true,
            restSec: { min: 45, max: 60 }, type: TYPES.MOBILITY_ACTIVE,
            video: { label: 'Video-Suche: adductor lift off mobility', url: 'https://www.youtube.com/results?search_query=adductor+lift+off+active+mobility', match: 'ähnlich',
              note: 'Entscheidend ist der aktive Lift-off aus Endrange. Kein passiver Stretch und kein Schwung.',
              cues: 'Becken ruhig; Bein aktiv anheben; kleine ROM ist okay.' },
          }),
          ex({
            id: 'fr-frog', name: 'Frog Stretch', dosage: '2 x 30-60 s', sets: 2, holdSec: { min: 30, max: 60 },
            restSec: { min: 30, max: 60 }, type: TYPES.STRETCH_STATIC,
            video: { label: 'Video-Suche: frog stretch adductors', url: 'https://www.youtube.com/results?search_query=frog+stretch+adductors+proper+form', match: 'ähnlich',
              note: 'Nur bis deutliches, tolerierbares Dehngefühl. Nicht mit Gewalt nach hinten schieben; Knieposition bequem polstern.',
              cues: 'Becken kontrolliert; ruhig atmen; kein scharfer Leistenschmerz.' },
          }),
          ex({
            id: 'fr-middlesplit', name: 'Middle Split mit Stütze', dosage: '2 x 30-60 s', sets: 2, holdSec: { min: 30, max: 60 },
            restSec: { min: 30, max: 60 }, type: TYPES.STRETCH_STATIC,
            video: { label: 'Dani Winks: Middle Split', url: 'https://www.youtube.com/results?search_query=Dani+Winks+middle+split+flexibility', match: 'ähnlich',
              note: 'Nutze Blocks/Stütze und halte 30-60s. Kein Bouncing. Tiefe nur steigern, wenn du die Position aktiv kontrollieren und schmerzfrei verlassen kannst.',
              cues: 'Füsse/Knie passend ausrichten; Stütze nutzen; kontrolliert rein und raus.' },
          }),
        ],
      },
    ],
  },
  {
    id: 'sa',
    order: 5,
    name: 'Full Body C',
    subtitle: 'Athletic Power + Integration',
    isFullBody: true,
    mobilitySkillFocus: 'Full-body ROM + short circuit',
    warmupGeneral: null,
    blocks: [
      {
        title: null,
        exercises: [
          ex({
            id: 'sa-pogo', name: 'Pogo Jumps', dosage: '3 x 10-20', sets: 3, reps: { min: 10, max: 20 },
            restSec: { min: 90, max: 150 }, type: TYPES.POWER,
            video: { label: 'HSS: Pogo Jumps', url: 'https://www.youtube.com/watch?v=8VddB27UkY4', match: 'passend',
              note: 'Sehr nah an der Planidee: elastische Fuss-/Sprunggelenksarbeit. Nicht in tiefe Kniebeugen absinken.',
              cues: 'Kurzer Bodenkontakt; aufrecht; federnd aus dem Sprunggelenk.' },
          }),
          ex({
            id: 'sa-jumpvar', name: 'Jump Variation', dosage: '3 x 3', sets: 3, reps: { min: 3, max: 3 },
            restSec: { min: 120, max: 240 }, type: TYPES.POWER, warmup: 'power',
            video: { label: 'Video-Suche: vertical jump technique', url: 'https://www.youtube.com/results?search_query=vertical+jump+technique+countermovement+landing', match: 'ähnlich',
              note: 'Wähle je Block eine konkrete Jump-Variation und standardisiere sie. Für 3x3 maximale Qualität statt Kondition.',
              cues: 'Maximale Absicht; volle Erholung; stabile Landung.' },
          }),
          ex({
            id: 'sa-explosivepullup', name: 'Explosive Pull-up', dosage: '4 x 3-5', sets: 4, reps: { min: 3, max: 5 },
            restSec: { min: 150, max: 240 }, type: TYPES.POWER, warmup: 'power',
            video: { label: 'FitnessFAQs: Pull-up Technique', url: 'https://fitnessfaqs.com/articles/ff-video-tag/pull-up-technique/', match: 'ähnlich',
              note: 'Gleiche saubere Grundposition wie beim Pull-up, aber konzentrisch maximal beschleunigen. Kein Kipping. Satz stoppen, sobald Höhe/Geschwindigkeit klar fällt.',
              cues: 'Schnell hoch; kontrolliert runter; kein Beinschwung.' },
          }),
          ex({
            id: 'sa-revlunge', name: 'Reverse Lunge / Split Squat', dosage: '3 x 8-12 / Bein', sets: 3, reps: { min: 8, max: 12 }, perSide: true,
            restSec: { min: 120, max: 180 }, type: TYPES.STRENGTH, warmup: 'moderate', targetRIR: '1-2',
            video: { label: 'E3 Rehab: Split Squat Guide', url: 'https://e3rehab.com/how-to-perform-split-squats/', match: 'passend',
              note: 'Bei Reverse Lunge Rückschritt ergänzen; bei Split Squat stationär bleiben. Beide Varianten kontrolliert und mit stabiler Vorderbeinmechanik.',
              cues: 'Vorderer Fuss voll; Becken stabil; aus Vorderbein hoch.' },
          }),
          ex({
            id: 'sa-ringpushup', name: 'Deep Ring Push-up', dosage: '3 x 8-15', sets: 3, reps: { min: 8, max: 15 },
            restSec: { min: 120, max: 180 }, type: TYPES.STRENGTH, warmup: 'moderate', targetRIR: '1-2',
            video: { label: 'FitnessFAQs: Ring Push-up Variations', url: 'https://fitnessfaqs.com/articles/ff-video-tag/ring-push-up-variations/', match: 'ähnlich',
              note: 'Die Ring-Push-up-Technik übernehmen, aber für deinen Plan bewusst die zusätzliche Tiefe der Ringe nutzen - nur solange Schulter und Rumpf stabil bleiben.',
              cues: 'Körper als Brett; Ringe kontrolliert; tiefe schmerzfreie ROM.' },
          }),
          ex({
            id: 'sa-cablerow', name: 'Cable Row', dosage: '3 x 8-12', sets: 3, reps: { min: 8, max: 12 },
            restSec: { min: 120, max: 180 }, type: TYPES.STRENGTH, warmup: 'moderate', targetRIR: '1-2',
            video: { label: 'Video-Suche: cable row technique', url: 'https://www.youtube.com/results?search_query=seated+cable+row+proper+technique+full+range', match: 'ähnlich',
              note: 'Kein starkes Vor-/Zurückschwingen des Rumpfs. Schulterblätter dürfen sich kontrolliert bewegen; Zug-ROM reproduzierbar.',
              cues: 'Rumpf ruhig; Ellbogen ziehen; kontrollierte Pro-/Retraktion.' },
          }),
          ex({
            id: 'sa-leraise', name: 'Hanging Leg Raise', dosage: '3 x 8-15', sets: 3, reps: { min: 8, max: 15 },
            restSec: { min: 90, max: 120 }, type: TYPES.STRENGTH, warmup: 'light', targetRIR: '1-2',
            video: { label: 'Video-Suche: hanging leg raise pelvic tilt', url: 'https://www.youtube.com/results?search_query=hanging+leg+raise+proper+form+posterior+pelvic+tilt+no+swing', match: 'ähnlich',
              note: 'Viele Demos zeigen nur Hüftbeugung. Für deinen Plan ohne Schwung; oben aktiv Becken einrollen, soweit kontrollierbar. Bei Bedarf Knie beugen.',
              cues: 'Kein Kipping; Rippen/Becken kontrolliert; langsam absenken.' },
          }),
          ex({
            id: 'sa-tibialis', name: 'Tibialis Raise', dosage: '2-3 x 12-20', sets: 3, reps: { min: 12, max: 20 },
            restSec: { min: 60, max: 90 }, type: TYPES.STRENGTH, warmup: 'light', targetRIR: '1-2',
            video: { label: 'Video-Suche: tibialis raise technique', url: 'https://www.youtube.com/results?search_query=tibialis+raise+proper+technique+wall', match: 'ähnlich',
              note: 'Fersen bleiben am Boden, Vorderfuss aktiv hochziehen und kontrolliert absenken. Abstand zur Wand so wählen, dass 12-20 saubere Reps möglich sind.',
              cues: 'Keine Hüftbewegung; volle Dorsalflexion; kontrollierter Rückweg.' },
          }),
          ex({
            id: 'sa-finisher', name: 'Kraftausdauer-Finisher', dosage: '2-3 Runden bekannter Übungen', type: TYPES.FINISHER,
            restSec: { min: 60, max: 180 },
            note: 'Im Finisher keine neuen Technikregeln: bekannte saubere Varianten verwenden. Runde abbrechen oder Reps reduzieren, bevor Technik deutlich zerfällt.',
            video: null,
          }),
        ],
      },
    ],
  },
];

export function allExercises() {
  return PLAN.flatMap((day) => day.blocks.flatMap((b) => b.exercises));
}

export function findExercise(id) {
  return allExercises().find((e) => e.id === id) || null;
}

export function findDayByExerciseId(id) {
  return PLAN.find((day) => day.blocks.some((b) => b.exercises.some((e) => e.id === id))) || null;
}

export function computeRampSets(kind, workWeightKg) {
  const def = WARMUP_KINDS[kind];
  if (!def || !def.ramp) return [];
  if (workWeightKg == null || workWeightKg <= 0) return def.ramp;
  return def.ramp.map((r) => ({
    ...r,
    weightKg: Math.round((workWeightKg * r.pct) / 1.25) * 1.25,
  }));
}

export const GENERAL_RULES = {
  rom: 'Nutze die grösste schmerzfreie, kontrollierbare Bewegungsamplitude, in der Position und Technik stabil bleiben.',
  tempo: 'Kraft-/Hypertrophiesätze nicht künstlich extrem langsam. Exzentrik kontrolliert (ca. 2-3s), konzentrisch mit klarer Beschleunigungsabsicht. Power-Übungen maximal schnell/explosiv, solange die Technik stabil bleibt.',
  rir: 'Arbeitssätze meist bei 1-2 RIR beenden. Bei Technikverlust, Schmerz oder deutlich veränderter ROM endet der Satz unabhängig von der geplanten Wiederholungszahl.',
  standardisierung: 'Für Progression dieselbe Übungsvariante, ROM und Maschinen-/Kabeleinstellung verwenden. Laststeigerung zählt nur bei qualitativ vergleichbaren Wiederholungen.',
};
