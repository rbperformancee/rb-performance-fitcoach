import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

const G = "#02d1ba";
const G_DIM = "rgba(2,209,186,0.08)";
const G_BORDER = "rgba(2,209,186,0.2)";
const ANGLES = ["face", "dos", "profil"];
const ANGLE_LABELS = { face: "Face", dos: "Dos", profil: "Profil" };
const ANGLE_ICONS = { face: "👤", dos: "🔄", profil: "↕️" };

async function analyzeWithClaude(imageBase64, angle, prevAnalysis) {
  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageBase64 } },
            { type: "text", text: `Expert morphologie sportive. Analyse photo ${ANGLE_LABELS[angle]}.${prevAnalysis ? " Analyse precedente: " + prevAnalysis : ""} Reponds UNIQUEMENT en JSON: {"posture":"...","points_forts":["..."],"axes_amelioration":["..."],"score_global":7,"evolution":"progression visible","message_coach":"..."}` }
          ]
        }]
      })
    });
    const d = await resp.json();
    return JSON.parse(d.content?.[0]?.text?.replace(/```json|```/g,"").trim() || "{}");
  } catch(e) { return null; }
}

export function MiroirTransformation({ clientId }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCapture, setShowCapture] = useState(false);
  const [currentAngle, setCurrentAngle] = useState(0);
  const [capturedPhotos, setCapturedPhotos] = useState({});
  const [uploading, setUploading] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => { if (clientId) fetchSessions(); }, [clientId]);

  const fetchSessions = async () => {
    setLoading(true);
    const { data } = await supabase.from("transformation_sessions").select("*").eq("client_id", clientId).order("created_at", { ascending: false });
    setSessions(data || []);
    if (data?.length > 0) setSelectedSession(data[0]);
    setLoading(false);
  };

  const startCountdown = (secs = 3) => {
    setCountdown(secs);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setTimeout(() => { fileRef.current?.click(); setCountdown(null); }, 100);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target.result.split(",")[1];
      const angle = ANGLES[currentAngle];
      setCapturedPhotos(prev => ({ ...prev, [angle]: { file, base64, preview: ev.target.result } }));
      if (currentAngle < 2) setCurrentAngle(prev => prev + 1);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const submit = async () => {
    if (Object.keys(capturedPhotos).length < 3) return;
    setUploading(true);
    const photoUrls = {};
    const analyses = {};
    const lastSession = sessions[0];
    for (const angle of ANGLES) {
      const photo = capturedPhotos[angle];
      if (!photo) continue;
      const fileName = clientId + "/" + Date.now() + "_" + angle + ".jpg";
      const { data: up } = await supabase.storage.from("progress-photos").upload(fileName, photo.file, { contentType: "image/jpeg", upsert: true });
      if (up) {
        const { data: u } = supabase.storage.from("progress-photos").getPublicUrl(fileName);
        photoUrls[angle] = u?.publicUrl;
      }
      const prev = lastSession?.analyses?.[angle] ? JSON.stringify(lastSession.analyses[angle]) : null;
      const analysis = await analyzeWithClaude(photo.base64, angle, prev);
      if (analysis) analyses[angle] = analysis;
    }
    const { data: sess } = await supabase.from("transformation_sessions").insert({
      client_id: clientId,
      photos: photoUrls,
      analyses,
      week_number: sessions.length + 1,
    }).select().single();
    if (sess) { setSessions(prev => [sess, ...prev]); setSelectedSession(sess); }
    setShowCapture(false);
    setCapturedPhotos({});
    setCurrentAngle(0);
    setUploading(false);
  };

  if (loading) return <div style={{ padding: 20, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>Chargement...</div>;

  return (
    <div style={{ fontFamily: "-apple-system,Inter,sans-serif", color: "#fff", paddingBottom: 120 }}>
      <div style={{ padding: "0 20px 16px" }}>
        <div style={{ fontSize: 9, color: "rgba(2,209,186,0.55)", letterSpacing: "3px", textTransform: "uppercase", marginBottom: 6 }}>Intelligence Corporelle</div>
        <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-2px", marginBottom: 8 }}>Miroir<span style={{ color: G }}>.</span></div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 16 }}>Analyse IA de ta transformation semaine par semaine</div>
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1, padding: "12px 14px", background: G_DIM, border: "1px solid " + G_BORDER, borderRadius: 14 }}>
            <div style={{ fontSize: 24, fontWeight: 100, color: G }}>{sessions.length}</div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "1px", textTransform: "uppercase" }}>Analyses</div>
          </div>
          <div style={{ flex: 1, padding: "12px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14 }}>
            <div style={{ fontSize: 24, fontWeight: 100 }}>{selectedSession?.analyses?.face?.score_global || "--"}<span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>/10</span></div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "1px", textTransform: "uppercase" }}>Score IA</div>
          </div>
        </div>
        <button onClick={() => { setShowCapture(true); setCurrentAngle(0); setCapturedPhotos({}); }} style={{ width: "100%", padding: 14, background: G, color: "#000", border: "none", borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          + Nouvelle analyse IA
        </button>
      </div>

      {sessions.length > 0 && (
        <div style={{ padding: "0 20px 16px" }}>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 10 }}>Timeline transformation</div>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 4 }}>
            {sessions.map((s, i) => (
              <div key={i} onClick={() => setSelectedSession(s)} style={{ flexShrink: 0, width: 72, cursor: "pointer" }}>
                <div style={{ width: 72, height: 96, borderRadius: 16, overflow: "hidden", border: "2px solid " + (selectedSession?.id === s.id ? G : "rgba(255,255,255,0.08)"), marginBottom: 6, background: "rgba(255,255,255,0.03)", position: "relative" }}>
                  {s.photos?.face ? <img src={s.photos.face} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>👤</div>}
                  {s.analyses?.face?.score_global && <div style={{ position: "absolute", bottom: 4, right: 4, background: "rgba(0,0,0,0.8)", borderRadius: 6, padding: "2px 5px", fontSize: 9, color: G, fontWeight: 700 }}>{s.analyses.face.score_global}/10</div>}
                </div>
                <div style={{ fontSize: 8, color: selectedSession?.id === s.id ? G : "rgba(255,255,255,0.3)", textAlign: "center" }}>S{sessions.length - i}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedSession && (
        <div style={{ padding: "0 20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
            {ANGLES.map(angle => (
              <div key={angle} style={{ borderRadius: 16, overflow: "hidden", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", aspectRatio: "3/4", position: "relative" }}>
                {selectedSession.photos?.[angle] ? <img src={selectedSession.photos[angle]} alt={angle} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>{ANGLE_ICONS[angle]}</div>}
                <div style={{ position: "absolute", bottom: 6, left: 0, right: 0, textAlign: "center" }}>
                  <span style={{ background: "rgba(0,0,0,0.7)", borderRadius: 6, padding: "3px 8px", fontSize: 9, color: "rgba(255,255,255,0.7)", textTransform: "uppercase" }}>{ANGLE_LABELS[angle]}</span>
                </div>
              </div>
            ))}
          </div>

          {selectedSession.analyses?.face && (
            <div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 10 }}>Analyse IA</div>
              {selectedSession.analyses.face.message_coach && (
                <div style={{ padding: "14px 16px", background: G_DIM, border: "1px solid " + G_BORDER, borderRadius: 16, marginBottom: 12 }}>
                  <div style={{ fontSize: 9, color: "rgba(2,209,186,0.5)", letterSpacing: "2px", marginBottom: 6 }}>MESSAGE IA</div>
                  <div style={{ fontSize: 14, color: "#fff", fontStyle: "italic", lineHeight: 1.5 }}>"{selectedSession.analyses.face.message_coach}"</div>
                </div>
              )}
              {ANGLES.map(angle => {
                const a = selectedSession.analyses?.[angle];
                if (!a) return null;
                return (
                  <div key={angle} style={{ padding: "14px 16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>{ANGLE_LABELS[angle]}</div>
                      {a.score_global && <div style={{ fontSize: 11, color: G, fontWeight: 700 }}>{a.score_global}/10</div>}
                    </div>
                    {a.posture && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 8, lineHeight: 1.4 }}>{a.posture}</div>}
                    {a.points_forts?.map((p, i) => <div key={i} style={{ fontSize: 11, color: G, marginBottom: 3 }}>✓ {p}</div>)}
                    {a.axes_amelioration?.map((p, i) => <div key={i} style={{ fontSize: 11, color: "rgba(251,191,36,0.8)", marginBottom: 3 }}>→ {p}</div>)}
                    {a.evolution && a.evolution !== "baseline" && <div style={{ marginTop: 8, fontSize: 10, color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>Evolution: {a.evolution}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {showCapture && (
        <div style={{ position: "fixed", inset: 0, background: "#050505", zIndex: 500, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "20px 20px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 9, color: "rgba(2,209,186,0.55)", letterSpacing: "3px", textTransform: "uppercase" }}>Nouvelle analyse</div>
              <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-1px" }}>Photos 3 angles</div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button onClick={() => startCountdown(3)} style={{ background: "rgba(2,209,186,0.1)", border: "1px solid rgba(2,209,186,0.2)", borderRadius: 100, padding: "8px 14px", color: "#02d1ba", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>⏱ 3s</button>
              <button onClick={() => setShowCapture(false)} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "50%", width: 36, height: 36, color: "rgba(255,255,255,0.4)", fontSize: 16, cursor: "pointer" }}>✕</button>
            </div>
          </div>

          <div style={{ padding: "16px 20px" }}>
            <div style={{ display: "flex", gap: 8 }}>
              {ANGLES.map((angle, i) => (
                <div key={angle} onClick={() => setCurrentAngle(i)} style={{ flex: 1, padding: "10px 6px", borderRadius: 14, textAlign: "center", cursor: "pointer", background: capturedPhotos[angle] ? G_DIM : i === currentAngle ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)", border: "1.5px solid " + (capturedPhotos[angle] ? G : i === currentAngle ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.05)") }}>
                  {capturedPhotos[angle] ? <div style={{ width: 36, height: 36, borderRadius: 10, overflow: "hidden", margin: "0 auto 4px" }}><img src={capturedPhotos[angle].preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div> : <div style={{ fontSize: 22, marginBottom: 4 }}>{ANGLE_ICONS[angle]}</div>}
                  <div style={{ fontSize: 9, color: capturedPhotos[angle] ? G : i === currentAngle ? "#fff" : "rgba(255,255,255,0.3)", textTransform: "uppercase" }}>{capturedPhotos[angle] ? "✓" : ANGLE_LABELS[angle]}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, padding: "0 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            {capturedPhotos[ANGLES[currentAngle]] ? (
              <div style={{ width: "100%", maxWidth: 260, aspectRatio: "3/4", borderRadius: 20, overflow: "hidden", position: "relative" }}>
                <img src={capturedPhotos[ANGLES[currentAngle]].preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <button onClick={() => setCapturedPhotos(prev => { const n = {...prev}; delete n[ANGLES[currentAngle]]; return n; })} style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%", width: 30, height: 30, color: "#fff", cursor: "pointer" }}>✕</button>
              </div>
            ) : (
              <div onClick={() => fileRef.current?.click()} style={{ width: "100%", maxWidth: 260, aspectRatio: "3/4", borderRadius: 20, background: "rgba(255,255,255,0.02)", border: "2px dashed rgba(255,255,255,0.1)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", gap: 12 }}>
                <div style={{ fontSize: 48 }}>{ANGLE_ICONS[ANGLES[currentAngle]]}</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Photo {ANGLE_LABELS[ANGLES[currentAngle]]}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textAlign: "center", lineHeight: 1.5, padding: "0 20px" }}>
                  {currentAngle === 0 && "Face a l objectif, bras le long du corps"}
                  {currentAngle === 1 && "Tourne-toi completement, dos a l objectif"}
                  {currentAngle === 2 && "Vue de profil, bras le long du corps"}
                </div>
                <div style={{ padding: "10px 20px", background: G, borderRadius: 100, fontSize: 13, fontWeight: 700, color: "#000" }}>Prendre la photo</div>
              </div>
            )}
          </div>

          <div style={{ padding: "16px 20px calc(env(safe-area-inset-bottom,0px) + 20px)" }}>
            {Object.keys(capturedPhotos).length === 3 ? (
              <button onClick={submit} disabled={uploading} style={{ width: "100%", padding: 16, background: uploading ? "rgba(2,209,186,0.3)" : G, color: "#000", border: "none", borderRadius: 16, fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
                {uploading ? "Analyse IA en cours... 🧠" : "Lancer l analyse IA"}
              </button>
            ) : (
              <button onClick={() => fileRef.current?.click()} style={{ width: "100%", padding: 16, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", borderRadius: 16, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                📷 Prendre la photo
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFile} style={{ display: "none" }} />

          {/* OVERLAY COUNTDOWN */}
          {countdown !== null && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
              <div style={{ fontSize: 120, fontWeight: 100, color: "#02d1ba", letterSpacing: "-8px", lineHeight: 1, animation: "pulse 1s ease infinite" }}>
                {countdown}
              </div>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", letterSpacing: "3px", textTransform: "uppercase", marginTop: 16 }}>
                Prépare-toi...
              </div>
              <style>{`@keyframes pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.1);opacity:0.8} }`}</style>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
