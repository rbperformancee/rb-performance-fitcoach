/**
 * Test que le parser lit correctement un export du builder v2.
 * Reproduit la structure exacte produite par exportHTML() du builder
 * (cf. ~/Downloads/programme_v2.html lignes 895-922) :
 *  - inputs : setAttribute("value", el.value)
 *  - textareas : textContent = el.value
 *  - selects : setAttribute("selected", "selected") sur option[value=...]
 */

import { parseProgrammeHTML } from "./parserProgramme";

const v2Export = `
<!DOCTYPE html>
<html lang="fr">
<body>
  <input type="text" id="prog-name" value="Hypertrophie 12 semaines" />
  <input type="text" id="client-name" value="Lucas Martin" />
  <input type="text" id="prog-duration" value="12 semaines" />
  <input type="text" id="prog-tagline" value="Phase volume" />
  <input type="text" id="prog-obj" value="prise-de-masse" />

  <div class="week-block" id="week-w1">
    <div class="seance-block" id="seance-s1">
      <input id="sn-s1" value="Push Day" />
      <input id="sd-s1" value="Pectoraux et triceps" />
      <textarea id="sf-s1">Burpees 30 sec</textarea>

      <div class="exercise-item" id="ex-e1">
        <input id="en-e1" value="Developpe couche" />
        <input id="er-e1" value="4X8-10" />
        <input id="et-e1" value="3010" />
        <select id="eri-e1">
          <option value="—">—</option>
          <option value="1" selected="selected">1</option>
          <option value="2">2</option>
        </select>
        <input id="ers-e1" value="2 min" />
        <input id="eg-e1" value="A" />
        <select id="egt-e1">
          <option value="" selected="selected">Isolé</option>
          <option value="Superset">Superset</option>
        </select>
        <input id="ev-e1" value="https://youtube.com/watch?v=abc" />
        <input id="eth-e1" value="https://img.youtube.com/vi/abc/hqdefault.jpg" />
      </div>

      <div class="exercise-item" id="ex-e2">
        <input id="en-e2" value="Pompes lestees" />
        <input id="er-e2" value="3X AMRAP" />
        <select id="eri-e2"><option value="—" selected="selected">—</option></select>
        <select id="egt-e2"><option value="" selected="selected">Isolé</option></select>
      </div>
    </div>

    <div class="seance-block" id="seance-s2">
      <input id="sn-s2" value="Pull Day" />
      <div class="exercise-item" id="ex-e3">
        <input id="en-e3" value="Tractions" />
        <input id="er-e3" value="5X5" />
      </div>
    </div>
  </div>
</body>
</html>
`;

describe("parserProgramme — compat builder v2", () => {
  const result = parseProgrammeHTML(v2Export);

  test("metadata extraites correctement", () => {
    expect(result.name).toBe("Hypertrophie 12 semaines");
    expect(result.clientName).toBe("Lucas Martin");
    expect(result.duration).toBe("12 semaines");
    expect(result.tagline).toBe("Phase volume");
    expect(result.objective).toBe("prise-de-masse");
  });

  test("totaux corrects", () => {
    expect(result.totalWeeks).toBe(1);
    expect(result.totalSessions).toBe(2);
    expect(result.weeks).toHaveLength(1);
    expect(result.weeks[0].sessions).toHaveLength(2);
  });

  test("seance avec 2 exercices", () => {
    const session = result.weeks[0].sessions[0];
    expect(session.name).toBe("Push Day");
    expect(session.description).toBe("Pectoraux et triceps");
    expect(session.finisher).toBe("Burpees 30 sec");
    expect(session.exercises).toHaveLength(2);
  });

  test("exercice avec tous les champs (RIR, group, video, thumb)", () => {
    const ex1 = result.weeks[0].sessions[0].exercises[0];
    expect(ex1).toMatchObject({
      name: "Developpe couche",
      sets: 4,
      reps: "8-10",
      rawReps: "4X8-10",
      tempo: "3010",
      rir: "1",
      rest: "2 min",
      group: "A",
      groupType: null,
      vidUrl: "https://youtube.com/watch?v=abc",
      thumbUrl: "https://img.youtube.com/vi/abc/hqdefault.jpg",
    });
  });

  test("exercice minimal (sans RIR, sans tempo)", () => {
    const ex2 = result.weeks[0].sessions[0].exercises[1];
    expect(ex2.name).toBe("Pompes lestees");
    expect(ex2.sets).toBe(3);
    expect(ex2.reps).toBe("AMRAP");
    expect(ex2.rir).toBeNull();
    expect(ex2.tempo).toBeNull();
  });

  test("seance suivante avec 1 seul exercice", () => {
    const session2 = result.weeks[0].sessions[1];
    expect(session2.name).toBe("Pull Day");
    expect(session2.exercises).toHaveLength(1);
    expect(session2.exercises[0].name).toBe("Tractions");
  });
});

describe("parserProgramme — runs prescrits + finisher", () => {
  const html = `
    <html><body>
      <input id="prog-name" value="Plan cardio" />
      <div class="week-block">
        <div class="seance-block" id="seance-s1">
          <input id="sn-s1" value="Cardio + finisher" />
          <textarea id="sf-s1">AMRAP 5min : 10 burpees + 15 swings</textarea>

          <div class="exercise-item" id="ex-e1">
            <input id="en-e1" value="Echauffement bike" />
            <input id="er-e1" value="1X10 min" />
          </div>

          <div class="run-item" id="run-r1">
            <input id="rn-r1" value="Endurance fondamentale" />
            <input id="rd-r1" value="5 km" />
            <input id="rdu-r1" value="30 min" />
            <input id="rbpm-r1" value="130-150" />
            <input id="rrs-r1" value="2 min" />
          </div>

          <div class="run-item" id="run-r2">
            <input id="rn-r2" value="Fractionne 30/30" />
            <input id="rdu-r2" value="20 min" />
          </div>
        </div>

        <div class="seance-block" id="seance-s2">
          <input id="sn-s2" value="Run pure (sans muscu)" />
          <div class="run-item" id="run-r3">
            <input id="rn-r3" value="Footing recup" />
            <input id="rdu-r3" value="40 min" />
            <input id="rbpm-r3" value="<140" />
          </div>
        </div>
      </div>
    </body></html>
  `;
  const result = parseProgrammeHTML(html);

  test("session avec runs + finisher est gardee meme avec 1 seul exo", () => {
    expect(result.totalSessions).toBe(2);
  });

  test("finisher est lu correctement (textarea)", () => {
    expect(result.weeks[0].sessions[0].finisher).toBe("AMRAP 5min : 10 burpees + 15 swings");
  });

  test("runs[] contient tous les runs prescrits", () => {
    const session = result.weeks[0].sessions[0];
    expect(session.runs).toHaveLength(2);
  });

  test("run avec tous les champs", () => {
    const run = result.weeks[0].sessions[0].runs[0];
    expect(run).toEqual({
      name: "Endurance fondamentale",
      distance: "5 km",
      duration: "30 min",
      bpm: "130-150",
      rest: "2 min",
    });
  });

  test("run avec champs partiels (que durée)", () => {
    const run = result.weeks[0].sessions[0].runs[1];
    expect(run.name).toBe("Fractionne 30/30");
    expect(run.duration).toBe("20 min");
    expect(run.distance).toBeNull();
    expect(run.bpm).toBeNull();
    expect(run.rest).toBeNull();
  });

  test("session pure run (sans exercise muscu) est gardee", () => {
    const session2 = result.weeks[0].sessions[1];
    expect(session2.name).toBe("Run pure (sans muscu)");
    expect(session2.exercises).toHaveLength(0);
    expect(session2.runs).toHaveLength(1);
    expect(session2.runs[0].name).toBe("Footing recup");
  });
});
