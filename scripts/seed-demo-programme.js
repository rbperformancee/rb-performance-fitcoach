// Genere un programme realistic pour Lucas Bernard (client demo) :
// 4 semaines × 3 seances PPL × ~6 exos = ~72 exercices.
// Format HTML compatible avec parserProgramme.js (input id="prog-name", etc).
// Output : SQL INSERT pret a coller dans Supabase SQL Editor.
//
// Usage : node scripts/seed-demo-programme.js > /tmp/seed-demo.sql

// ID prod verifie via SELECT id FROM clients WHERE email='lucas.demo@rbperform.app'.
// Le seed initial supabase/seeds/demo.sql utilisait un autre UUID (jamais joue en prod).
const CLIENT_ID = '7999fa42-e5e9-4e7d-b4d6-cf2a64373cd2';
const ORPHAN_CLIENT_ID = '5f5cb37c-728b-47a9-b7ae-43d3aa643d65';  // cleanup ancien insert

// ── PPL exercises (4 semaines progressives, intensité monte) ──
const buildSessions = (weekNum) => {
  // Volume → intensité au fil des semaines
  const repProgression = {
    1: { heavy: '4X8-10', mid: '4X10-12', light: '3X12-15' },
    2: { heavy: '4X6-8',  mid: '4X8-10',  light: '3X10-12' },
    3: { heavy: '5X6-8',  mid: '4X8-10',  light: '4X10-12' },
    4: { heavy: '3X4-6',  mid: '3X6-8',   light: '3X8-10'  },  // Deload + peak
  };
  const r = repProgression[weekNum];

  // YouTube non répertoriées de la chaîne RB Perform — matchées par nom d'exercice.
  const yt = (id) => `https://youtu.be/${id}`;

  return [
    {
      name: 'Push',
      desc: 'Pectoraux, épaules, triceps. Focus contrôle excentrique.',
      finisher: '3 séries de pompes lestées AMRAP, 60s repos.',
      exercises: [
        { name: 'Développé couché barre',          reps: r.heavy, tempo: '3010', rir: '1', rest: "2'30",  vidUrl: yt('vwPhNxREbnc') },
        { name: 'Développé incliné haltères',      reps: r.mid,   tempo: '3010', rir: '2', rest: "2'",   vidUrl: yt('WixS_Smh4mw') },
        { name: 'Développé couché prise serrée',   reps: r.mid,   tempo: '3010', rir: '1', rest: "2'",   vidUrl: yt('yBhTUtd7lSw') },
        { name: 'Élévations latérales haltères',   reps: r.light, tempo: '2010', rir: '1', rest: "1'30", vidUrl: yt('_zbC5RQfkmk') },
        { name: 'Triceps poulie corde',            reps: r.light, tempo: '2010', rir: '0', rest: "1'30", vidUrl: yt('G8GYdDkdmUk') },
        { name: 'Extensions verticales haltère',   reps: r.light, tempo: '3010', rir: '1', rest: "1'30", vidUrl: yt('tPgqu7J0Q4A') },
      ],
    },
    {
      name: 'Pull',
      desc: 'Dos, biceps, deltoïdes postérieurs. Tirages contrôlés.',
      finisher: '50 face pulls cumulés, le moins de pause possible.',
      exercises: [
        { name: 'Tractions lestées pronation',     reps: r.heavy, tempo: '2010', rir: '1', rest: "2'30", vidUrl: yt('kECazDUDmWA') },
        { name: 'Rowing barre',                    reps: r.heavy, tempo: '3010', rir: '2', rest: "2'30", vidUrl: yt('dkbmaZB0krM') },
        { name: 'Tirage poitrine prise neutre',    reps: r.mid,   tempo: '2010', rir: '1', rest: "2'",   vidUrl: yt('wQa7GGIfP0M') },
        { name: 'Rowing assis poulie',             reps: r.mid,   tempo: '2010', rir: '1', rest: "1'30", vidUrl: yt('DFM5DniTl1g') },
        { name: 'Face pulls',                      reps: r.light, tempo: '2010', rir: '0', rest: "1'30", vidUrl: yt('Hg3N4sPDt_E') },
        { name: 'Curl barre EZ',                   reps: r.mid,   tempo: '3010', rir: '1', rest: "1'30", vidUrl: yt('RUGpTkGXDiU') },
        { name: 'Curl marteau haltères',           reps: r.light, tempo: '3010', rir: '0', rest: "1'30", vidUrl: yt('_2HGonsfTec') },
      ],
    },
    {
      name: 'Legs',
      desc: 'Quadriceps, ischios, fessiers, mollets. Poussée maximale.',
      finisher: '20 squats sautés au poids du corps + 1min de gainage.',
      exercises: [
        { name: 'Squat barre dos',                 reps: r.heavy, tempo: '3010', rir: '1', rest: "3'",   vidUrl: yt('c-6Fy2UgydA') },
        { name: 'Soulevé de terre roumain',        reps: r.heavy, tempo: '3010', rir: '2', rest: "2'30", vidUrl: yt('TykJQtunfYc') },
        { name: 'Presse à cuisses',                reps: r.mid,   tempo: '2010', rir: '1', rest: "2'",   vidUrl: yt('R97EvnlUTYQ') },
        { name: 'Fentes marchées haltères',        reps: '3X10/jambes', tempo: '2010', rir: '1', rest: "2'",   vidUrl: yt('X9ne2alS1LY') },
        { name: 'Leg curl allongé',                reps: r.light, tempo: '3010', rir: '0', rest: "1'30", vidUrl: yt('Vt4Lxn1Tfv4') },
        { name: 'Mollets debout machine',          reps: '4X15-20',     tempo: '2010', rir: '0', rest: "1'30", vidUrl: yt('fZNu9CBOSik') },
      ],
    },
  ];
};

// ── Build HTML compatible parserProgramme.js ──
const escAttr = (s) => String(s || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const escText = (s) => String(s || '').replace(/</g, '&lt;');

const buildHTML = () => {
  const weeks = [1, 2, 3, 4].map(weekNum => {
    const sessions = buildSessions(weekNum).map((session, si) => {
      const sid = `w${weekNum}s${si + 1}`;
      const exercisesHTML = session.exercises.map((ex, ei) => {
        const eid = `${sid}e${ei + 1}`;
        return `
        <div class="exercise-item" id="ex-${eid}">
          <input id="en-${eid}" value="${escAttr(ex.name)}" />
          <input id="er-${eid}" value="${escAttr(ex.reps)}" />
          <input id="et-${eid}" value="${escAttr(ex.tempo)}" />
          <select id="eri-${eid}"><option selected value="${escAttr(ex.rir)}">${escAttr(ex.rir)}</option></select>
          <input id="ers-${eid}" value="${escAttr(ex.rest)}" />
          <input id="ev-${eid}" value="${escAttr(ex.vidUrl || '')}" />
        </div>`;
      }).join('');

      return `
      <div class="seance-block" id="seance-${sid}">
        <input id="sn-${sid}" value="${escAttr(session.name)}" />
        <textarea id="sd-${sid}">${escText(session.desc)}</textarea>
        <textarea id="sf-${sid}">${escText(session.finisher)}</textarea>
        ${exercisesHTML}
      </div>`;
    }).join('');

    return `
    <div class="week-block">
      <h2>Semaine ${weekNum}</h2>
      ${sessions}
    </div>`;
  }).join('');

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>PPL Hypertrophie</title></head><body>
<input id="prog-name"     value="PPL Hypertrophie · Q1" />
<input id="client-name"   value="Lucas Bernard" />
<input id="prog-duration" value="4" />
<input id="prog-tagline"  value="4 semaines progressives. Volume puis intensité." />
<input id="prog-obj"      value="prise-de-masse" />
${weeks}
</body></html>`;
};

const html = buildHTML();

// ── Output SQL ──
// Dollar-quoted string ($rb$...$rb$) pour eviter les escapes.
const sql = `-- =========================================================
-- Demo programme — Lucas Bernard (client demo)
-- =========================================================
-- 4 semaines x 3 seances PPL x ~6 exercices.
-- Idempotent : desactive les anciens programmes du demo client
-- avant d'inserer le nouveau.

-- Cleanup : supprime l'insert precedent sur le mauvais client_id
DELETE FROM public.programmes
 WHERE client_id = '${ORPHAN_CLIENT_ID}'::uuid;

UPDATE public.programmes
   SET is_active = false
 WHERE client_id = '${CLIENT_ID}'::uuid;

INSERT INTO public.programmes (
  client_id,
  programme_name,
  html_content,
  is_active,
  uploaded_by,
  uploaded_at,
  programme_accepted_at,
  programme_start_date
) VALUES (
  '${CLIENT_ID}'::uuid,
  'PPL Hypertrophie · Q1',
  $rb$${html}$rb$,
  true,
  'demo@rbperform.app',
  now() - interval '20 days',
  now() - interval '15 days',
  (now() - interval '15 days')::date
);

SELECT id, programme_name, is_active, uploaded_at
  FROM public.programmes
 WHERE client_id = '${CLIENT_ID}'::uuid
 ORDER BY uploaded_at DESC
 LIMIT 5;
`;

process.stdout.write(sql);
