import { parseReps, parseProgrammeHTML } from "./parserProgramme";

describe("parseReps", () => {
  test("format complet '4X8-10'", () => {
    expect(parseReps("4X8-10")).toEqual({ sets: 4, reps: "8-10", rawReps: "4X8-10" });
  });

  test("format minuscule '4x8-10'", () => {
    expect(parseReps("4x8-10")).toEqual({ sets: 4, reps: "8-10", rawReps: "4x8-10" });
  });

  test("format unicode '4×8-10'", () => {
    expect(parseReps("4×8-10")).toEqual({ sets: 4, reps: "8-10", rawReps: "4×8-10" });
  });

  test("format reps seul '8-10'", () => {
    expect(parseReps("8-10")).toEqual({ sets: null, reps: "8-10", rawReps: "8-10" });
  });

  test("format unique '8'", () => {
    expect(parseReps("8")).toEqual({ sets: null, reps: "8", rawReps: "8" });
  });

  test("avec espaces '4 X 8-10'", () => {
    expect(parseReps("4 X 8-10")).toEqual({ sets: 4, reps: "8-10", rawReps: "4 X 8-10" });
  });

  test("chaine vide", () => {
    expect(parseReps("")).toEqual({ sets: null, reps: null, rawReps: null });
  });

  test("placeholder em-dash", () => {
    expect(parseReps("—")).toEqual({ sets: null, reps: null, rawReps: null });
  });

  test("null", () => {
    expect(parseReps(null)).toEqual({ sets: null, reps: null, rawReps: null });
  });

  test("undefined", () => {
    expect(parseReps(undefined)).toEqual({ sets: null, reps: null, rawReps: null });
  });

  test("reps avec mot 'AMRAP'", () => {
    expect(parseReps("3X AMRAP")).toEqual({ sets: 3, reps: "AMRAP", rawReps: "3X AMRAP" });
  });

  test("reps en plage longue '5X12-15'", () => {
    expect(parseReps("5X12-15")).toEqual({ sets: 5, reps: "12-15", rawReps: "5X12-15" });
  });
});

describe("parseProgrammeHTML — smoke test", () => {
  test("HTML vide → structure de base avec defaults", () => {
    const result = parseProgrammeHTML("<html><body></body></html>");
    expect(result).toMatchObject({
      name: "Programme",
      clientName: "",
      duration: "",
      tagline: "",
      objective: "",
      weeks: [],
      totalWeeks: 0,
      totalSessions: 0,
    });
  });

  test("HTML avec metadonnees → champs extraits", () => {
    const html = `
      <html><body>
        <input id="prog-name" value="Hypertrophie Q1" />
        <input id="client-name" value="Lucas" />
        <input id="prog-duration" value="12" />
        <input id="prog-tagline" value="Phase volume" />
        <input id="prog-obj" value="prise-de-masse" />
      </body></html>
    `;
    const result = parseProgrammeHTML(html);
    expect(result.name).toBe("Hypertrophie Q1");
    expect(result.clientName).toBe("Lucas");
    expect(result.duration).toBe("12");
    expect(result.tagline).toBe("Phase volume");
    expect(result.objective).toBe("prise-de-masse");
  });

  test("seance/semaine vides sont filtrees (parser exige au moins 1 exercice nomme)", () => {
    const html = `
      <html><body>
        <div class="week-block">
          <div class="seance-block" id="seance-abc"></div>
        </div>
      </body></html>
    `;
    const result = parseProgrammeHTML(html);
    expect(result.totalWeeks).toBe(0);
    expect(result.totalSessions).toBe(0);
  });

  test("HTML avec 1 semaine + 1 seance + 1 exercice → totaux et parseReps correct", () => {
    const html = `
      <html><body>
        <div class="week-block">
          <div class="seance-block" id="seance-s1">
            <input id="sn-s1" value="Push day" />
            <div class="exercise-item" id="ex-e1">
              <input id="en-e1" value="Bench press" />
              <input id="er-e1" value="4X8-10" />
            </div>
          </div>
        </div>
      </body></html>
    `;
    const result = parseProgrammeHTML(html);
    expect(result.totalWeeks).toBe(1);
    expect(result.totalSessions).toBe(1);
    expect(result.weeks[0].sessions[0].name).toBe("Push day");
    expect(result.weeks[0].sessions[0].exercises[0]).toMatchObject({
      name: "Bench press",
      sets: 4,
      reps: "8-10",
      rawReps: "4X8-10",
    });
  });
});
