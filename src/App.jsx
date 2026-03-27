import WelcomeScreen from "./components/WelcomeScreen";
import StreakBadge from "./components/StreakBadge";
import { useHaptic } from "./hooks/useHaptic";
import { useStreak } from "./hooks/useStreak";
import { usePushNotifications } from "./hooks/usePushNotifications";
import SplashScreen from "./components/SplashScreen";
import React, { useState, useRef, useCallback } from "react";
import { parseProgrammeHTML } from "./utils/parserProgramme";
import { useLogs } from "./hooks/useLogs";
import { useAuth } from "./hooks/useAuth";
import { useWeight } from "./hooks/useWeight";
import { ExerciseCard } from "./components/ExerciseCard";
import { WeightTracker } from "./components/WeightChart";
import { SessionReport } from "./components/SessionReport";
import { MessageBanner } from "./components/MessageBanner";
import { RPEModal } from "./components/RPEModal";
import { PrivacyPolicy } from "./components/PrivacyPolicy";
import { MentionsLegales, CGU, DeleteConfirmModal } from "./components/LegalPages";
import { LoginScreen } from "./components/LoginScreen";
import { CoachDashboard } from "./components/CoachDashboard";
import { exportProgressPDF } from "./utils/exportPDF";
import { LOGO_B64 } from "./utils/logo";
import "./App.css";

const GREEN = "#02d1ba";
// ⚠️  Email du coach — seul cet email peut accéder au dashboard admin
const COACH_EMAIL = "rb.performancee@gmail.com"; // ← remplace par ton email

const IconDumbbell = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="10" width="2" height="4" rx="1"/><rect x="17" y="10" width="2" height="4" rx="1"/>
    <line x1="3" y1="11" x2="3" y2="13"/><line x1="2" y1="11" x2="4" y2="11"/><line x1="2" y1="13" x2="4" y2="13"/>
    <line x1="21" y1="11" x2="21" y2="13"/><line x1="20" y1="11" x2="22" y2="11"/><line x1="20" y1="13" x2="22" y2="13"/>
    <line x1="7" y1="12" x2="17" y2="12"/>
  </svg>
);
const IconScale = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <rect x="3" y="15" width="18" height="5" rx="2"/>
    <line x1="12" y1="15" x2="12" y2="9"/>
    <path d="M8 9h8"/>
    <path d="M6 9a6 6 0 0 1 12 0"/>
  </svg>
);

function SessionTab({ session, active, onClick, weekIdx, sessionIdx, getHistory, programme }) {
  let total = 0, done = 0;
  programme?.weeks[weekIdx]?.sessions[sessionIdx]?.exercises.forEach((ex, ei) => {
    total++; if (getHistory(weekIdx, sessionIdx, ei).length > 0) done++;
  });
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <button className={`session-tab ${active ? "active" : ""}`} onClick={onClick}>
      <span>{session.name || `Séance ${sessionIdx + 1}`}</span>
      {total > 0 && <span className="session-tab-pct" style={{ color: pct === 100 ? GREEN : undefined }}>{pct}%</span>}
    </button>
  );
}

export default function App() {
  // Auth
  const {
    user, client, programme: cloudProgramme, loading: authLoading,
    authLoading: sendingLink, error: authError, magicSent,
    sendMagicLink, signOut,
  } = useAuth();

  const isCoach = user?.email === COACH_EMAIL;
  const { requestPermission, permission } = usePushNotifications(client?.id);
  
  // Demander permission push au client après connexion
  React.useEffect(() => {
    if (client?.id && !isCoach && permission === 'default') {
      setTimeout(() => requestPermission(), 2000);
    }
  }, [client?.id, isCoach, permission, requestPermission]);
  const [splashDone, setSplashDone] = React.useState(false);
  const [showCoachDash, setShowCoachDash] = useState(false);

  // Programme (cloud si connecté, sinon local)
  const [localProgramme,  setLocalProgramme]  = useState(null);
  const [activeWeek,      setActiveWeek]      = useState(0);
  const [activeSession,   setActiveSession]   = useState(0);
  const [isDragging,      setIsDragging]      = useState(false);
  const [page,            setPage]            = useState("training");
  const [showReport,      setShowReport]      = useState(false);
  const [exporting,       setExporting]       = useState(false);
  const [showPrivacy,     setShowPrivacy]     = useState(false);
  const [showMentions,    setShowMentions]    = useState(false);
  const [showCGU,         setShowCGU]         = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRPE,         setShowRPE]         = useState(false);

  // Le programme affiché : cloud en priorité, sinon local
  const rawHtml = cloudProgramme || localProgramme;
  const programme = rawHtml ? parseProgrammeHTML(rawHtml) : null;

  const { getHistory, getLatest, saveLog, getDelta } = useLogs(
    client ? `client_${client.id}` : programme?.name
  );
  const { entries, addEntry, removeEntry, getStats } = useWeight();

  const handleLocalImport = useCallback(async (e) => {
    const file = e.target?.files?.[0] || e.dataTransfer?.files?.[0];
    if (!file) return;
    const text = await file.text();
    setLocalProgramme(text);
    setActiveWeek(0); setActiveSession(0); setPage("training");
  }, []);

  const handleDragOver  = e => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop      = e => { e.preventDefault(); setIsDragging(false); handleLocalImport(e); };

  // ── Écran de chargement ──
  if (authLoading) {
    return (
      <div style={{
        minHeight: "100vh", background: "#0d0d0d",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16,
      }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ width: 32, height: 32, border: "2.5px solid #1a1a1a", borderTopColor: GREEN, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <div style={{ fontSize: 12, color: "#555" }}>Chargement...</div>
      </div>
    );
  }

  // ── Pas connecté → Login ──
  if (!user) {
    return (
      <LoginScreen
        onSendMagicLink={sendMagicLink}
        loading={sendingLink}
        error={authError}
        magicSent={magicSent}
      />
    );
  }

  // ── Coach → Dashboard admin ──
  if (isCoach && showCoachDash) {
    return <CoachDashboard onExit={() => setShowCoachDash(false)} />;
  }

  const currentWeek = programme?.weeks[activeWeek];
  const sessions    = currentWeek?.sessions || [];
  const safeIdx     = Math.min(activeSession, Math.max(0, sessions.length - 1));
  const session     = sessions[safeIdx];

  let totalEx = 0, doneEx = 0;
  programme?.weeks.forEach((w, wi) => w.sessions.forEach((s, si) => s.exercises.forEach((ex, ei) => {
    totalEx++; if (getHistory(wi, si, ei).length > 0) doneEx++;
  })));
  const globalPct = totalEx > 0 ? Math.round((doneEx / totalEx) * 100) : 0;

  let sessionDone = 0, sessionTotal = 0;
  session?.exercises.forEach((ex, ei) => {
    sessionTotal++; if (getHistory(activeWeek, safeIdx, ei).length > 0) sessionDone++;
  });
  const sessionComplete = sessionTotal > 0 && sessionDone === sessionTotal;


  const handleDeleteAccount = async () => {
    if (!client) return;
    const clientEmail = client.email;
    const clientName = client.full_name;
    // Supprimer toutes les données
    await supabase.from("weight_logs").delete().eq("client_id", client.id);
    await supabase.from("exercise_logs").delete().eq("client_id", client.id);
    await supabase.from("session_rpe").delete().eq("client_id", client.id);
    await supabase.from("messages").delete().eq("client_id", client.id);
    await supabase.from("programmes").delete().eq("client_id", client.id);
    await supabase.from("clients").delete().eq("id", client.id);
    // Envoyer email de confirmation de suppression
    try {
      await supabase.functions.invoke("send-welcome", {
        body: {
          email: clientEmail,
          full_name: clientName,
          type: "deletion_confirmation",
        },
      });
    } catch (e) { console.warn("Email suppression non envoyé", e); }
    await supabase.auth.signOut();
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try { await exportProgressPDF({ programme, getHistory, entries }); }
    finally { setExporting(false); }
  };

  // ── Écran d'erreur (client sans programme) ──
  const showImportFallback = !cloudProgramme && !localProgramme;

  return (
    <div className="app-root" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes slideUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {showPrivacy && <PrivacyPolicy onClose={() => setShowPrivacy(false)} />}
      {showMentions && <MentionsLegales onClose={() => setShowMentions(false)} />}
      {showCGU && <CGU onClose={() => setShowCGU(false)} />}

      {/* Modal suppression données */}
      {showDeleteConfirm && (
        <DeleteConfirmModal
          onConfirm={() => { setShowDeleteConfirm(false); handleDeleteAccount(); }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      {showReport && session && (
        <SessionReport
          session={session} weekIdx={activeWeek} sessionIdx={safeIdx}
          getHistory={getHistory} onClose={() => setShowReport(false)}
          onExportPDF={handleExportPDF}
        />
      )}

      {/* ── Topbar ── */}
      <header className="topbar">
        <div className="topbar-brand">
          <div className="topbar-logo-img"><img src={LOGO_B64} alt="RB Perform" /></div>
          <span className="topbar-name">RB&nbsp;<span>Performance</span></span>
        </div>
        <div className="topbar-right" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Nom client */}
          {client?.full_name && (
            <span style={{ fontSize: 11, color: "#555", fontWeight: 500 }}>{client.full_name.split(" ")[0]}</span>
          )}
          {/* Bouton coach */}
          {isCoach && (
            <button onClick={() => setShowCoachDash(true)} style={{
              padding: "5px 10px", background: "rgba(2,209,186,0.08)",
              border: "1px solid rgba(2,209,186,0.2)", borderRadius: 7,
              color: GREEN, fontSize: 10.5, fontWeight: 700, cursor: "pointer",
            }}>
              🎛 Coach
            </button>
          )}
          {/* Export PDF */}
          {programme && (
            <button onClick={handleExportPDF} disabled={exporting} style={{
              display: "flex", alignItems: "center", gap: 5, padding: "5px 10px",
              background: "transparent", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 7, color: exporting ? "#555" : "#9ca3af",
              fontSize: 10.5, fontWeight: 600, cursor: exporting ? "not-allowed" : "pointer",
              transition: "all 0.15s", fontFamily: "'Inter',sans-serif",
            }}>
              {exporting ? "..." : (
                <><svg viewBox="0 0 20 20" fill="none" style={{ width: 11, height: 11 }}>
                  <path d="M10 3v10M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="3" y1="16" x2="17" y2="16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>PDF</>
              )}
            </button>
          )}
          {/* Déconnexion */}
          <button onClick={signOut} style={{
            background: "none", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 7, padding: "5px 10px", color: "#555",
            fontSize: 10.5, fontWeight: 600, cursor: "pointer",
          }}>
            Déco
          </button>
        </div>
      </header>

      {/* ── Erreur programme ── */}
      {authError && !programme && (
        <div style={{
          flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", padding: "48px 24px", gap: 12, textAlign: "center",
        }}>
          <div style={{ fontSize: 32 }}>⏳</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#f5f5f5" }}>Programme en cours de préparation</div>
          <div style={{ fontSize: 13, color: "#555", lineHeight: 1.6, maxWidth: 280 }}>{authError}</div>
          <div style={{ fontSize: 11, color: "#444", marginTop: 8 }}>Connecté en tant que : {user.email}</div>
        </div>
      )}

      {/* ── Import local (si pas de cloud) ── */}
      {!authError && showImportFallback && (
        <div className="import-screen">
          <div className={`import-drop-zone ${isDragging ? "dragging" : ""}`} onClick={() => { const i = document.createElement("input"); i.type = "file"; i.accept = ".html"; i.onchange = handleLocalImport; i.click(); }}>
            <div className="import-icon">
              <svg viewBox="0 0 48 48" fill="none">
                <rect x="6" y="4" width="26" height="34" rx="3" stroke="#02d1ba" strokeWidth="1.8"/>
                <path d="M32 4l8 8" stroke="#02d1ba" strokeWidth="1.8" strokeLinecap="round"/>
                <rect x="32" y="4" width="8" height="8" rx="1" stroke="#02d1ba" strokeWidth="1.8"/>
                <line x1="14" y1="16" x2="28" y2="16" stroke="#02d1ba" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
              </svg>
            </div>
            <div className="import-title">Importer un programme</div>
            <div className="import-sub">Fichier .html exporté depuis le builder RB Perform</div>
            <div className="import-cta">Choisir un fichier</div>
          </div>
        </div>
      )}

      {/* ── App principale ── */}
      {programme && !authError && (
        <>
          {page === "training" ? (
            <main className="main">
              {client && <MessageBanner clientId={client.id} />}
              <div className="prog-header">
                <div>
                  <div className="prog-eyebrow">Programme actif</div>
                  <h1 className="prog-name">{programme.name}</h1>
                  {(client?.full_name || programme.clientName) && (
                    <div className="prog-client">{client?.full_name || programme.clientName}</div>
                  )}
                  <div className="prog-meta">
                    <span>{programme.weeks.length} semaine{programme.weeks.length > 1 ? "s" : ""}</span>
                    <span className="dot">·</span>
                    <span>{programme.weeks.reduce((a, w) => a + w.sessions.length, 0)} séances</span>
                    <span className="dot">·</span>
                    <span>{totalEx} exercices</span>
                  </div>
                </div>
                <div className="prog-ring-wrap">
                  <svg className="prog-ring" viewBox="0 0 50 50">
                    <circle cx="25" cy="25" r="20" fill="none" stroke="#1a1a1a" strokeWidth="4"/>
                    <circle cx="25" cy="25" r="20" fill="none" stroke={GREEN} strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 20}`}
                      strokeDashoffset={`${2 * Math.PI * 20 * (1 - globalPct / 100)}`}
                      transform="rotate(-90 25 25)"
                      style={{ transition: "stroke-dashoffset 0.8s ease" }}
                    />
                  </svg>
                  <span className="prog-ring-pct">{globalPct}%</span>
                </div>
              </div>

              <div className="week-nav">
                {programme.weeks.map((w, i) => (
                  <button key={i} className={`week-btn ${activeWeek === i ? "active" : ""}`}
                    onClick={() => { setActiveWeek(i); setActiveSession(0); }}>S{i + 1}</button>
                ))}
              </div>

              {sessions.length > 1 && (
                <div className="session-tabs">
                  {sessions.map((s, j) => (
                    <SessionTab key={j} session={s} active={safeIdx === j}
                      onClick={() => setActiveSession(j)}
                      weekIdx={activeWeek} sessionIdx={j}
                      getHistory={getHistory} programme={programme} />
                  ))}
                </div>
              )}

              {session && (
                <div className="session-content">
                  <div className="session-header">
                    <div>
                      <div className="session-eyebrow">Semaine {activeWeek + 1} · Séance {safeIdx + 1}</div>
                      <h2 className="session-name">{session.name}</h2>
                      {session.description && <p className="session-desc">{session.description}</p>}
                    </div>
                    <div className="session-count">{session.exercises.length}<span>ex</span></div>
                  </div>

                  <div className="exercises-list">
                    {session.exercises.map((ex, k) => (
                      <ExerciseCard key={k} ex={ex}
                        weekIdx={activeWeek} sessionIdx={safeIdx} exIdx={k} globalIndex={k}
                        getHistory={getHistory} getLatest={getLatest} saveLog={saveLog} getDelta={getDelta}
                        nextExName={session.exercises[k + 1]?.name || null}
                      />
                    ))}
                  </div>

                  {session.finisher && (
                    <div className="finisher-block">
                      <div className="finisher-label">⚡ Finisher</div>
                      <div className="finisher-text">{session.finisher}</div>
                    </div>
                  )}

                  <button onClick={() => setShowReport(true)} style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    width: "100%", marginTop: 20, padding: "14px",
                    background: sessionComplete ? GREEN : "rgba(2,209,186,0.08)",
                    border: `1.5px solid ${sessionComplete ? GREEN : "rgba(2,209,186,0.2)"}`,
                    borderRadius: 12,
                    color: sessionComplete ? "#0d0d0d" : GREEN,
                    fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.2s",
                    boxShadow: sessionComplete ? "0 4px 20px rgba(2,209,186,0.3)" : "none",
                    animation: sessionComplete ? "slideUp 0.4s ease" : "none",
                  }}>
                    {sessionComplete ? <>🏆 Séance terminée — Voir le bilan</> : <>📊 Bilan ({sessionDone}/{sessionTotal})</>}
                  </button>
                </div>
              )}
            </main>
          ) : (
            <main className="main" style={{ paddingTop: 8 }}>
              <WeightTracker entries={entries} addEntry={addEntry} removeEntry={removeEntry} getStats={getStats} />
            </main>
          )}

          <nav className="bottom-nav">
            <button className={`nav-tab ${page === "training" ? "active" : ""}`} onClick={() => setPage("training")}>
              <IconDumbbell />Entraînement
            </button>
            <button className={`nav-tab ${page === "weight" ? "active" : ""}`} onClick={() => setPage("weight")}>
              <IconScale />Poids
              {entries.length > 0 && <span style={{ position: "absolute", top: 6, right: "calc(50% - 20px)", width: 6, height: 6, borderRadius: "50%", background: GREEN }} />}
            </button>
          </nav>

      {/* Liens RGPD */}
      <div style={{ textAlign:"center", padding:"8px 0 16px", display:"flex", justifyContent:"center", gap:16, flexWrap:"wrap" }}>
        <button onClick={() => setShowPrivacy(true)} style={{ background:"none", border:"none", fontSize:10, color:"#444", cursor:"pointer", textDecoration:"underline" }}>Confidentialité</button>
        <button onClick={() => setShowMentions(true)} style={{ background:"none", border:"none", fontSize:10, color:"#444", cursor:"pointer", textDecoration:"underline" }}>Mentions légales</button>
        <button onClick={() => setShowCGU(true)} style={{ background:"none", border:"none", fontSize:10, color:"#444", cursor:"pointer", textDecoration:"underline" }}>CGU</button>
        {client && (
          <button onClick={() => setShowDeleteConfirm(true)} style={{ background:"none", border:"none", fontSize:10, color:"#ef4444", cursor:"pointer", textDecoration:"underline" }}>Supprimer mes données</button>
        )}
      </div>
        </>
      )}
    </div>
  );
}
