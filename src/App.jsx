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
import ChatCoach from "./components/ChatCoach";
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

function TrainLocked({ client, sessionsDone = 0, onRenew, onContact }) {
  const [booking, setBooking] = React.useState(null);
  const [firstSessionDate, setFirstSessionDate] = React.useState(null);

  // Deux etats possibles :
  // - sessionsDone === 0 : nouveau client qui attend son 1er programme apres l'onboarding
  // - sessionsDone > 0   : client qui a termine un cycle precedent, pret pour le suivant
  const isCycleCompleted = sessionsDone > 0;

  React.useEffect(() => {
    if (!client?.id) return;
    if (isCycleCompleted) {
      // Date de la premiere seance pour calculer la duree du cycle
      supabase
        .from("session_logs")
        .select("logged_at")
        .eq("client_id", client.id)
        .order("logged_at", { ascending: true })
        .limit(1)
        .single()
        .then(({ data }) => { if (data?.logged_at) setFirstSessionDate(data.logged_at); });
    } else {
      // Booking pour l'etat "en attente du 1er programme"
      supabase
        .from("bookings")
        .select("*, coach_slots(date, heure)")
        .eq("client_id", client.id)
        .limit(1)
        .single()
        .then(({ data }) => { if (data) setBooking(data); });
    }
  }, [client?.id, isCycleCompleted]);

  // ===== Animations partagees =====
  const GLOBAL_STYLES = (
    <style>{`
      @keyframes tlFadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes tlFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
      @keyframes tlGlow { 0%, 100% { filter: drop-shadow(0 0 24px rgba(2,209,186,0.5)); } 50% { filter: drop-shadow(0 0 44px rgba(2,209,186,0.95)); } }
      @keyframes tlPulse { 0%, 100% { opacity: 0.35; } 50% { opacity: 0.7; } }
    `}</style>
  );

  // ======================================
  // ETAT 1 : CYCLE ACCOMPLI (pret pour le suivant)
  // ======================================
  if (isCycleCompleted) {
    const weeks = firstSessionDate
      ? Math.max(1, Math.ceil((Date.now() - new Date(firstSessionDate).getTime()) / (7 * 86400000)))
      : Math.max(1, Math.ceil(sessionsDone / 3));
    const avgPerWeek = sessionsDone / weeks;
    const consistency = Math.min(100, Math.round((avgPerWeek / 3) * 100));

    return (
      <div style={{ minHeight: "calc(100vh - 100px)", background: "#050505", fontFamily: "-apple-system,Inter,sans-serif", color: "#fff", padding: "40px 24px 140px", position: "relative", overflow: "hidden" }}>
        {GLOBAL_STYLES}

        {/* Ambient radial teal + grille subtile */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
          <div style={{ position: "absolute", top: "-10%", left: "50%", transform: "translateX(-50%)", width: 620, height: 620, background: "radial-gradient(circle, rgba(2,209,186,0.18), transparent 65%)", borderRadius: "50%", filter: "blur(100px)" }} />
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(2,209,186,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(2,209,186,0.025) 1px, transparent 1px)", backgroundSize: "48px 48px", maskImage: "radial-gradient(ellipse at top, #000 30%, transparent 80%)", WebkitMaskImage: "radial-gradient(ellipse at top, #000 30%, transparent 80%)" }} />
        </div>

        <div style={{ position: "relative", zIndex: 1, maxWidth: 420, margin: "0 auto", textAlign: "center" }}>
          {/* Trophy SVG avec glow + float */}
          <div style={{ marginBottom: 32, display: "flex", justifyContent: "center", animation: "tlFloat 3.5s ease-in-out infinite" }}>
            <div style={{ animation: "tlGlow 3.5s ease-in-out infinite" }}>
              <svg width="92" height="92" viewBox="0 0 24 24" fill="none" stroke="#02d1ba" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 4V2h10v2" />
                <path d="M7 4h10a2 2 0 012 2v3a5 5 0 01-5 5h-4a5 5 0 01-5-5V6a2 2 0 012-2z" />
                <path d="M4 4v1a3 3 0 003 3" />
                <path d="M20 4v1a3 3 0 01-3 3" />
                <path d="M12 14v4" />
                <path d="M10 18h4a2 2 0 012 2v2H8v-2a2 2 0 012-2z" />
              </svg>
            </div>
          </div>

          {/* Eyebrow */}
          <div style={{ fontSize: 10, letterSpacing: "5px", textTransform: "uppercase", color: "rgba(2,209,186,0.7)", marginBottom: 14, fontWeight: 700, animation: "tlFadeUp 0.6s ease 0.15s both" }}>
            Cycle accompli
          </div>

          {/* Titre */}
          <h1 style={{ fontSize: 46, fontWeight: 900, color: "#fff", letterSpacing: "-2.5px", lineHeight: 0.92, margin: "0 0 22px", animation: "tlFadeUp 0.6s ease 0.25s both" }}>
            Tu as<br />
            <span style={{ color: "#02d1ba" }}>tout donne.</span>
          </h1>

          {/* Message */}
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.7, margin: "0 auto 32px", maxWidth: 340, animation: "tlFadeUp 0.6s ease 0.35s both" }}>
            Ton cycle est termine. Ton corps a change, ton mental aussi.<br />
            Le vrai test maintenant : la constance.
          </p>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 32, animation: "tlFadeUp 0.6s ease 0.45s both" }}>
            {[
              { value: sessionsDone, label: "Seances" },
              { value: weeks,        label: "Semaines" },
              { value: consistency + "%", label: "Regularite" },
            ].map((s, i) => (
              <div key={i} style={{ padding: "18px 8px 14px", background: "rgba(2,209,186,0.05)", border: "1px solid rgba(2,209,186,0.18)", borderRadius: 16, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, background: "radial-gradient(circle, rgba(2,209,186,0.12), transparent 70%)", pointerEvents: "none" }} />
                <div style={{ position: "relative", zIndex: 1 }}>
                  <div style={{ fontSize: 30, fontWeight: 200, color: "#02d1ba", letterSpacing: "-1.5px", lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "1.2px", marginTop: 8, fontWeight: 600 }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Citation motivationnelle */}
          <div style={{ fontSize: 13, fontStyle: "italic", color: "rgba(255,255,255,0.5)", lineHeight: 1.6, letterSpacing: "0.2px", marginBottom: 36, maxWidth: 320, marginLeft: "auto", marginRight: "auto", animation: "tlFadeUp 0.6s ease 0.55s both" }}>
            "Ceux qui durent, ce sont ceux<br />qui recommencent."
            <div style={{ fontSize: 10, color: "rgba(2,209,186,0.55)", marginTop: 10, letterSpacing: "3px", textTransform: "uppercase", fontStyle: "normal", fontWeight: 700 }}>
              — Rayan
            </div>
          </div>

          {/* CTAs — navigation interne a l'app, pas de mailto */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 360, margin: "0 auto", animation: "tlFadeUp 0.6s ease 0.65s both" }}>
            <button
              type="button"
              onClick={onRenew}
              style={{
                display: "block",
                width: "100%",
                textAlign: "center",
                padding: 18,
                background: "linear-gradient(135deg, #02d1ba, #0891b2)",
                color: "#000",
                border: "none",
                borderRadius: 16,
                fontSize: 14,
                fontWeight: 800,
                cursor: "pointer",
                letterSpacing: "0.5px",
                textTransform: "uppercase",
                boxShadow: "0 10px 36px rgba(2,209,186,0.35)",
                WebkitTapHighlightColor: "transparent",
                WebkitAppearance: "none",
                fontFamily: "-apple-system,Inter,sans-serif",
              }}
            >
              Voir les formules →
            </button>
            <button
              type="button"
              onClick={onContact}
              style={{
                display: "flex",
                width: "100%",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: 14,
                background: "transparent",
                color: "rgba(255,255,255,0.55)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 16,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                letterSpacing: "0.3px",
                WebkitTapHighlightColor: "transparent",
                WebkitAppearance: "none",
                fontFamily: "-apple-system,Inter,sans-serif",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Contacter Rayan
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ======================================
  // ETAT 2 : EN ATTENTE DU 1er PROGRAMME (apres onboarding)
  // ======================================
  const slotDate = booking?.coach_slots?.date;
  const slotHeure = booking?.coach_slots?.heure;
  const dateStr = slotDate
    ? new Date(slotDate + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
    : null;

  return (
    <div style={{ minHeight: "calc(100vh - 100px)", background: "#050505", fontFamily: "-apple-system,Inter,sans-serif", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px 120px", position: "relative", overflow: "hidden" }}>
      {GLOBAL_STYLES}

      {/* Ambient */}
      <div style={{ position: "absolute", top: "-10%", left: "50%", transform: "translateX(-50%)", width: 500, height: 500, background: "radial-gradient(circle, rgba(2,209,186,0.12), transparent 65%)", borderRadius: "50%", filter: "blur(90px)", pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: 360, animation: "tlFadeUp 0.6s ease both" }}>
        {/* Icone calendrier premium (remplace l'emoji cadenas) */}
        <div style={{ marginBottom: 28, display: "flex", justifyContent: "center", color: "#02d1ba", animation: "tlPulse 2.8s ease-in-out infinite" }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>

        <div style={{ fontSize: 10, letterSpacing: "5px", textTransform: "uppercase", color: "rgba(2,209,186,0.6)", marginBottom: 14, fontWeight: 700 }}>
          Programme en preparation
        </div>

        <h2 style={{ fontSize: 34, fontWeight: 900, color: "#fff", lineHeight: 0.95, margin: "0 0 18px", letterSpacing: "-1.5px" }}>
          Ton programme<br />
          <span style={{ color: "#02d1ba" }}>arrive bientot.</span>
        </h2>

        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, marginBottom: 30, maxWidth: 300, marginLeft: "auto", marginRight: "auto" }}>
          Rayan prepare ton programme personnalise. Tu seras notifie des qu'il est pret.
        </p>

        {dateStr ? (
          <div style={{ background: "rgba(2,209,186,0.06)", border: "1px solid rgba(2,209,186,0.2)", borderRadius: 18, padding: "18px 26px", display: "inline-block", textAlign: "left" }}>
            <div style={{ fontSize: 10, letterSpacing: "2.5px", textTransform: "uppercase", color: "rgba(2,209,186,0.6)", marginBottom: 8, fontWeight: 700 }}>
              Appel reserve
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#02d1ba" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", textTransform: "capitalize" }}>{dateStr}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{slotHeure}</div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "14px 22px", display: "inline-block" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>Rayan te contacte tres prochainement.</div>
          </div>
        )}
      </div>
    </div>
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
  const [clientEmail] = React.useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('email') || '';
  });
  const [paymentStatus, setPaymentStatus] = React.useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('payment') || null;
  });
  const [paymentPlan, setPaymentPlan] = React.useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('plan') || null;
  });
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
  const [showRenewalPricing, setShowRenewalPricing] = useState(false);
  const [showCoachChat, setShowCoachChat] = useState(false);
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

  React.useEffect(() => {
    if (paymentStatus === 'success' && clientEmail) {
      fetch('https://pwkajyrpldhlybavmopd.supabase.co/functions/v1/stripe-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': 'sb_publishable_WbG1gs6l7XP6aHH_UqR0Hw_XLSI50ud' },
        body: JSON.stringify({ type: 'checkout.session.completed', data: { object: { customer_email: clientEmail, amount_total: 0, metadata: { planName: paymentPlan || 'RB Perform', planId: '' } } } })
      }).catch(() => {});
    }
  }, [paymentStatus, clientEmail]);

  // ── Paiement succès ──
  // On distingue deux cas :
  // 1) Client existant (deja logue + onboarding_done === true) qui renouvelle son
  //    cycle : on affiche un ecran "Nouveau cycle active" et on le renvoie
  //    directement dans l'app sans re-login. Il a deja son compte, son historique
  //    et son onboarding. Zero friction.
  // 2) Nouveau client qui vient de payer pour la premiere fois : on garde le
  //    flow existant (email magique -> login -> onboarding).
  if (paymentStatus === 'success') {
    const isReturningClient = !!(user && client && client.onboarding_done === true);

    // Commun aux deux branches
    const sharedStyles = (
      <style>{`
        @keyframes successOrb{0%,100%{transform:translate(-50%,-50%) scale(1)}50%{transform:translate(-50%,-50%) scale(1.1)}}
        @keyframes checkIn{0%{opacity:0;transform:scale(0.5)}70%{transform:scale(1.1)}100%{opacity:1;transform:scale(1)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
        @keyframes tealPulse{0%,100%{color:#02d1ba;text-shadow:0 0 20px rgba(2,209,186,0.3)}50%{color:#5ee8d4;text-shadow:0 0 40px rgba(2,209,186,0.6)}}
      `}</style>
    );
    const sharedBg = (
      <>
        <div style={{ position: 'absolute', top: '50%', left: '50%', width: 500, height: 500, background: 'radial-gradient(circle,rgba(2,209,186,0.15),transparent 65%)', borderRadius: '50%', filter: 'blur(80px)', animation: 'successOrb 4s ease-in-out infinite', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(2,209,186,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(2,209,186,0.04) 1px,transparent 1px)', backgroundSize: '44px 44px', pointerEvents: 'none' }} />
      </>
    );

    // ─── Branche "client existant — renouvellement de cycle" ───
    if (isReturningClient) {
      const firstName = (client.full_name || "").split(' ')[0] || "champion";
      return (
        <div style={{ position: 'fixed', inset: 0, background: '#050505', fontFamily: '-apple-system,Inter,sans-serif', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', textAlign: 'center', overflow: 'hidden' }}>
          {sharedStyles}
          {sharedBg}
          <div style={{ position: 'relative', zIndex: 10, maxWidth: 380 }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,#02d1ba,#0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px', animation: 'checkIn 0.6s cubic-bezier(0.34,1.56,0.64,1) both', fontSize: 36, color: '#000', boxShadow: '0 12px 48px rgba(2,209,186,0.4)' }}>✓</div>

            <div style={{ fontSize: 10, letterSpacing: 5, textTransform: 'uppercase', color: 'rgba(2,209,186,0.6)', marginBottom: 16, fontWeight: 700, animation: 'fadeUp 0.6s ease 0.2s both' }}>Nouveau cycle active</div>

            <h1 style={{ fontSize: 44, fontWeight: 900, letterSpacing: -3, lineHeight: 0.9, marginBottom: 22, animation: 'fadeUp 0.6s ease 0.3s both' }}>
              <span style={{ display: 'block', color: '#fff' }}>On remet</span>
              <span style={{ display: 'block', animation: 'tealPulse 3s ease-in-out infinite' }}>ca, {firstName}.</span>
            </h1>

            {paymentPlan && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(2,209,186,0.08)', border: '1px solid rgba(2,209,186,0.25)', borderRadius: 100, padding: '10px 22px', fontSize: 12, color: '#02d1ba', fontWeight: 600, marginBottom: 24, letterSpacing: 0.3, animation: 'fadeUp 0.6s ease 0.4s both' }}>
                Programme {paymentPlan} renouvele
              </div>
            )}

            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.8, marginBottom: 36, maxWidth: 340, marginLeft: 'auto', marginRight: 'auto', animation: 'fadeUp 0.6s ease 0.5s both' }}>
              Ton paiement est confirme. Rayan prepare ton nouveau programme<br />
              et tu seras notifie des qu'il est pret.
            </p>

            <button
              onClick={() => { setPaymentStatus(null); setPaymentPlan(null); window.history.replaceState({}, '', '/'); }}
              style={{ width: '100%', padding: 18, background: 'linear-gradient(135deg,#02d1ba,#0891b2)', border: 'none', borderRadius: 16, color: '#000', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: '-apple-system,Inter,sans-serif', letterSpacing: 0.5, textTransform: 'uppercase', position: 'relative', overflow: 'hidden', animation: 'fadeUp 0.6s ease 0.6s both', boxShadow: '0 10px 36px rgba(2,209,186,0.35)' }}
            >
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,rgba(255,255,255,0.15),transparent 50%)', pointerEvents: 'none' }} />
              Retour a mon espace →
            </button>

            <div style={{ marginTop: 20, fontSize: 11, color: 'rgba(255,255,255,0.2)', animation: 'fadeUp 0.6s ease 0.7s both' }}>
              RB Perform · Programme d'elite
            </div>
          </div>
        </div>
      );
    }

    // ─── Branche "nouveau client — premiere inscription" ───
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#000', fontFamily: '-apple-system,Inter,sans-serif', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', textAlign: 'center', overflow: 'hidden' }}>
        {sharedStyles}
        {sharedBg}
        <div style={{ position: 'relative', zIndex: 10, maxWidth: 360 }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,#02d1ba,#0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px', animation: 'checkIn 0.6s cubic-bezier(0.34,1.56,0.64,1) both', fontSize: 36 }}>✓</div>
          <div style={{ fontSize: 9, letterSpacing: 5, textTransform: 'uppercase', color: 'rgba(2,209,186,0.6)', marginBottom: 16, animation: 'fadeUp 0.6s ease 0.2s both' }}>Bienvenue dans l'élite</div>
          <h1 style={{ fontSize: 42, fontWeight: 900, letterSpacing: -3, lineHeight: 0.9, marginBottom: 20, animation: 'fadeUp 0.6s ease 0.3s both' }}>
            <span style={{ display: 'block', color: '#fff' }}>Tu fais partie</span>
            <span style={{ display: 'block', animation: 'tealPulse 3s ease-in-out infinite' }}>de la Team.</span>
          </h1>
          {paymentPlan && <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(2,209,186,0.08)', border: '1px solid rgba(2,209,186,0.2)', borderRadius: 100, padding: '8px 20px', fontSize: 12, color: '#02d1ba', fontWeight: 600, marginBottom: 24, animation: 'fadeUp 0.6s ease 0.4s both' }}>Programme {paymentPlan} activé</div>}
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', lineHeight: 1.8, marginBottom: 40, animation: 'fadeUp 0.6s ease 0.5s both' }}>
            Un email va t'être envoyé pour accéder à ton espace personnel.<br />
            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>Vérifie aussi tes spams.</span>
          </p>
          <button onClick={() => { setPaymentStatus(null); setShowLogin(true); window.history.replaceState({}, '', '/'); }} style={{ width: '100%', padding: 18, background: 'linear-gradient(135deg,#02d1ba,#0891b2)', border: 'none', borderRadius: 16, color: '#000', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: '-apple-system,Inter,sans-serif', letterSpacing: 0.3, position: 'relative', overflow: 'hidden', animation: 'fadeUp 0.6s ease 0.6s both' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,rgba(255,255,255,0.15),transparent 50%)', pointerEvents: 'none' }} />
            Accéder à mon espace →
          </button>
          <div style={{ marginTop: 20, fontSize: 11, color: 'rgba(255,255,255,0.15)', animation: 'fadeUp 0.6s ease 0.7s both' }}>RB Perform · Programme d'élite</div>
        </div>
      </div>
    );
  }

  // ── Paiement annulé ──
  if (paymentStatus === 'cancelled') {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#000', fontFamily: '-apple-system,Inter,sans-serif', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', textAlign: 'center' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', width: 400, height: 400, background: 'radial-gradient(circle,rgba(239,68,68,0.08),transparent 65%)', borderRadius: '50%', filter: 'blur(80px)', transform: 'translate(-50%,-50%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 10, maxWidth: 340 }}>
          <div style={{ fontSize: 48, marginBottom: 24 }}>←</div>
          <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: -2, marginBottom: 16 }}>Pas encore prêt ?</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', lineHeight: 1.8, marginBottom: 36 }}>
            Aucun paiement n'a été effectué.<br />Tu peux revenir quand tu veux.
          </p>
          <button onClick={() => { setPaymentStatus(null); window.history.replaceState({}, '', '/'); }} style={{ width: '100%', padding: 18, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: '-apple-system,Inter,sans-serif' }}>
            ← Voir les offres
          </button>
        </div>
      </div>
    );
  }

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
      return <LoginScreen onBack={() => setShowLogin(false)} />;
    }
    return (
      <div style={{ position: 'relative' }}>
        <PricingPage client={null} onLogin={() => setShowLogin(true)} />
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999, textAlign: 'center', padding: '20px 24px calc(env(safe-area-inset-bottom,0px) + 20px)', background: 'linear-gradient(to top, rgba(0,0,0,0.98) 60%, transparent)' }}>
          <button onClick={() => setShowLogin(true)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.25)', fontSize: 13, cursor: 'pointer', fontFamily: '-apple-system,Inter,sans-serif', letterSpacing: '0.3px' }}>
            Déjà membre ? <span style={{ color: '#02d1ba', fontWeight: 700 }}>Se connecter →</span>
          </button>
        </div>
      </div>
    );
  }

  // ── Client sans onboarding fait → Onboarding ──
  // IMPORTANT : on se base UNIQUEMENT sur client.onboarding_done.
  // - Si onboarding_done === true (l'utilisateur a deja fait son onboarding),
  //   on ne montre JAMAIS l'OnboardingFlow, meme si son programme a ete
  //   supprime entre temps (cloudProgramme === null). Dans ce cas le code
  //   tombe sur TrainLocked plus bas (avec le polling Supabase qui detecte
  //   automatiquement quand le coach republie un nouveau programme).
  // - Si onboarding_done est false, null, undefined, ou si client est null
  //   (nouveau user sans row dans clients), on montre l'OnboardingFlow.
  // On NE depend PAS de cloudProgramme : la suppression d'un programme ne
  // doit jamais reclencher l'onboarding pour un user qui l'a deja fait.
  if (user && !isCoach && !authLoading && client?.onboarding_done !== true) {
    return <OnboardingFlow client={client || { email: user.email, id: null }} onComplete={() => window.location.reload()} />;
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
        <div style={{padding:'calc(env(safe-area-inset-top, 44px) + 12px) 28px 0',display:'flex',justifyContent:'space-between',alignItems:'flex-start',position:'relative',zIndex:2,gap:8}}>
          <div>
            <div style={{fontSize:10,color:'rgba(255,255,255,0.2)',fontWeight:600,letterSpacing:'3px',textTransform:'uppercase',marginBottom:12}}>{_days[_now.getDay()]} · {_now.getDate()} {_months[_now.getMonth()]}</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,0.25)',fontWeight:400,letterSpacing:'1px',marginBottom:6}}>{_g}</div>
            <div style={{fontSize:44,fontWeight:800,color:'#ffffff',letterSpacing:'-2px',lineHeight:1,wordBreak:'break-word',maxWidth:'54vw'}}>{_fn}<span style={{color:'#02d1ba'}}>.</span></div>
          </div>

          {/* Anneau Tesla + heure Apple */}
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:38,fontWeight:100,color:'rgba(255,255,255,0.8)',letterSpacing:'-2px',fontVariantNumeric:'tabular-nums',lineHeight:1,flexShrink:0}}>{_time}</div>
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
            <button key={tab.id} onClick={()=>{ if(tab.id==='training' && !cloudProgramme){ setShowHome(false); setPage('training'); } else { setShowHome(false); navigateTo(tab.id); } }} style={{width:50,height:50,borderRadius:100,border:'none',background:tab.id==='training'?'#02d1ba':'transparent',color:tab.id==='training'?'#000':'rgba(255,255,255,0.35)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'all 0.25s cubic-bezier(0.22,1,0.36,1)'}}>
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

      {/* ── Overlay : Formules / Renouvellement de cycle ── */}
      {showRenewalPricing && (
        <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "#050505", overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
          <PricingPage
            client={client}
            onClose={() => setShowRenewalPricing(false)}
            onLogin={() => {}}
          />
        </div>
      )}

      {/* ── Overlay : Chat avec Rayan ── */}
      {showCoachChat && client?.id && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowCoachChat(false); }}
          style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
        >
          <div style={{ width: "100%", maxWidth: 480, height: "88vh", background: "#0a0a0a", borderRadius: "24px 24px 0 0", border: "1px solid rgba(2,209,186,0.15)", borderBottom: "none", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Header avec close */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <div>
                <div style={{ fontSize: 9, letterSpacing: "3px", textTransform: "uppercase", color: "rgba(2,209,186,0.55)", marginBottom: 4, fontWeight: 700 }}>RB Perform · Chat</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: "#fff", letterSpacing: "-0.3px" }}>Contacter Rayan</div>
              </div>
              <button
                onClick={() => setShowCoachChat(false)}
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 100, width: 34, height: 34, color: "rgba(255,255,255,0.5)", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, WebkitTapHighlightColor: "transparent", fontFamily: "-apple-system,Inter,sans-serif" }}
              >
                ✕
              </button>
            </div>
            {/* Le composant ChatCoach existant */}
            <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
              <ChatCoach clientId={client.id} coachEmail={COACH_EMAIL} isCoach={false} />
            </div>
          </div>
        </div>
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
      {!authError && showImportFallback && isCoach && (
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

      {/* ── Client sans programme — pages accessibles ── */}
      {user && !isCoach && !cloudProgramme && !showHome && (
        <div style={{minHeight:'100vh', background:'#050505', position:'relative'}}>
          {page === 'training' && <TrainLocked client={client} sessionsDone={_sessionsDone} onRenew={() => setShowRenewalPricing(true)} onContact={() => setShowCoachChat(true)} />}
          {page === 'weight' && <WeightChart clientId={client?.id} client={client} appData={appData} />}
          {page === 'move' && <MovePage client={client} appData={appData} />}
          {page === 'fuel' && <FuelPage client={client} appData={appData} />}
          {page === 'profile' && <ProfilePage client={client} onDeleteRequest={() => setShowDeleteConfirm(true)} onShowPrivacy={() => setShowPrivacy(true)} onShowMentions={() => setShowMentions(true)} onShowCGU={() => setShowCGU(true)} />}
          <nav style={{position:'fixed',bottom:'calc(env(safe-area-inset-bottom,0px) + 20px)',left:'50%',transform:'translateX(-50%)',display:'flex',gap:0,background:'rgba(18,18,18,0.88)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:100,padding:5,zIndex:100,backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)'}}>
            {[
              {id:'training',icon:<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' style={{width:20,height:20}}><path d='M6 4v16M18 4v16M2 12h4M18 12h4M6 8h12M6 16h12'/></svg>},
              {id:'weight',icon:<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round' style={{width:20,height:20}}><path d='M6 3h12l2 7H4L6 3z'/><path d='M4 10v10a1 1 0 001 1h14a1 1 0 001-1V10'/><line x1='12' y1='10' x2='12' y2='20'/></svg>},
              {id:'move',icon:<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' style={{width:20,height:20}}><path d='M13 2L3 14h9l-1 8 10-12h-9l1-8z'/></svg>},
              {id:'fuel',icon:<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' style={{width:20,height:20}}><path d='M12 2c0 6-6 8-6 14a6 6 0 0012 0c0-6-6-8-6-14z'/><path d='M12 12c0 3-2 4-2 6a2 2 0 004 0c0-2-2-3-2-6z'/></svg>},
              {id:'profile',icon:<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' style={{width:20,height:20}}><circle cx='12' cy='8' r='4'/><path d='M4 20c0-4 3.58-7 8-7s8 3 8 7'/></svg>},
            ].map(tab => (
              <button key={tab.id} onClick={() => setPage(tab.id)} style={{width:42,height:42,borderRadius:100,border:'none',background:page===tab.id?'#02d1ba':'transparent',color:page===tab.id?'#000':'rgba(255,255,255,0.4)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'all 0.25s cubic-bezier(0.22,1,0.36,1)'}}>
                {tab.icon}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* ── App principale ── */}
      {client && <SeanceVivante clientId={client.id} sessionName={activeSession !== null ? programme?.weeks?.[activeWeek]?.sessions?.[activeSession]?.name : null} />}
      {programme && !authError && (
        <>
          {page === "training" ? (
            !cloudProgramme ? <TrainLocked client={client} sessionsDone={_sessionsDone} onRenew={() => setShowRenewalPricing(true)} onContact={() => setShowCoachChat(true)} /> :
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
