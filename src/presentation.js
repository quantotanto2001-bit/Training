// Presentation only: stored IDs, prescriptions and historical names stay intact.
export const APP_VERSION = '4.2';

const DAYS = {
  mo: ['Ganzkörper A', 'Kraft & Schnellkraft'],
  di: ['Ausdauer & Spagat', 'Vorderer Spagat'],
  mi: ['Ausdauer & Beweglichkeit', 'Schultern & Hüfte'],
  do: ['Ganzkörper B', 'Kraft & Körperkontrolle'],
  fr: ['Beweglichkeit & Beine', 'Seitlicher Spagat'],
  sa: ['Ganzkörper C', 'Schnellkraft & Kraft'],
};
export const dayTitle = day => DAYS[day.id]?.[0] || day.name;
export const daySubtitle = day => DAYS[day.id]?.[1] || day.subtitle || '';

const EXERCISES = {
  'mo-pullup': 'Klimmzug mit Zusatzgewicht',
  'mo-dip': 'Ring-Dips mit Zusatzgewicht',
  'mo-splitsquat': 'Bulgarian Split Squat mit Kurzhanteln',
  'mo-calf': 'Wadenheben auf einer Stufe',
  'mo-extrot': 'Außenrotation am Kabel',
  'mo-gobletsquat': 'Goblet Squat mit Kurzhantel',
  'mo-jump': 'Weit- oder Hochsprung',
  'do-pistol': 'Einbeinige Kniebeuge',
  'do-ringrow': 'Ringrudern',
  'do-ohp': 'Schulterdrücken mit Kurzhanteln',
  'do-handstand': 'Handstand',
  'do-lsit': 'L-Sit / Tuck L-Sit',
  'do-scappullup': 'Schulterblatt-Klimmzug',
  'do-straddlegm': 'Vorbeuge im Grätschsitz',
  'do-pikelift': 'Beinheben im Sitz',
  'do-pancake': 'Vorbeuge im Grätschsitz halten',
  'do-wallshoulder': 'Schulterheben an der Wand',
  'do-latstretch': 'Schulter- und Lat-Dehnung an Ringen',
  'sa-pogo': 'Pogo-Sprünge',
  'sa-explosivepullup': 'Explosiver Klimmzug',
  'sa-ringpushup': 'Ringliegestütz',
  'sa-cablerow': 'Kabelrudern',
  'sa-leraise': 'Beinheben im Hang',
  'sa-tibialis': 'Schienbeinheben',
  'sa-finisher': 'Runden-Ausdauer',
  'sa-rotpower': 'Explosive Kabelrotation',
  'sa-revlunge~reverse': 'Ausfallschritt rückwärts mit Kurzhanteln',
  'di-cardio': 'Lockere Ausdauer',
  'di-atg': 'Langer Ausfallschritt',
  'di-rdl-light': 'Leichte Hüftbeuge mit gestreckten Beinen',
  'di-aslr': 'Aktives Beinheben im Liegen',
  'di-hipflexor': 'Hüftbeuger-Dehnung im Halbkniestand',
  'mi-shouldercars': 'Kontrollierte Schulterkreise',
  'mi-9090': '90/90-Hüftwechsel',
  'mi-cossack': 'Fließende seitliche Kniebeuge',
  'mi-squatpry': 'Beweglichkeit in der tiefen Hocke',
  'mi-thoracic': 'Brustwirbelsäulen-Rotation',
  'mi-catcow': 'Katze-Kuh',
  'mi-wrist': 'Handgelenke mobilisieren',
  'mi-hang': 'Passiver und aktiver Hang am Handtuch',
  'fr-laterallunge': 'Seitlicher Ausfallschritt',
  'fr-horsestance': 'Breiter Kniebeugestand halten',
  'fr-adductor': 'Beinheben für die Adduktoren',
  'fr-frog': 'Frosch-Dehnung',
  'fr-middlesplit': 'Seitlicher Spagat mit Stütze',
  'di-frontsplit': 'Vorderer Spagat mit Stütze',
};
export const exerciseTitle = ex => EXERCISES[ex.id] || ex.name;
export const presentedExercise = ex => ({ ...ex, name: exerciseTitle(ex) });
