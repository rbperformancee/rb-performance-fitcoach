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

function TrainLocked({ client }) {
  const [booking, setBooking] = React.useState(null);
  React.useEffect(() => {
    if (!client?.id) return;
    supabase.from("bookings").select("*, coach_slots(date, heure)")
      .eq("client_id", client.id).limit(1).single()
      .then(({ data }) => { if (data) setBooking(data); });
  }, [client?.id]);
  const slotDate = booking?.coach_slots?.date;
  const slotHeure = booking?.coach_slots?.heure;
  const dateStr = slotDate ? new Date(slotDate + "T12:00:00").toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long" }) : null;
  return (
    <div style={{minHeight:"calc(100vh - 100px)",background:"#050505",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 28px",fontFamily:"-apple-system,Inter,sans-serif"}}>
      <div style={{fontSize:56,marginBottom:24}}>🔒</div>
      <div style={{fontSize:9,letterSpacing:5,textTransform:"uppercase",color:"rgba(2,209,186,0.5)",marginBottom:12}}>Programme en préparation</div>
      <h2 style={{fontSize:30,fontWeight:900,color:"#fff",textAlign:"center",lineHeight:1.1,marginBottom:16,letterSpacing:-1}}>Ton programme<br/><span style={{color:"#02d1ba"}}>arrive bientôt.</span></h2>
      <p style={{fontSize:13,color:"rgba(255,255,255,0.3)",lineHeight:1.8,textAlign:"center",marginBottom:32,maxWidth:280}}>Rayan prépare ton programme personnalisé suite à votre appel.</p>
      {dateStr ? (
        <div style={{background:"rgba(2,209,186,0.06)",border:"1px solid rgba(2,209,186,0.2)",borderRadius:16,padding:"16px 24px",textAlign:"center"}}>
          <div style={{fontSize:10,letterSpacing:3,textTransform:"uppercase",color:"rgba(2,209,186,0.5)",marginBottom:8}}>Appel réservé</div>
          <div style={{fontSize:16,fontWeight:700,color:"#fff"}}>📞 {dateStr}</div>
          <div style={{fontSize:13,color:"rgba(255,255,255,0.4)",marginTop:4}}>{slotHeure}</div>
        </div>
      ) : (
        <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:16,padding:"16px 24px",textAlign:"center"}}>
          <div style={{fontSize:13,color:"rgba(255,255,255,0.3)"}}>Rayan te contacte très prochainement.</div>
        </div>
      )}
    </div>
  );
}


