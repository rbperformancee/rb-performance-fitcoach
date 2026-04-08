import React, { useState, useRef, useCallback, useMemo } from "react";
import { useInactivityAlerts } from "./hooks/useInactivityAlerts";
import { BadgeSystem } from "./components/BadgeSystem";
import { ToastProvider, toast } from "./components/Toast";
import ProfilePage from "./components/ProfilePage";
import FuelPage from "./components/FuelPage";
import MovePage from "./components/MovePage";
import { useAppData } from "./hooks/useAppData";
import { SeanceVivante } from "./components/SeanceVivante";
import TrainingPage from "./components/TrainingPage";

function SkeletonLoader() {
  return (
    <div style={{ padding: '16px', animation: 'fadeInUp 0.3s ease' }}>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="skeleton skeleton-card" style={{ animationDelay: `${i * 0.05}s` }} />
      ))}
    </div>
  );
}
import SessionTimer from "./components/SessionTimer";
import OnboardingFlow from "./components/OnboardingFlow";
import AvatarPicker from "./components/AvatarPicker";
import GoalWidget from "./components/GoalWidget";
import { useTheme } from "./hooks/useTheme";
import ActivityWidget from "./components/ActivityWidget";
import WelcomeScreen from "./components/WelcomeScreen";
import StreakBadge from "./components/StreakBadge";
import { useHaptic } from "./hooks/useHaptic";
import { useStreak } from "./hooks/useStreak";
import { usePushNotifications } from "./hooks/usePushNotifications";
import SplashScreen from "./components/SplashScreen";

import { parseProgrammeHTML } from "./utils/parserProgramme";
import { useLogs } from "./hooks/useLogs";
import { useAuth } from "./hooks/useAuth";
import { ExerciseCard } from "./components/ExerciseCard";
import WeightChart from "./components/WeightChart";
import { SessionReport } from "./components/SessionReport";
import { MessageBanner } from "./components/MessageBanner";
import { RPEModal } from "./components/RPEModal";
import { PrivacyPolicy } from "./components/PrivacyPolicy";
import { MentionsLegales, CGU, DeleteConfirmModal } from "./components/LegalPages";
import { LoginScreen } from "./components/LoginScreen";
import PricingPage from "./components/PricingPage";
import { CoachDashboard } from "./components/CoachDashboard";
import { exportProgressPDF } from "./utils/exportPDF";
import "./App.css";
import { supabase } from "./lib/supabase";

const GREEN = "#02d1ba";
// ⚠️  Email du coach — seul cet email peut accéder au dashboard admin
const COACH_EMAIL = 'rb.performancee@gmail.com';

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
  const [showLogin, setShowLogin] = React.useState(false);
  const { requestPermission, permission } = usePushNotifications(client?.id);
  
  // Demander permission push au client après connexion
  React.useEffect(() => {
    if (client?.id && !isCoach && permission === 'default') {
      setTimeout(() => requestPermission(), 2000);
    }
  }, [client?.id, isCoach, permission, requestPermission]);
  const [splashDone, setSplashDone] = React.useState(false);
  const [showCoachDash, setShowCoachDash] = useState(true);

  // Programme (cloud si connecté, sinon local)
  const [localProgramme,  setLocalProgramme]  = useState(null);
  const [activeWeek,      setActiveWeek]      = useState(0);
  const [activeSession,   setActiveSession]   = useState(0);
  const [isDragging,      setIsDragging]      = useState(false);
  const [page, setPage] = useState("training");
  const [prevPage, setPrevPage] = useState(null);
  const [slideDir, setSlideDir] = useState("right");
  // page peut etre: training, weight, move, fuel, profile
  const PAGE_ORDER = ["training", "weight", "move", "fuel", "profile"];
  const navigateTo = (newPage) => {
    const oldIdx = PAGE_ORDER.indexOf(page);
    const newIdx = PAGE_ORDER.indexOf(newPage);
    setSlideDir(newIdx > oldIdx ? "right" : "left");
    setPrevPage(page);
    setPage(newPage);
  };
  const [showReport,      setShowReport]      = useState(false);
  const [exporting,       setExporting]       = useState(false);
  const [showPrivacy,     setShowPrivacy]     = useState(false);
  const [showMentions,    setShowMentions]    = useState(false);
  const [showCGU,         setShowCGU]         = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showHome, setShowHome] = useState(true);
  const [navVisible, setNavVisible] = useState(true);
  const lastScrollY = React.useRef(0);
  const [_sessionsDone, setSessionsDone] = React.useState(0);
  const appData = useAppData(client?.id);
  const [_todayDone, setTodayDone] = React.useState(false);
  const [_daysSinceLast, setDaysSinceLast] = React.useState(null);

  React.useEffect(() => {
    if (!client?.id) return;
    supabase.from('session_logs').select('logged_at', { count: 'exact' }).eq('client_id', client.id).order('logged_at', { ascending: false }).limit(1).then(({ count, data }) => {
      setSessionsDone(count || 0);
      if (data?.length > 0) {
        const last = new Date(data[0].logged_at);
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const lastStr = last.toISOString().split('T')[0];
        setTodayDone(lastStr === todayStr);
        const diff = Math.floor((today - last) / 86400000);
        setDaysSinceLast(diff);
      }
    });
  }, [client?.id]);

  React.useEffect(() => {
    if (showHome) { setNavVisible(true); return; }
    const onScroll = () => {
      const y = window.scrollY;
      if (y > lastScrollY.current + 8) setNavVisible(false);
      else if (y < lastScrollY.current - 8) setNavVisible(true);
      lastScrollY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [showHome]);
  const [showRPE,         setShowRPE]         = useState(false);

  // Le programme affiché : cloud en priorité, sinon local
  const rawHtml = cloudProgramme || localProgramme;
  const programme = useMemo(() => rawHtml ? parseProgrammeHTML(rawHtml) : null, [rawHtml]);

  const { getHistory, getLatest, saveLog, getDelta } = useLogs(
    client ? `client_${client.id}` : programme?.name
  );

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

  // ── Pas connecté → Pricing ou Login ──
  if (!user) {
    if (showLogin) {
      return <LoginScreen />;
    }
    return (
      <div style={{ position: 'relative' }}>
        <PricingPage client={null} onLogin={() => setShowLogin(true)} />
  
      </div>
    );
  }

  // ── Coach → Dashboard admin ──
  if (showHome && !isCoach) {
    const _h = new Date().getHours();
    const _g = _h < 12 ? 'Bonjour' : _h < 18 ? 'Bon apres-midi' : 'Bonsoir';
    const _fn = client?.full_name?.split(' ')[0] || 'Athlete';
    const _quotes = [
      "LA DOULEUR D AUJOURD HUI EST LA FORCE DE DEMAIN.",
      "LES CHAMPIONS NE NAISSENT PAS. ILS SE CONSTRUISENT.",
      "ZERO EXCUSE. MAXIMUM RESULTAT.",
      "UN JOUR TU SERAS CONTENT D AVOIR CONTINUE.",
      "LA DISCIPLINE C EST LA LIBERTE.",
      "CHAQUE REP TE RAPPROCHE DE QUI TU VEUX ETRE.",
      "LE CORPS ACCOMPLIT CE QUE L ESPRIT CROIT POSSIBLE.",
    ];
    const _q = _quotes[new Date().getDay() % _quotes.length];
    const _tw = programme?.weeks?.length || 0;
    const _ts = programme?.weeks?.reduce((a,w) => a+(w.sessions?.length||0), 0) || 0;
    const _now = new Date();
    const _time = String(_now.getHours()).padStart(2,'0') + ':' + String(_now.getMinutes()).padStart(2,'0');
    const _days = ['DIM','LUN','MAR','MER','JEU','VEN','SAM'];
    const _months = ['JAN','FEV','MAR','AVR','MAI','JUN','JUL','AOU','SEP','OCT','NOV','DEC'];
    const _dash = 2 * Math.PI * 40;
    const _pct = _ts > 0 ? Math.min(Math.round((_sessionsDone / _ts) * 100), 100) : 0;
    
    // Message contextuel selon heure + historique
    const getContextMsg = () => {
      if (_todayDone) return { title: "Bien joue aujourd hui.", sub: "Recupere bien. Tu repars demain plus fort.", color: "#02d1ba" };
      if (_daysSinceLast === 1) return { title: "C est l heure.", sub: "Ta seance t attend. Lance-toi.", color: "#fff" };
      if (_daysSinceLast >= 2) return { title: `${_daysSinceLast} jours sans seance.`, sub: "Le travail n attend pas. Maintenant.", color: "#f97316" };
      if (_h < 12) return { title: "Bonjour.", sub: "Commence fort. La journee t appartient.", color: "#fff" };
      if (_h < 17) return { title: "L apres-midi est la.", sub: "Pas d excuse. La seance, maintenant.", color: "#fff" };
      return { title: "Derniere chance.", sub: "Tu la saisis ou tu la laisses passer.", color: "#f97316" };
    };
    const _ctx = getContextMsg();
    return (
      <div style={{minHeight:'100vh',background:'#050505',display:'flex',flexDirection:'column',fontFamily:'-apple-system,Inter,sans-serif',position:'relative',overflow:'hidden'}}>

        {/* Particules d'ambiance */}
        <div style={{position:'absolute',top:0,left:0,right:0,height:'60%',background:'radial-gradient(ellipse at 50% -10%, rgba(2,209,186,0.15) 0%, transparent 60%)',pointerEvents:'none'}}/>
        <div style={{position:'absolute',bottom:0,left:0,right:0,height:'40%',background:'radial-gradient(ellipse at 50% 120%, rgba(2,209,186,0.06) 0%, transparent 60%)',pointerEvents:'none'}}/>

        {/* TOP BAR — date + heure Tesla style */}
        <div style={{padding:'52px 28px 0',display:'flex',justifyContent:'space-between',alignItems:'flex-start',position:'relative',zIndex:2}}>
          <div>
            <div style={{fontSize:10,color:'rgba(255,255,255,0.2)',fontWeight:600,letterSpacing:'3px',textTransform:'uppercase',marginBottom:12}}>{_days[_now.getDay()]} · {_now.getDate()} {_months[_now.getMonth()]}</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,0.25)',fontWeight:400,letterSpacing:'1px',marginBottom:6}}>{_g}</div>
            <div style={{fontSize:44,fontWeight:800,color:'#ffffff',letterSpacing:'-2px',lineHeight:1}}>{_fn}<span style={{color:'#02d1ba'}}>.</span></div>
          </div>

          {/* Anneau Tesla + heure Apple */}
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:38,fontWeight:100,color:'rgba(255,255,255,0.8)',letterSpacing:'-2px',fontVariantNumeric:'tabular-nums',lineHeight:1}}>{_time}</div>
            <div style={{display:'flex',justifyContent:'flex-end',marginTop:12}}>
              <div style={{position:'relative',width:52,height:52}}>
                <svg width="52" height="52" viewBox="0 0 100 100" style={{transform:'rotate(-90deg)'}}>
                  <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8"/>
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#02d1ba" strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={_dash} strokeDashoffset={_dash * (1 - _pct / 100)}
                    style={{filter:'drop-shadow(0 0 6px rgba(2,209,186,0.8))'}}/>
                </svg>
                <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'#02d1ba'}}>{_pct}%</div>
              </div>
            </div>
          </div>
        </div>

        {/* CITATION NIKE — le wow factor */}
        <div style={{padding:'36px 28px 0',position:'relative',zIndex:2}}>
          <div style={{fontSize:11,color:'rgba(2,209,186,0.5)',fontWeight:700,letterSpacing:'4px',textTransform:'uppercase',marginBottom:16}}>Citation du jour</div>
          <div style={{fontSize:22,fontWeight:900,color:'rgba(255,255,255,0.92)',lineHeight:1.35,letterSpacing:'-0.3px'}}>
            {_q.split(' ').map((word, i) => (
              <span key={i} style={{
                color: i === 0 ? '#02d1ba' : 'rgba(255,255,255,0.9)',
                marginRight: '6px',
                display: 'inline-block'
              }}>{word}</span>
            ))}
          </div>
        </div>

        {/* DIVIDER */}
        <div style={{margin:'28px 28px 0',height:'1px',background:'linear-gradient(90deg, rgba(2,209,186,0.3) 0%, rgba(255,255,255,0.05) 100%)',position:'relative',zIndex:2}}/>

        {/* PROGRAMME — Tesla dashboard */}
        {programme && (
          <div style={{padding:'24px 28px 0',position:'relative',zIndex:2}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
              <div style={{fontSize:10,color:'rgba(255,255,255,0.2)',fontWeight:600,letterSpacing:'3px',textTransform:'uppercase'}}>Programme actif</div>
              <div style={{display:'flex',gap:6}}>
                <span style={{fontSize:10,color:'rgba(2,209,186,0.7)',background:'rgba(2,209,186,0.1)',border:'1px solid rgba(2,209,186,0.2)',borderRadius:20,padding:'3px 10px',fontWeight:600}}>{_tw} SEM.</span>
                <span style={{fontSize:10,color:'rgba(255,255,255,0.3)',background:'rgba(255,255,255,0.05)',borderRadius:20,padding:'3px 10px',fontWeight:600}}>{_ts} SÉANCES</span>
              </div>
            </div>
            <div style={{fontSize:30,fontWeight:800,color:'#fff',letterSpacing:'-1px'}}>{programme.name}</div>
            {/* Barre progression */}
            <div style={{marginTop:14,height:2,background:'rgba(255,255,255,0.06)',borderRadius:1}}>
              <div style={{height:'100%',width:_pct+'%',minWidth:'2%',background:'#02d1ba',borderRadius:1,boxShadow:'0 0 12px rgba(2,209,186,0.6)',transition:'width 1s ease'}}/>
            </div>
          </div>
        )}

        {/* STATS — Tesla data */}
        <div style={{padding:'24px 28px 0',display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,position:'relative',zIndex:2}}>
          {[
            {label:'Séances',value:_ts,unit:'total',color:'#02d1ba'},
            {label:'Semaines',value:_tw,unit:'programme',color:'rgba(255,255,255,0.5)'},
            {label:'Exercices',value:0,unit:'validés',color:'rgba(255,255,255,0.5)'},
          ].map((s,i)=>(
            <div key={i} style={{borderTop:'1px solid rgba(255,255,255,0.06)',paddingTop:14}}>
              <div style={{fontSize:32,fontWeight:200,color:s.color,letterSpacing:'-1.5px',lineHeight:1}}>{s.value}</div>
              <div style={{fontSize:9,color:'rgba(255,255,255,0.2)',fontWeight:600,letterSpacing:'2px',textTransform:'uppercase',marginTop:6}}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{flex:1,minHeight:20}}/>

        {/* CTA — Apple meets Nike */}
        
        <nav style={{position:'fixed',bottom:'calc(env(safe-area-inset-bottom, 0px) + 28px)',left:'50%',transform:'translateX(-50%)',display:'flex',gap:0,background:'rgba(15,15,15,0.75)',border:'1px solid rgba(255,255,255,0.09)',borderRadius:100,padding:5,zIndex:100,backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)'}}>
          {[
            {id:'training',icon:<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' style={{width:20,height:20}}><path d='M6 4v16M18 4v16M2 12h4M18 12h4M6 8h12M6 16h12'/></svg>},
            {id:'weight',icon:<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round' style={{width:20,height:20}}><path d='M6 3h12l2 7H4L6 3z'/><path d='M4 10v10a1 1 0 001 1h14a1 1 0 001-1V10'/><line x1='12' y1='10' x2='12' y2='20'/></svg>},
            {id:'profile',icon:<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' style={{width:20,height:20}}><circle cx='12' cy='8' r='4'/><path d='M4 20c0-4 3.58-7 8-7s8 3 8 7'/></svg>},
          ].map(tab => (
            <button key={tab.id} onClick={()=>{setShowHome(false);navigateTo(tab.id);}} style={{width:50,height:50,borderRadius:100,border:'none',background:tab.id==='training'?'#02d1ba':'transparent',color:tab.id==='training'?'#000':'rgba(255,255,255,0.35)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'all 0.25s cubic-bezier(0.22,1,0.36,1)'}}>
              {tab.icon}
            </button>
          ))}
        </nav>
      </div>
    );
  }
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
    try { await exportProgressPDF({ programme, getHistory, entries: [] }); }
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
      {client && <SeanceVivante clientId={client.id} sessionName={activeSession !== null ? programme?.weeks?.[activeWeek]?.sessions?.[activeSession]?.name : null} />}
      {programme && !authError && (
        <>
          {page === "training" ? (
              <TrainingPage
                client={client}
                programme={programme}
                activeWeek={activeWeek}
                setActiveWeek={setActiveWeek}
                activeSession={activeSession}
                setActiveSession={setActiveSession}
                getHistory={getHistory}
                getLatest={getLatest}
                saveLog={saveLog}
                getDelta={getDelta}
              />
          ) : page === "move" ? (
              <MovePage key={page} client={client} appData={appData} />
          ) : page === "fuel" ? (
              <FuelPage key={page} client={client} appData={appData} />
          ) : page === "profile" ? (
              <ProfilePage key={page} client={client} onLogout={() => supabase.auth.signOut()} supabase={supabase} appData={appData} />
          ) : (
            <main className="main" style={{ paddingTop: 8 }}>
              <WeightChart key={page} clientId={client?.id} client={client} appData={appData} />
            </main>
          )}

          {showRPE && client && <RPEModal clientId={client.id} sessionName={session?.name} onClose={() => setShowRPE(false)} />}

          <nav style={{
            position: "fixed", bottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)",
            left: "50%", transform: navVisible ? "translateX(-50%)" : "translateX(-50%) translateY(20px)",
            display: "flex", gap: 0,
            background: "rgba(18,18,18,0.88)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 100, padding: 5,
            zIndex: 100,
            opacity: navVisible ? 1 : 0,
            transition: "opacity 0.3s ease, transform 0.3s ease",
          }}
          onTouchStart={e => { window._swipeStartX = e.touches[0].clientX; }}
          onTouchEnd={e => {
            const dx = e.changedTouches[0].clientX - (window._swipeStartX || 0);
            const ORDER = ["training", "weight", "move", "fuel", "profile"];
            const idx = ORDER.indexOf(page);
            if (dx < -40 && idx < ORDER.length - 1) navigateTo(ORDER[idx + 1]);
            else if (dx > 40 && idx > 0) navigateTo(ORDER[idx - 1]);
          }}>
            {[
              { id: "training", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{width:20,height:20}}><path d="M6 4v16M18 4v16M2 12h4M18 12h4M6 8h12M6 16h12"/></svg> },
              { id: "weight", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width:20,height:20}}><path d="M6 3h12l2 7H4L6 3z"/><path d="M4 10v10a1 1 0 001 1h14a1 1 0 001-1V10"/><line x1="12" y1="10" x2="12" y2="20"/></svg> },
              { id: "move", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{width:20,height:20}}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> },
              { id: "fuel", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{width:20,height:20}}><path d="M12 2c0 6-6 8-6 14a6 6 0 0012 0c0-6-6-8-6-14z"/><path d="M12 12c0 3-2 4-2 6a2 2 0 004 0c0-2-2-3-2-6z"/></svg> },
              { id: "profile", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{width:20,height:20}}><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.58-7 8-7s8 3 8 7"/></svg> },
            ].map(tab => (
              <button key={tab.id} onClick={() => navigateTo(tab.id)} style={{
                width: 42, height: 42, borderRadius: 100, border: "none",
                background: page === tab.id ? "#02d1ba" : "transparent",
                color: page === tab.id ? "#000" : "rgba(255,255,255,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", transition: "all 0.25s cubic-bezier(0.22,1,0.36,1)",
              }}>
                {tab.icon}
              </button>
            ))}
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
