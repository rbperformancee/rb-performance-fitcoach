-- =========================================================
-- Demo programme — Lucas Bernard (client demo)
-- =========================================================
-- 4 semaines x 3 seances PPL x ~6 exercices.
-- Idempotent : desactive les anciens programmes du demo client
-- avant d'inserer le nouveau.

-- Cleanup : supprime l'insert precedent sur le mauvais client_id
DELETE FROM public.programmes
 WHERE client_id = '5f5cb37c-728b-47a9-b7ae-43d3aa643d65'::uuid;

UPDATE public.programmes
   SET is_active = false
 WHERE client_id = '7999fa42-e5e9-4e7d-b4d6-cf2a64373cd2'::uuid;

INSERT INTO public.programmes (
  client_id,
  programme_name,
  html_content,
  is_active,
  published_at,
  uploaded_by,
  uploaded_at,
  programme_accepted_at,
  programme_start_date
) VALUES (
  '7999fa42-e5e9-4e7d-b4d6-cf2a64373cd2'::uuid,
  'PPL Hypertrophie · Q1',
  $rb$<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>PPL Hypertrophie</title></head><body>
<input id="prog-name"     value="PPL Hypertrophie · Q1" />
<input id="client-name"   value="Lucas Bernard" />
<input id="prog-duration" value="4" />
<input id="prog-tagline"  value="4 semaines progressives. Volume puis intensité." />
<input id="prog-obj"      value="prise-de-masse" />

    <div class="week-block">
      <h2>Semaine 1</h2>
      
      <div class="seance-block" id="seance-w1s1">
        <input id="sn-w1s1" value="Push" />
        <textarea id="sd-w1s1">Pectoraux, épaules, triceps. Focus contrôle excentrique.</textarea>
        <textarea id="sf-w1s1">3 séries de pompes lestées AMRAP, 60s repos.</textarea>
        
        <div class="exercise-item" id="ex-w1s1e1">
          <input id="en-w1s1e1" value="Développé couché barre" />
          <input id="er-w1s1e1" value="4X8-10" />
          <input id="et-w1s1e1" value="3010" />
          <select id="eri-w1s1e1"><option selected value="1">1</option></select>
          <input id="ers-w1s1e1" value="2'30" />
          <input id="ev-w1s1e1" value="https://youtu.be/vwPhNxREbnc" />
        </div>
        <div class="exercise-item" id="ex-w1s1e2">
          <input id="en-w1s1e2" value="Développé incliné haltères" />
          <input id="er-w1s1e2" value="4X10-12" />
          <input id="et-w1s1e2" value="3010" />
          <select id="eri-w1s1e2"><option selected value="2">2</option></select>
          <input id="ers-w1s1e2" value="2'" />
          <input id="ev-w1s1e2" value="https://youtu.be/WixS_Smh4mw" />
        </div>
        <div class="exercise-item" id="ex-w1s1e3">
          <input id="en-w1s1e3" value="Développé couché prise serrée" />
          <input id="er-w1s1e3" value="4X10-12" />
          <input id="et-w1s1e3" value="3010" />
          <select id="eri-w1s1e3"><option selected value="1">1</option></select>
          <input id="ers-w1s1e3" value="2'" />
          <input id="ev-w1s1e3" value="https://youtu.be/yBhTUtd7lSw" />
        </div>
        <div class="exercise-item" id="ex-w1s1e4">
          <input id="en-w1s1e4" value="Élévations latérales haltères" />
          <input id="er-w1s1e4" value="3X12-15" />
          <input id="et-w1s1e4" value="2010" />
          <select id="eri-w1s1e4"><option selected value="1">1</option></select>
          <input id="ers-w1s1e4" value="1'30" />
          <input id="ev-w1s1e4" value="https://youtu.be/_zbC5RQfkmk" />
        </div>
        <div class="exercise-item" id="ex-w1s1e5">
          <input id="en-w1s1e5" value="Triceps poulie corde" />
          <input id="er-w1s1e5" value="3X12-15" />
          <input id="et-w1s1e5" value="2010" />
          <select id="eri-w1s1e5"><option selected value="0">0</option></select>
          <input id="ers-w1s1e5" value="1'30" />
          <input id="ev-w1s1e5" value="https://youtu.be/G8GYdDkdmUk" />
        </div>
        <div class="exercise-item" id="ex-w1s1e6">
          <input id="en-w1s1e6" value="Extensions verticales haltère" />
          <input id="er-w1s1e6" value="3X12-15" />
          <input id="et-w1s1e6" value="3010" />
          <select id="eri-w1s1e6"><option selected value="1">1</option></select>
          <input id="ers-w1s1e6" value="1'30" />
          <input id="ev-w1s1e6" value="https://youtu.be/tPgqu7J0Q4A" />
        </div>
      </div>
      <div class="seance-block" id="seance-w1s2">
        <input id="sn-w1s2" value="Pull" />
        <textarea id="sd-w1s2">Dos, biceps, deltoïdes postérieurs. Tirages contrôlés.</textarea>
        <textarea id="sf-w1s2">50 face pulls cumulés, le moins de pause possible.</textarea>
        
        <div class="exercise-item" id="ex-w1s2e1">
          <input id="en-w1s2e1" value="Tractions lestées pronation" />
          <input id="er-w1s2e1" value="4X8-10" />
          <input id="et-w1s2e1" value="2010" />
          <select id="eri-w1s2e1"><option selected value="1">1</option></select>
          <input id="ers-w1s2e1" value="2'30" />
          <input id="ev-w1s2e1" value="https://youtu.be/kECazDUDmWA" />
        </div>
        <div class="exercise-item" id="ex-w1s2e2">
          <input id="en-w1s2e2" value="Rowing barre" />
          <input id="er-w1s2e2" value="4X8-10" />
          <input id="et-w1s2e2" value="3010" />
          <select id="eri-w1s2e2"><option selected value="2">2</option></select>
          <input id="ers-w1s2e2" value="2'30" />
          <input id="ev-w1s2e2" value="https://youtu.be/dkbmaZB0krM" />
        </div>
        <div class="exercise-item" id="ex-w1s2e3">
          <input id="en-w1s2e3" value="Tirage poitrine prise neutre" />
          <input id="er-w1s2e3" value="4X10-12" />
          <input id="et-w1s2e3" value="2010" />
          <select id="eri-w1s2e3"><option selected value="1">1</option></select>
          <input id="ers-w1s2e3" value="2'" />
          <input id="ev-w1s2e3" value="https://youtu.be/wQa7GGIfP0M" />
        </div>
        <div class="exercise-item" id="ex-w1s2e4">
          <input id="en-w1s2e4" value="Rowing assis poulie" />
          <input id="er-w1s2e4" value="4X10-12" />
          <input id="et-w1s2e4" value="2010" />
          <select id="eri-w1s2e4"><option selected value="1">1</option></select>
          <input id="ers-w1s2e4" value="1'30" />
          <input id="ev-w1s2e4" value="https://youtu.be/DFM5DniTl1g" />
        </div>
        <div class="exercise-item" id="ex-w1s2e5">
          <input id="en-w1s2e5" value="Face pulls" />
          <input id="er-w1s2e5" value="3X12-15" />
          <input id="et-w1s2e5" value="2010" />
          <select id="eri-w1s2e5"><option selected value="0">0</option></select>
          <input id="ers-w1s2e5" value="1'30" />
          <input id="ev-w1s2e5" value="https://youtu.be/Hg3N4sPDt_E" />
        </div>
        <div class="exercise-item" id="ex-w1s2e6">
          <input id="en-w1s2e6" value="Curl barre EZ" />
          <input id="er-w1s2e6" value="4X10-12" />
          <input id="et-w1s2e6" value="3010" />
          <select id="eri-w1s2e6"><option selected value="1">1</option></select>
          <input id="ers-w1s2e6" value="1'30" />
          <input id="ev-w1s2e6" value="https://youtu.be/RUGpTkGXDiU" />
        </div>
        <div class="exercise-item" id="ex-w1s2e7">
          <input id="en-w1s2e7" value="Curl marteau haltères" />
          <input id="er-w1s2e7" value="3X12-15" />
          <input id="et-w1s2e7" value="3010" />
          <select id="eri-w1s2e7"><option selected value="0">0</option></select>
          <input id="ers-w1s2e7" value="1'30" />
          <input id="ev-w1s2e7" value="https://youtu.be/_2HGonsfTec" />
        </div>
      </div>
      <div class="seance-block" id="seance-w1s3">
        <input id="sn-w1s3" value="Legs" />
        <textarea id="sd-w1s3">Quadriceps, ischios, fessiers, mollets. Poussée maximale.</textarea>
        <textarea id="sf-w1s3">20 squats sautés au poids du corps + 1min de gainage.</textarea>
        
        <div class="exercise-item" id="ex-w1s3e1">
          <input id="en-w1s3e1" value="Squat barre dos" />
          <input id="er-w1s3e1" value="4X8-10" />
          <input id="et-w1s3e1" value="3010" />
          <select id="eri-w1s3e1"><option selected value="1">1</option></select>
          <input id="ers-w1s3e1" value="3'" />
          <input id="ev-w1s3e1" value="https://youtu.be/c-6Fy2UgydA" />
        </div>
        <div class="exercise-item" id="ex-w1s3e2">
          <input id="en-w1s3e2" value="Soulevé de terre roumain" />
          <input id="er-w1s3e2" value="4X8-10" />
          <input id="et-w1s3e2" value="3010" />
          <select id="eri-w1s3e2"><option selected value="2">2</option></select>
          <input id="ers-w1s3e2" value="2'30" />
          <input id="ev-w1s3e2" value="https://youtu.be/TykJQtunfYc" />
        </div>
        <div class="exercise-item" id="ex-w1s3e3">
          <input id="en-w1s3e3" value="Presse à cuisses" />
          <input id="er-w1s3e3" value="4X10-12" />
          <input id="et-w1s3e3" value="2010" />
          <select id="eri-w1s3e3"><option selected value="1">1</option></select>
          <input id="ers-w1s3e3" value="2'" />
          <input id="ev-w1s3e3" value="https://youtu.be/R97EvnlUTYQ" />
        </div>
        <div class="exercise-item" id="ex-w1s3e4">
          <input id="en-w1s3e4" value="Fentes marchées haltères" />
          <input id="er-w1s3e4" value="3X10/jambes" />
          <input id="et-w1s3e4" value="2010" />
          <select id="eri-w1s3e4"><option selected value="1">1</option></select>
          <input id="ers-w1s3e4" value="2'" />
          <input id="ev-w1s3e4" value="https://youtu.be/X9ne2alS1LY" />
        </div>
        <div class="exercise-item" id="ex-w1s3e5">
          <input id="en-w1s3e5" value="Leg curl allongé" />
          <input id="er-w1s3e5" value="3X12-15" />
          <input id="et-w1s3e5" value="3010" />
          <select id="eri-w1s3e5"><option selected value="0">0</option></select>
          <input id="ers-w1s3e5" value="1'30" />
          <input id="ev-w1s3e5" value="https://youtu.be/Vt4Lxn1Tfv4" />
        </div>
        <div class="exercise-item" id="ex-w1s3e6">
          <input id="en-w1s3e6" value="Mollets debout machine" />
          <input id="er-w1s3e6" value="4X15-20" />
          <input id="et-w1s3e6" value="2010" />
          <select id="eri-w1s3e6"><option selected value="0">0</option></select>
          <input id="ers-w1s3e6" value="1'30" />
          <input id="ev-w1s3e6" value="https://youtu.be/fZNu9CBOSik" />
        </div>
      </div>
    </div>
    <div class="week-block">
      <h2>Semaine 2</h2>
      
      <div class="seance-block" id="seance-w2s1">
        <input id="sn-w2s1" value="Push" />
        <textarea id="sd-w2s1">Pectoraux, épaules, triceps. Focus contrôle excentrique.</textarea>
        <textarea id="sf-w2s1">3 séries de pompes lestées AMRAP, 60s repos.</textarea>
        
        <div class="exercise-item" id="ex-w2s1e1">
          <input id="en-w2s1e1" value="Développé couché barre" />
          <input id="er-w2s1e1" value="4X6-8" />
          <input id="et-w2s1e1" value="3010" />
          <select id="eri-w2s1e1"><option selected value="1">1</option></select>
          <input id="ers-w2s1e1" value="2'30" />
          <input id="ev-w2s1e1" value="https://youtu.be/vwPhNxREbnc" />
        </div>
        <div class="exercise-item" id="ex-w2s1e2">
          <input id="en-w2s1e2" value="Développé incliné haltères" />
          <input id="er-w2s1e2" value="4X8-10" />
          <input id="et-w2s1e2" value="3010" />
          <select id="eri-w2s1e2"><option selected value="2">2</option></select>
          <input id="ers-w2s1e2" value="2'" />
          <input id="ev-w2s1e2" value="https://youtu.be/WixS_Smh4mw" />
        </div>
        <div class="exercise-item" id="ex-w2s1e3">
          <input id="en-w2s1e3" value="Développé couché prise serrée" />
          <input id="er-w2s1e3" value="4X8-10" />
          <input id="et-w2s1e3" value="3010" />
          <select id="eri-w2s1e3"><option selected value="1">1</option></select>
          <input id="ers-w2s1e3" value="2'" />
          <input id="ev-w2s1e3" value="https://youtu.be/yBhTUtd7lSw" />
        </div>
        <div class="exercise-item" id="ex-w2s1e4">
          <input id="en-w2s1e4" value="Élévations latérales haltères" />
          <input id="er-w2s1e4" value="3X10-12" />
          <input id="et-w2s1e4" value="2010" />
          <select id="eri-w2s1e4"><option selected value="1">1</option></select>
          <input id="ers-w2s1e4" value="1'30" />
          <input id="ev-w2s1e4" value="https://youtu.be/_zbC5RQfkmk" />
        </div>
        <div class="exercise-item" id="ex-w2s1e5">
          <input id="en-w2s1e5" value="Triceps poulie corde" />
          <input id="er-w2s1e5" value="3X10-12" />
          <input id="et-w2s1e5" value="2010" />
          <select id="eri-w2s1e5"><option selected value="0">0</option></select>
          <input id="ers-w2s1e5" value="1'30" />
          <input id="ev-w2s1e5" value="https://youtu.be/G8GYdDkdmUk" />
        </div>
        <div class="exercise-item" id="ex-w2s1e6">
          <input id="en-w2s1e6" value="Extensions verticales haltère" />
          <input id="er-w2s1e6" value="3X10-12" />
          <input id="et-w2s1e6" value="3010" />
          <select id="eri-w2s1e6"><option selected value="1">1</option></select>
          <input id="ers-w2s1e6" value="1'30" />
          <input id="ev-w2s1e6" value="https://youtu.be/tPgqu7J0Q4A" />
        </div>
      </div>
      <div class="seance-block" id="seance-w2s2">
        <input id="sn-w2s2" value="Pull" />
        <textarea id="sd-w2s2">Dos, biceps, deltoïdes postérieurs. Tirages contrôlés.</textarea>
        <textarea id="sf-w2s2">50 face pulls cumulés, le moins de pause possible.</textarea>
        
        <div class="exercise-item" id="ex-w2s2e1">
          <input id="en-w2s2e1" value="Tractions lestées pronation" />
          <input id="er-w2s2e1" value="4X6-8" />
          <input id="et-w2s2e1" value="2010" />
          <select id="eri-w2s2e1"><option selected value="1">1</option></select>
          <input id="ers-w2s2e1" value="2'30" />
          <input id="ev-w2s2e1" value="https://youtu.be/kECazDUDmWA" />
        </div>
        <div class="exercise-item" id="ex-w2s2e2">
          <input id="en-w2s2e2" value="Rowing barre" />
          <input id="er-w2s2e2" value="4X6-8" />
          <input id="et-w2s2e2" value="3010" />
          <select id="eri-w2s2e2"><option selected value="2">2</option></select>
          <input id="ers-w2s2e2" value="2'30" />
          <input id="ev-w2s2e2" value="https://youtu.be/dkbmaZB0krM" />
        </div>
        <div class="exercise-item" id="ex-w2s2e3">
          <input id="en-w2s2e3" value="Tirage poitrine prise neutre" />
          <input id="er-w2s2e3" value="4X8-10" />
          <input id="et-w2s2e3" value="2010" />
          <select id="eri-w2s2e3"><option selected value="1">1</option></select>
          <input id="ers-w2s2e3" value="2'" />
          <input id="ev-w2s2e3" value="https://youtu.be/wQa7GGIfP0M" />
        </div>
        <div class="exercise-item" id="ex-w2s2e4">
          <input id="en-w2s2e4" value="Rowing assis poulie" />
          <input id="er-w2s2e4" value="4X8-10" />
          <input id="et-w2s2e4" value="2010" />
          <select id="eri-w2s2e4"><option selected value="1">1</option></select>
          <input id="ers-w2s2e4" value="1'30" />
          <input id="ev-w2s2e4" value="https://youtu.be/DFM5DniTl1g" />
        </div>
        <div class="exercise-item" id="ex-w2s2e5">
          <input id="en-w2s2e5" value="Face pulls" />
          <input id="er-w2s2e5" value="3X10-12" />
          <input id="et-w2s2e5" value="2010" />
          <select id="eri-w2s2e5"><option selected value="0">0</option></select>
          <input id="ers-w2s2e5" value="1'30" />
          <input id="ev-w2s2e5" value="https://youtu.be/Hg3N4sPDt_E" />
        </div>
        <div class="exercise-item" id="ex-w2s2e6">
          <input id="en-w2s2e6" value="Curl barre EZ" />
          <input id="er-w2s2e6" value="4X8-10" />
          <input id="et-w2s2e6" value="3010" />
          <select id="eri-w2s2e6"><option selected value="1">1</option></select>
          <input id="ers-w2s2e6" value="1'30" />
          <input id="ev-w2s2e6" value="https://youtu.be/RUGpTkGXDiU" />
        </div>
        <div class="exercise-item" id="ex-w2s2e7">
          <input id="en-w2s2e7" value="Curl marteau haltères" />
          <input id="er-w2s2e7" value="3X10-12" />
          <input id="et-w2s2e7" value="3010" />
          <select id="eri-w2s2e7"><option selected value="0">0</option></select>
          <input id="ers-w2s2e7" value="1'30" />
          <input id="ev-w2s2e7" value="https://youtu.be/_2HGonsfTec" />
        </div>
      </div>
      <div class="seance-block" id="seance-w2s3">
        <input id="sn-w2s3" value="Legs" />
        <textarea id="sd-w2s3">Quadriceps, ischios, fessiers, mollets. Poussée maximale.</textarea>
        <textarea id="sf-w2s3">20 squats sautés au poids du corps + 1min de gainage.</textarea>
        
        <div class="exercise-item" id="ex-w2s3e1">
          <input id="en-w2s3e1" value="Squat barre dos" />
          <input id="er-w2s3e1" value="4X6-8" />
          <input id="et-w2s3e1" value="3010" />
          <select id="eri-w2s3e1"><option selected value="1">1</option></select>
          <input id="ers-w2s3e1" value="3'" />
          <input id="ev-w2s3e1" value="https://youtu.be/c-6Fy2UgydA" />
        </div>
        <div class="exercise-item" id="ex-w2s3e2">
          <input id="en-w2s3e2" value="Soulevé de terre roumain" />
          <input id="er-w2s3e2" value="4X6-8" />
          <input id="et-w2s3e2" value="3010" />
          <select id="eri-w2s3e2"><option selected value="2">2</option></select>
          <input id="ers-w2s3e2" value="2'30" />
          <input id="ev-w2s3e2" value="https://youtu.be/TykJQtunfYc" />
        </div>
        <div class="exercise-item" id="ex-w2s3e3">
          <input id="en-w2s3e3" value="Presse à cuisses" />
          <input id="er-w2s3e3" value="4X8-10" />
          <input id="et-w2s3e3" value="2010" />
          <select id="eri-w2s3e3"><option selected value="1">1</option></select>
          <input id="ers-w2s3e3" value="2'" />
          <input id="ev-w2s3e3" value="https://youtu.be/R97EvnlUTYQ" />
        </div>
        <div class="exercise-item" id="ex-w2s3e4">
          <input id="en-w2s3e4" value="Fentes marchées haltères" />
          <input id="er-w2s3e4" value="3X10/jambes" />
          <input id="et-w2s3e4" value="2010" />
          <select id="eri-w2s3e4"><option selected value="1">1</option></select>
          <input id="ers-w2s3e4" value="2'" />
          <input id="ev-w2s3e4" value="https://youtu.be/X9ne2alS1LY" />
        </div>
        <div class="exercise-item" id="ex-w2s3e5">
          <input id="en-w2s3e5" value="Leg curl allongé" />
          <input id="er-w2s3e5" value="3X10-12" />
          <input id="et-w2s3e5" value="3010" />
          <select id="eri-w2s3e5"><option selected value="0">0</option></select>
          <input id="ers-w2s3e5" value="1'30" />
          <input id="ev-w2s3e5" value="https://youtu.be/Vt4Lxn1Tfv4" />
        </div>
        <div class="exercise-item" id="ex-w2s3e6">
          <input id="en-w2s3e6" value="Mollets debout machine" />
          <input id="er-w2s3e6" value="4X15-20" />
          <input id="et-w2s3e6" value="2010" />
          <select id="eri-w2s3e6"><option selected value="0">0</option></select>
          <input id="ers-w2s3e6" value="1'30" />
          <input id="ev-w2s3e6" value="https://youtu.be/fZNu9CBOSik" />
        </div>
      </div>
    </div>
    <div class="week-block">
      <h2>Semaine 3</h2>
      
      <div class="seance-block" id="seance-w3s1">
        <input id="sn-w3s1" value="Push" />
        <textarea id="sd-w3s1">Pectoraux, épaules, triceps. Focus contrôle excentrique.</textarea>
        <textarea id="sf-w3s1">3 séries de pompes lestées AMRAP, 60s repos.</textarea>
        
        <div class="exercise-item" id="ex-w3s1e1">
          <input id="en-w3s1e1" value="Développé couché barre" />
          <input id="er-w3s1e1" value="5X6-8" />
          <input id="et-w3s1e1" value="3010" />
          <select id="eri-w3s1e1"><option selected value="1">1</option></select>
          <input id="ers-w3s1e1" value="2'30" />
          <input id="ev-w3s1e1" value="https://youtu.be/vwPhNxREbnc" />
        </div>
        <div class="exercise-item" id="ex-w3s1e2">
          <input id="en-w3s1e2" value="Développé incliné haltères" />
          <input id="er-w3s1e2" value="4X8-10" />
          <input id="et-w3s1e2" value="3010" />
          <select id="eri-w3s1e2"><option selected value="2">2</option></select>
          <input id="ers-w3s1e2" value="2'" />
          <input id="ev-w3s1e2" value="https://youtu.be/WixS_Smh4mw" />
        </div>
        <div class="exercise-item" id="ex-w3s1e3">
          <input id="en-w3s1e3" value="Développé couché prise serrée" />
          <input id="er-w3s1e3" value="4X8-10" />
          <input id="et-w3s1e3" value="3010" />
          <select id="eri-w3s1e3"><option selected value="1">1</option></select>
          <input id="ers-w3s1e3" value="2'" />
          <input id="ev-w3s1e3" value="https://youtu.be/yBhTUtd7lSw" />
        </div>
        <div class="exercise-item" id="ex-w3s1e4">
          <input id="en-w3s1e4" value="Élévations latérales haltères" />
          <input id="er-w3s1e4" value="4X10-12" />
          <input id="et-w3s1e4" value="2010" />
          <select id="eri-w3s1e4"><option selected value="1">1</option></select>
          <input id="ers-w3s1e4" value="1'30" />
          <input id="ev-w3s1e4" value="https://youtu.be/_zbC5RQfkmk" />
        </div>
        <div class="exercise-item" id="ex-w3s1e5">
          <input id="en-w3s1e5" value="Triceps poulie corde" />
          <input id="er-w3s1e5" value="4X10-12" />
          <input id="et-w3s1e5" value="2010" />
          <select id="eri-w3s1e5"><option selected value="0">0</option></select>
          <input id="ers-w3s1e5" value="1'30" />
          <input id="ev-w3s1e5" value="https://youtu.be/G8GYdDkdmUk" />
        </div>
        <div class="exercise-item" id="ex-w3s1e6">
          <input id="en-w3s1e6" value="Extensions verticales haltère" />
          <input id="er-w3s1e6" value="4X10-12" />
          <input id="et-w3s1e6" value="3010" />
          <select id="eri-w3s1e6"><option selected value="1">1</option></select>
          <input id="ers-w3s1e6" value="1'30" />
          <input id="ev-w3s1e6" value="https://youtu.be/tPgqu7J0Q4A" />
        </div>
      </div>
      <div class="seance-block" id="seance-w3s2">
        <input id="sn-w3s2" value="Pull" />
        <textarea id="sd-w3s2">Dos, biceps, deltoïdes postérieurs. Tirages contrôlés.</textarea>
        <textarea id="sf-w3s2">50 face pulls cumulés, le moins de pause possible.</textarea>
        
        <div class="exercise-item" id="ex-w3s2e1">
          <input id="en-w3s2e1" value="Tractions lestées pronation" />
          <input id="er-w3s2e1" value="5X6-8" />
          <input id="et-w3s2e1" value="2010" />
          <select id="eri-w3s2e1"><option selected value="1">1</option></select>
          <input id="ers-w3s2e1" value="2'30" />
          <input id="ev-w3s2e1" value="https://youtu.be/kECazDUDmWA" />
        </div>
        <div class="exercise-item" id="ex-w3s2e2">
          <input id="en-w3s2e2" value="Rowing barre" />
          <input id="er-w3s2e2" value="5X6-8" />
          <input id="et-w3s2e2" value="3010" />
          <select id="eri-w3s2e2"><option selected value="2">2</option></select>
          <input id="ers-w3s2e2" value="2'30" />
          <input id="ev-w3s2e2" value="https://youtu.be/dkbmaZB0krM" />
        </div>
        <div class="exercise-item" id="ex-w3s2e3">
          <input id="en-w3s2e3" value="Tirage poitrine prise neutre" />
          <input id="er-w3s2e3" value="4X8-10" />
          <input id="et-w3s2e3" value="2010" />
          <select id="eri-w3s2e3"><option selected value="1">1</option></select>
          <input id="ers-w3s2e3" value="2'" />
          <input id="ev-w3s2e3" value="https://youtu.be/wQa7GGIfP0M" />
        </div>
        <div class="exercise-item" id="ex-w3s2e4">
          <input id="en-w3s2e4" value="Rowing assis poulie" />
          <input id="er-w3s2e4" value="4X8-10" />
          <input id="et-w3s2e4" value="2010" />
          <select id="eri-w3s2e4"><option selected value="1">1</option></select>
          <input id="ers-w3s2e4" value="1'30" />
          <input id="ev-w3s2e4" value="https://youtu.be/DFM5DniTl1g" />
        </div>
        <div class="exercise-item" id="ex-w3s2e5">
          <input id="en-w3s2e5" value="Face pulls" />
          <input id="er-w3s2e5" value="4X10-12" />
          <input id="et-w3s2e5" value="2010" />
          <select id="eri-w3s2e5"><option selected value="0">0</option></select>
          <input id="ers-w3s2e5" value="1'30" />
          <input id="ev-w3s2e5" value="https://youtu.be/Hg3N4sPDt_E" />
        </div>
        <div class="exercise-item" id="ex-w3s2e6">
          <input id="en-w3s2e6" value="Curl barre EZ" />
          <input id="er-w3s2e6" value="4X8-10" />
          <input id="et-w3s2e6" value="3010" />
          <select id="eri-w3s2e6"><option selected value="1">1</option></select>
          <input id="ers-w3s2e6" value="1'30" />
          <input id="ev-w3s2e6" value="https://youtu.be/RUGpTkGXDiU" />
        </div>
        <div class="exercise-item" id="ex-w3s2e7">
          <input id="en-w3s2e7" value="Curl marteau haltères" />
          <input id="er-w3s2e7" value="4X10-12" />
          <input id="et-w3s2e7" value="3010" />
          <select id="eri-w3s2e7"><option selected value="0">0</option></select>
          <input id="ers-w3s2e7" value="1'30" />
          <input id="ev-w3s2e7" value="https://youtu.be/_2HGonsfTec" />
        </div>
      </div>
      <div class="seance-block" id="seance-w3s3">
        <input id="sn-w3s3" value="Legs" />
        <textarea id="sd-w3s3">Quadriceps, ischios, fessiers, mollets. Poussée maximale.</textarea>
        <textarea id="sf-w3s3">20 squats sautés au poids du corps + 1min de gainage.</textarea>
        
        <div class="exercise-item" id="ex-w3s3e1">
          <input id="en-w3s3e1" value="Squat barre dos" />
          <input id="er-w3s3e1" value="5X6-8" />
          <input id="et-w3s3e1" value="3010" />
          <select id="eri-w3s3e1"><option selected value="1">1</option></select>
          <input id="ers-w3s3e1" value="3'" />
          <input id="ev-w3s3e1" value="https://youtu.be/c-6Fy2UgydA" />
        </div>
        <div class="exercise-item" id="ex-w3s3e2">
          <input id="en-w3s3e2" value="Soulevé de terre roumain" />
          <input id="er-w3s3e2" value="5X6-8" />
          <input id="et-w3s3e2" value="3010" />
          <select id="eri-w3s3e2"><option selected value="2">2</option></select>
          <input id="ers-w3s3e2" value="2'30" />
          <input id="ev-w3s3e2" value="https://youtu.be/TykJQtunfYc" />
        </div>
        <div class="exercise-item" id="ex-w3s3e3">
          <input id="en-w3s3e3" value="Presse à cuisses" />
          <input id="er-w3s3e3" value="4X8-10" />
          <input id="et-w3s3e3" value="2010" />
          <select id="eri-w3s3e3"><option selected value="1">1</option></select>
          <input id="ers-w3s3e3" value="2'" />
          <input id="ev-w3s3e3" value="https://youtu.be/R97EvnlUTYQ" />
        </div>
        <div class="exercise-item" id="ex-w3s3e4">
          <input id="en-w3s3e4" value="Fentes marchées haltères" />
          <input id="er-w3s3e4" value="3X10/jambes" />
          <input id="et-w3s3e4" value="2010" />
          <select id="eri-w3s3e4"><option selected value="1">1</option></select>
          <input id="ers-w3s3e4" value="2'" />
          <input id="ev-w3s3e4" value="https://youtu.be/X9ne2alS1LY" />
        </div>
        <div class="exercise-item" id="ex-w3s3e5">
          <input id="en-w3s3e5" value="Leg curl allongé" />
          <input id="er-w3s3e5" value="4X10-12" />
          <input id="et-w3s3e5" value="3010" />
          <select id="eri-w3s3e5"><option selected value="0">0</option></select>
          <input id="ers-w3s3e5" value="1'30" />
          <input id="ev-w3s3e5" value="https://youtu.be/Vt4Lxn1Tfv4" />
        </div>
        <div class="exercise-item" id="ex-w3s3e6">
          <input id="en-w3s3e6" value="Mollets debout machine" />
          <input id="er-w3s3e6" value="4X15-20" />
          <input id="et-w3s3e6" value="2010" />
          <select id="eri-w3s3e6"><option selected value="0">0</option></select>
          <input id="ers-w3s3e6" value="1'30" />
          <input id="ev-w3s3e6" value="https://youtu.be/fZNu9CBOSik" />
        </div>
      </div>
    </div>
    <div class="week-block">
      <h2>Semaine 4</h2>
      
      <div class="seance-block" id="seance-w4s1">
        <input id="sn-w4s1" value="Push" />
        <textarea id="sd-w4s1">Pectoraux, épaules, triceps. Focus contrôle excentrique.</textarea>
        <textarea id="sf-w4s1">3 séries de pompes lestées AMRAP, 60s repos.</textarea>
        
        <div class="exercise-item" id="ex-w4s1e1">
          <input id="en-w4s1e1" value="Développé couché barre" />
          <input id="er-w4s1e1" value="3X4-6" />
          <input id="et-w4s1e1" value="3010" />
          <select id="eri-w4s1e1"><option selected value="1">1</option></select>
          <input id="ers-w4s1e1" value="2'30" />
          <input id="ev-w4s1e1" value="https://youtu.be/vwPhNxREbnc" />
        </div>
        <div class="exercise-item" id="ex-w4s1e2">
          <input id="en-w4s1e2" value="Développé incliné haltères" />
          <input id="er-w4s1e2" value="3X6-8" />
          <input id="et-w4s1e2" value="3010" />
          <select id="eri-w4s1e2"><option selected value="2">2</option></select>
          <input id="ers-w4s1e2" value="2'" />
          <input id="ev-w4s1e2" value="https://youtu.be/WixS_Smh4mw" />
        </div>
        <div class="exercise-item" id="ex-w4s1e3">
          <input id="en-w4s1e3" value="Développé couché prise serrée" />
          <input id="er-w4s1e3" value="3X6-8" />
          <input id="et-w4s1e3" value="3010" />
          <select id="eri-w4s1e3"><option selected value="1">1</option></select>
          <input id="ers-w4s1e3" value="2'" />
          <input id="ev-w4s1e3" value="https://youtu.be/yBhTUtd7lSw" />
        </div>
        <div class="exercise-item" id="ex-w4s1e4">
          <input id="en-w4s1e4" value="Élévations latérales haltères" />
          <input id="er-w4s1e4" value="3X8-10" />
          <input id="et-w4s1e4" value="2010" />
          <select id="eri-w4s1e4"><option selected value="1">1</option></select>
          <input id="ers-w4s1e4" value="1'30" />
          <input id="ev-w4s1e4" value="https://youtu.be/_zbC5RQfkmk" />
        </div>
        <div class="exercise-item" id="ex-w4s1e5">
          <input id="en-w4s1e5" value="Triceps poulie corde" />
          <input id="er-w4s1e5" value="3X8-10" />
          <input id="et-w4s1e5" value="2010" />
          <select id="eri-w4s1e5"><option selected value="0">0</option></select>
          <input id="ers-w4s1e5" value="1'30" />
          <input id="ev-w4s1e5" value="https://youtu.be/G8GYdDkdmUk" />
        </div>
        <div class="exercise-item" id="ex-w4s1e6">
          <input id="en-w4s1e6" value="Extensions verticales haltère" />
          <input id="er-w4s1e6" value="3X8-10" />
          <input id="et-w4s1e6" value="3010" />
          <select id="eri-w4s1e6"><option selected value="1">1</option></select>
          <input id="ers-w4s1e6" value="1'30" />
          <input id="ev-w4s1e6" value="https://youtu.be/tPgqu7J0Q4A" />
        </div>
      </div>
      <div class="seance-block" id="seance-w4s2">
        <input id="sn-w4s2" value="Pull" />
        <textarea id="sd-w4s2">Dos, biceps, deltoïdes postérieurs. Tirages contrôlés.</textarea>
        <textarea id="sf-w4s2">50 face pulls cumulés, le moins de pause possible.</textarea>
        
        <div class="exercise-item" id="ex-w4s2e1">
          <input id="en-w4s2e1" value="Tractions lestées pronation" />
          <input id="er-w4s2e1" value="3X4-6" />
          <input id="et-w4s2e1" value="2010" />
          <select id="eri-w4s2e1"><option selected value="1">1</option></select>
          <input id="ers-w4s2e1" value="2'30" />
          <input id="ev-w4s2e1" value="https://youtu.be/kECazDUDmWA" />
        </div>
        <div class="exercise-item" id="ex-w4s2e2">
          <input id="en-w4s2e2" value="Rowing barre" />
          <input id="er-w4s2e2" value="3X4-6" />
          <input id="et-w4s2e2" value="3010" />
          <select id="eri-w4s2e2"><option selected value="2">2</option></select>
          <input id="ers-w4s2e2" value="2'30" />
          <input id="ev-w4s2e2" value="https://youtu.be/dkbmaZB0krM" />
        </div>
        <div class="exercise-item" id="ex-w4s2e3">
          <input id="en-w4s2e3" value="Tirage poitrine prise neutre" />
          <input id="er-w4s2e3" value="3X6-8" />
          <input id="et-w4s2e3" value="2010" />
          <select id="eri-w4s2e3"><option selected value="1">1</option></select>
          <input id="ers-w4s2e3" value="2'" />
          <input id="ev-w4s2e3" value="https://youtu.be/wQa7GGIfP0M" />
        </div>
        <div class="exercise-item" id="ex-w4s2e4">
          <input id="en-w4s2e4" value="Rowing assis poulie" />
          <input id="er-w4s2e4" value="3X6-8" />
          <input id="et-w4s2e4" value="2010" />
          <select id="eri-w4s2e4"><option selected value="1">1</option></select>
          <input id="ers-w4s2e4" value="1'30" />
          <input id="ev-w4s2e4" value="https://youtu.be/DFM5DniTl1g" />
        </div>
        <div class="exercise-item" id="ex-w4s2e5">
          <input id="en-w4s2e5" value="Face pulls" />
          <input id="er-w4s2e5" value="3X8-10" />
          <input id="et-w4s2e5" value="2010" />
          <select id="eri-w4s2e5"><option selected value="0">0</option></select>
          <input id="ers-w4s2e5" value="1'30" />
          <input id="ev-w4s2e5" value="https://youtu.be/Hg3N4sPDt_E" />
        </div>
        <div class="exercise-item" id="ex-w4s2e6">
          <input id="en-w4s2e6" value="Curl barre EZ" />
          <input id="er-w4s2e6" value="3X6-8" />
          <input id="et-w4s2e6" value="3010" />
          <select id="eri-w4s2e6"><option selected value="1">1</option></select>
          <input id="ers-w4s2e6" value="1'30" />
          <input id="ev-w4s2e6" value="https://youtu.be/RUGpTkGXDiU" />
        </div>
        <div class="exercise-item" id="ex-w4s2e7">
          <input id="en-w4s2e7" value="Curl marteau haltères" />
          <input id="er-w4s2e7" value="3X8-10" />
          <input id="et-w4s2e7" value="3010" />
          <select id="eri-w4s2e7"><option selected value="0">0</option></select>
          <input id="ers-w4s2e7" value="1'30" />
          <input id="ev-w4s2e7" value="https://youtu.be/_2HGonsfTec" />
        </div>
      </div>
      <div class="seance-block" id="seance-w4s3">
        <input id="sn-w4s3" value="Legs" />
        <textarea id="sd-w4s3">Quadriceps, ischios, fessiers, mollets. Poussée maximale.</textarea>
        <textarea id="sf-w4s3">20 squats sautés au poids du corps + 1min de gainage.</textarea>
        
        <div class="exercise-item" id="ex-w4s3e1">
          <input id="en-w4s3e1" value="Squat barre dos" />
          <input id="er-w4s3e1" value="3X4-6" />
          <input id="et-w4s3e1" value="3010" />
          <select id="eri-w4s3e1"><option selected value="1">1</option></select>
          <input id="ers-w4s3e1" value="3'" />
          <input id="ev-w4s3e1" value="https://youtu.be/c-6Fy2UgydA" />
        </div>
        <div class="exercise-item" id="ex-w4s3e2">
          <input id="en-w4s3e2" value="Soulevé de terre roumain" />
          <input id="er-w4s3e2" value="3X4-6" />
          <input id="et-w4s3e2" value="3010" />
          <select id="eri-w4s3e2"><option selected value="2">2</option></select>
          <input id="ers-w4s3e2" value="2'30" />
          <input id="ev-w4s3e2" value="https://youtu.be/TykJQtunfYc" />
        </div>
        <div class="exercise-item" id="ex-w4s3e3">
          <input id="en-w4s3e3" value="Presse à cuisses" />
          <input id="er-w4s3e3" value="3X6-8" />
          <input id="et-w4s3e3" value="2010" />
          <select id="eri-w4s3e3"><option selected value="1">1</option></select>
          <input id="ers-w4s3e3" value="2'" />
          <input id="ev-w4s3e3" value="https://youtu.be/R97EvnlUTYQ" />
        </div>
        <div class="exercise-item" id="ex-w4s3e4">
          <input id="en-w4s3e4" value="Fentes marchées haltères" />
          <input id="er-w4s3e4" value="3X10/jambes" />
          <input id="et-w4s3e4" value="2010" />
          <select id="eri-w4s3e4"><option selected value="1">1</option></select>
          <input id="ers-w4s3e4" value="2'" />
          <input id="ev-w4s3e4" value="https://youtu.be/X9ne2alS1LY" />
        </div>
        <div class="exercise-item" id="ex-w4s3e5">
          <input id="en-w4s3e5" value="Leg curl allongé" />
          <input id="er-w4s3e5" value="3X8-10" />
          <input id="et-w4s3e5" value="3010" />
          <select id="eri-w4s3e5"><option selected value="0">0</option></select>
          <input id="ers-w4s3e5" value="1'30" />
          <input id="ev-w4s3e5" value="https://youtu.be/Vt4Lxn1Tfv4" />
        </div>
        <div class="exercise-item" id="ex-w4s3e6">
          <input id="en-w4s3e6" value="Mollets debout machine" />
          <input id="er-w4s3e6" value="4X15-20" />
          <input id="et-w4s3e6" value="2010" />
          <select id="eri-w4s3e6"><option selected value="0">0</option></select>
          <input id="ers-w4s3e6" value="1'30" />
          <input id="ev-w4s3e6" value="https://youtu.be/fZNu9CBOSik" />
        </div>
      </div>
    </div>
</body></html>$rb$,
  true,
  now() - interval '15 days',
  'demo@rbperform.app',
  now() - interval '20 days',
  now() - interval '15 days',
  (now() - interval '15 days')::date
);

SELECT id, programme_name, is_active, uploaded_at
  FROM public.programmes
 WHERE client_id = '7999fa42-e5e9-4e7d-b4d6-cf2a64373cd2'::uuid
 ORDER BY uploaded_at DESC
 LIMIT 5;
