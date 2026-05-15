import React, { useState, useEffect } from "react";
import AvatarPicker from "./AvatarPicker";
import { BadgeSystem } from "./BadgeSystem";
import { useStreak } from "../hooks/useStreak";
import { useWeightTracking } from "../hooks/useWeightTracking";
import { useXP, getLevelInfo } from "../hooks/useXP";
import { supabase } from "../lib/supabase";
import ChatCoach from "./ChatCoach";
// FaqAssistant retire — Centre d'aide suffit
import { PoweredByBadge } from "./CoachBranding";
import haptic from "../lib/haptic";
import LanguageToggle from "./LanguageToggle";
import HelpPage from "./HelpPage";
import AppIcon from "./AppIcon";
import { useT } from "../lib/i18n";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { toast } from "./Toast";

const GREEN = "#02d1ba";

export default function ProfilePage({ client, onLogout, appData, coachInfo, onDeleteRequest, onShowPrivacy, onShowMentions, onShowCGU }) {
  const t = useT();
  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const streakData = useStreak(appData ? null : client?.id);
  const streak = appData?.streak ?? streakData.streak;
  const bestStreak = appData?.bestStreak ?? streakData.bestStreak;
  const weights = appData?.weights || [];
  const latest = weights[weights.length - 1];
  const { xp, recentActivity, levelInfo, runCount, totalKm } = useXP(client?.id);
  const [sessionCount, setSessionCount] = useState(0);
  const [adnData, setAdnData] = useState(null);

  useEffect(() => {
    if (!client?.id) return;
    const fetchSessionData = async () => {
      const { data, count } = await supabase
        .from("session_logs")
        .select("session_name, logged_at", { count: "exact" })
        .eq("client_id", client.id)
        .order("logged_at", { ascending: false })
        .limit(50);
      setSessionCount(count || 0);
      if (data && data.length >= 2) {
        // Calculer ADN - jours preferes
        const dayCount = [0,0,0,0,0,0,0];
        const sessionNames = {};
        data.forEach(s => {
          const d = new Date(s.logged_at);
          dayCount[d.getDay()]++;
          if (s.session_name) sessionNames[s.session_name] = (sessionNames[s.session_name] || 0) + 1;
        });
        const days = [t("profile.day_sun"), t("profile.day_mon"), t("profile.day_tue"), t("profile.day_wed"), t("profile.day_thu"), t("profile.day_fri"), t("profile.day_sat")];
        const topDays = dayCount.map((c,i) => ({day: days[i], count: c})).filter(d => d.count > 0).sort((a,b) => b.count - a.count).slice(0,3);
        const topSession = Object.entries(sessionNames).sort((a,b) => b[1]-a[1])[0];
        const freq = count >= 12 ? t("profile.freq_3x") : count >= 6 ? t("profile.freq_2x") : t("profile.freq_1x");
        setAdnData({ topDays, topSession: topSession?.[0], freq, total: count });
      }
    };
    fetchSessionData();
  }, [client?.id]);
  const name = client?.full_name || client?.email?.split("@")[0] || t("profile.athlete_fallback");
  const firstName = name.split(" ")[0];
  const email = client?.email || "";
  const streakPct = bestStreak ? Math.min(Math.round((streak / bestStreak) * 100), 100) : 100;
  const { current: lvl, next: nextLvl, pct: xpPct } = levelInfo;

  return (
    <div style={{ minHeight: "100dvh", background: "#050505", fontFamily: "-apple-system,Inter,sans-serif", color: "#fff", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 180px)", position: "relative", overflowX: "hidden" }}>

      {/* Ambient */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: "50%", background: "radial-gradient(ellipse at 30% 0%, rgba(2,209,186,0.1) 0%, transparent 55%), radial-gradient(ellipse at 80% 0%, rgba(129,140,248,0.06) 0%, transparent 50%)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1 }}>

        {/* HERO */}
        <div style={{ padding: "0px 24px 0" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 10, color: "rgba(2,209,186,0.55)", letterSpacing: "3px", textTransform: "uppercase", marginBottom: 10 }}>{t("profile.my_profile")}</div>
              <div style={{ fontSize: 52, fontWeight: 800, color: "#fff", letterSpacing: "-3px", lineHeight: 0.92, marginBottom: 10 }}>{firstName}<span style={{ color: GREEN }}>.</span></div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.18)", fontStyle: "italic" }}>
                {t("profile.quote")}
              </div>
            </div>
            <AvatarPicker clientId={client?.id} name={name} size={68} />
          </div>
        </div>

        {/* IDENTITY CARD */}
        <div style={{ margin: "0 24px 20px", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 22, padding: "18px 20px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -40, right: -40, width: 120, height: 120, background: `radial-gradient(circle, ${GREEN}10 0%, transparent 70%)`, pointerEvents: "none" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", letterSpacing: "-0.3px" }}>{name}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 3 }}>{email}</div>
            </div>
            <div style={{ background: `rgba(2,209,186,0.1)`, border: `1px solid rgba(2,209,186,0.2)`, borderRadius: 100, padding: "5px 14px", fontSize: 11, color: GREEN, fontWeight: 600, whiteSpace: "nowrap" }}>{lvl.name}</div>
          </div>
        </div>

        {/* XP + NIVEAU */}
        <div style={{ padding: "0 24px", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 4 }}>{t("profile.athlete_level")}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 38, fontWeight: 100, color: lvl.color, letterSpacing: "-2px" }}>0{lvl.level}</span>
                <span style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>{lvl.name}</span>
              </div>
            </div>
            {nextLvl && (
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.18)", marginBottom: 2 }}>{t("profile.next_level")}</div>
                <div style={{ fontSize: 13, color: nextLvl.color, fontWeight: 600 }}>{nextLvl.name}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 2 }}>{nextLvl.min - xp} {t("profile.xp_remaining")}</div>
              </div>
            )}
          </div>
          <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, marginBottom: 5, overflow: "hidden" }}>
            <div style={{ height: "100%", width: xpPct + "%", background: `linear-gradient(90deg, ${lvl.color}, ${lvl.accent})`, borderRadius: 2, transition: "width 1s ease" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(255,255,255,0.18)" }}>
            <span>{xp} XP</span>
            {nextLvl && <span>{nextLvl.min} XP</span>}
          </div>
        </div>

        {/* STATS TESLA */}
        <div style={{ padding: "0 24px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", marginBottom: 4 }}>
          {[
            { label: t("profile.streak"), value: streak || 0, unit: "j", color: "#f97316", hot: true },
            { label: t("profile.streak_record"), value: bestStreak || 0, unit: "j", color: "#fbbf24", hot: false },
            { label: t("profile.weight"), value: latest?.weight || "--", unit: "kg", color: GREEN, hot: false },
          ].map((s, i) => (
            <div key={i} style={{ borderTop: `${s.hot ? 2 : 1}px solid ${s.hot ? s.color : "rgba(255,255,255,0.06)"}`, paddingTop: 14, paddingRight: i < 2 ? 8 : 0 }}>
              <div style={{ fontSize: 30, fontWeight: 200, color: s.color, letterSpacing: "-1.5px", lineHeight: 1 }}>
                {s.value}<span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>{s.unit}</span>
              </div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.18)", fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase", marginTop: 5 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* STREAK BAR */}
        {streak > 0 && (
          <div style={{ padding: "0px 24px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: "2px", textTransform: "uppercase" }}>{t("profile.streak_progress")}</div>
              <div style={{ fontSize: 10, color: "#f97316", fontWeight: 600 }}>{streak} / {bestStreak || streak} j</div>
            </div>
            <div style={{ height: 2, background: "rgba(255,255,255,0.06)", borderRadius: 1 }}>
              <div style={{ height: "100%", width: streakPct + "%", background: "linear-gradient(90deg, #f97316, #fbbf24)", borderRadius: 1, boxShadow: "0 0 10px rgba(249,115,22,0.4)" }} />
            </div>
          </div>
        )}

        {/* DIVIDER */}
        <div style={{ height: 1, background: "linear-gradient(90deg, rgba(2,209,186,0.3) 0%, rgba(255,255,255,0.04) 100%)", margin: "20px 24px" }} />

        {/* BADGES PREMIUM */}
        <div style={{ padding: "0 24px" }}>
          <BadgeSystem
            clientId={client?.id}
            sessions={sessionCount}
            streak={streak}
            weights={weights?.length || 0}
            runs={runCount}
            km={totalKm}
          />
        </div>

        {/* DIVIDER */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "20px 24px" }} />

        {/* ACTIVITE TIMELINE */}
        {recentActivity.length > 0 && (
          <div style={{ padding: "0 24px", marginBottom: 4 }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: "3px", textTransform: "uppercase", marginBottom: 14 }}>{t("profile.recent_activity")}</div>
            {recentActivity.map((a, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: i < recentActivity.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: a.color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>{a.label}</div>
                  {a.meta && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 2 }}>{a.meta}</div>}
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: GREEN, background: "rgba(2,209,186,0.08)", border: "1px solid rgba(2,209,186,0.15)", borderRadius: 100, padding: "2px 8px", flexShrink: 0 }}>+{a.xp} XP</div>
              </div>
            ))}
          </div>
        )}

        {/* DIVIDER */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "20px 24px" }} />

        {/* ADN ATHLETE */}
        {adnData && (
          <div style={{ padding: "0 24px", marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: "3px", textTransform: "uppercase", marginBottom: 14 }}>{t("profile.athlete_dna")}</div>
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, padding: 18, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: -40, right: -40, width: 120, height: 120, background: `radial-gradient(circle, ${GREEN}08 0%, transparent 70%)`, pointerEvents: "none" }} />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                <div style={{ background: "rgba(2,209,186,0.08)", border: "1px solid rgba(2,209,186,0.2)", borderRadius: 100, padding: "6px 14px", fontSize: 12, color: GREEN }}>{adnData.freq}</div>
                {adnData.topDays.slice(0,2).map((d,i) => (
                  <div key={i} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 100, padding: "6px 14px", fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{d.day}</div>
                ))}
                {adnData.topSession && (
                  <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 100, padding: "6px 14px", fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{adnData.topSession}</div>
                )}
              </div>
              <div style={{ paddingLeft: 12, borderLeft: `2px solid rgba(2,209,186,0.3)`, fontSize: 12, color: "rgba(255,255,255,0.35)", lineHeight: 1.6, fontStyle: "italic" }}>
                {adnData.topDays[0]
                  ? `${t("profile.dna_train_most")} ${adnData.topDays[0].day}. ${adnData.total >= 10 ? t("profile.dna_consistent") : t("profile.dna_keep_building")}`
                  : t("profile.dna_continue")}
              </div>
            </div>
          </div>
        )}

        {/* DIVIDER */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "0 24px 20px" }} />

        {/* CITATION */}
        <div style={{ padding: "0 24px", marginBottom: 28 }}>
          <div style={{ fontSize: 17, fontWeight: 900, lineHeight: 1.35, textTransform: "uppercase", letterSpacing: "-0.3px" }}>
            <span style={{ color: GREEN }}>{t("profile.discipline_word_1")} </span>
            <span style={{ color: "rgba(255,255,255,0.1)" }}>{t("profile.discipline_word_2")} </span>
            <span style={{ color: "rgba(255,255,255,0.06)" }}>{t("profile.discipline_word_3")} </span>
            <span style={{ color: "rgba(255,255,255,0.3)" }}>{t("profile.discipline_word_4")}</span>
          </div>
        </div>

        {/* MESSAGERIE COACH */}
        <div style={{ padding: "0 24px", marginBottom: 20 }}>
          <div style={{ fontSize: 10, color: "rgba(2,209,186,0.55)", letterSpacing: "3px", textTransform: "uppercase", marginBottom: 12 }}>{t("profile.messages")}</div>
          <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(2,209,186,0.15)", borderRadius: 18, overflow: "hidden", minHeight: 420, display: "flex", flexDirection: "column" }}>
            {client?.id && <ChatCoach clientId={client.id} coachEmail="" isCoach={false} />}
          </div>
        </div>

        {/* AIDE */}
        <div style={{ padding: "0 24px", marginBottom: 10 }}>
          <button onClick={() => { haptic.light(); setShowHelp(true); }} style={{ width: "100%", padding: "13px 18px", borderRadius: 14, border: "1px solid rgba(2,209,186,0.18)", background: "rgba(2,209,186,0.04)", color: "#02d1ba", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "-apple-system,Inter,sans-serif", letterSpacing: "0.3px", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <AppIcon name="alert" size={14} color="#02d1ba" />
            {t("profile.help_center")}
          </button>
        </div>

        {/* PARAMÈTRES */}
        <div style={{ padding: "0 24px", marginBottom: 14 }}>
          <button
            onClick={() => { haptic.light(); setShowSettings(true); }}
            style={{
              width: "100%", padding: "13px 18px", borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)",
              color: "rgba(255,255,255,0.65)", fontSize: 13, fontWeight: 700,
              cursor: "pointer", fontFamily: "-apple-system,Inter,sans-serif",
              letterSpacing: "0.3px",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            {t("settings.title")}
          </button>
        </div>

        {showHelp && <HelpPage onClose={() => setShowHelp(false)} />}
        {showSettings && (
          <SettingsModal
            client={client}
            onClose={() => setShowSettings(false)}
            onLogout={onLogout}
            onDeleteRequest={onDeleteRequest}
            onShowPrivacy={onShowPrivacy}
            onShowMentions={onShowMentions}
            onShowCGU={onShowCGU}
          />
        )}

        {/* WHITE LABEL : propulse par RB Perform (seulement clients de coach tiers) */}
        <PoweredByBadge coachInfo={coachInfo} />

      </div>

    </div>
  );
}

/* ── Modale Paramètres : regroupe notifs / langue / légal / compte ── */
function SettingsModal({ client, onClose, onLogout, onDeleteRequest, onShowPrivacy, onShowMentions, onShowCGU }) {
  const t = useT();
  const { permission: pushPerm, requestPermission: requestPush } = usePushNotifications(client?.id);
  // pushOn : on se base sur la permission iOS persistée et NON sur `subscribed`
  // (qui est un useState resetté à false à chaque remount). Sinon le bouton
  // re-affichait 'Activer' à chaque réouverture de la PWA alors que la
  // subscription est déjà active.
  const pushOn = pushPerm === "granted";
  const [pushBusy, setPushBusy] = useState(false);

  const handleEnableNotifs = async () => {
    haptic.light();
    setPushBusy(true);
    try {
      const perm = await requestPush();
      if (perm === "granted") toast.success(t("settings.toast_notifs_on"));
      else if (perm === "denied") toast.error(t("settings.toast_notifs_denied"));
      else toast.error(t("settings.toast_notifs_failed"));
    } finally { setPushBusy(false); }
  };

  // Empêche le scroll en arrière-plan pendant l'ouverture de la modale
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const sectionLabel = { fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: "2.5px", textTransform: "uppercase", fontWeight: 700, marginBottom: 10, paddingLeft: 4 };
  const rowBase = { width: "100%", padding: "14px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: 600, fontFamily: "-apple-system,Inter,sans-serif", cursor: "pointer" };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 1100,
        background: "rgba(0,0,0,0.85)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}
    >
      <div style={{
        width: "100%", maxWidth: 480, maxHeight: "90vh", overflow: "auto",
        background: "#0a0a0a", borderRadius: "24px 24px 0 0",
        border: "1px solid rgba(255,255,255,0.06)", borderBottom: "none",
        animation: "fadeInUp 0.25s ease both",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 18px)",
      }}>
        <div style={{ width: 36, height: 4, background: "rgba(255,255,255,0.12)", borderRadius: 2, margin: "10px auto 18px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 22px 18px" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: "-0.3px" }}>{t("settings.title")}</div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 100, width: 30, height: 30, color: "rgba(255,255,255,0.5)", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>

        {/* === NOTIFICATIONS === */}
        <div style={{ padding: "0 22px 18px" }}>
          <div style={sectionLabel}>{t("settings.section_notifications")}</div>
          <button
            onClick={handleEnableNotifs}
            disabled={pushBusy || pushPerm === "denied"}
            style={{
              ...rowBase,
              border: `1px solid ${pushOn ? "rgba(2,209,186,0.22)" : "rgba(255,255,255,0.06)"}`,
              background: pushOn ? "rgba(2,209,186,0.05)" : "rgba(255,255,255,0.02)",
              color: pushOn ? GREEN : "rgba(255,255,255,0.85)",
              cursor: pushBusy ? "wait" : pushPerm === "denied" ? "not-allowed" : "pointer",
              opacity: pushBusy ? 0.6 : 1,
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
              </svg>
              {pushOn
                ? t("settings.notifs_on")
                : pushPerm === "denied"
                  ? t("settings.notifs_blocked")
                  : pushBusy
                    ? t("settings.activating")
                    : t("settings.activate_notifs")}
            </span>
            {pushOn && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            )}
          </button>
          {pushPerm === "denied" && (
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 6, lineHeight: 1.4, paddingLeft: 4 }}>
              {t("settings.notifs_help_ios")}
            </div>
          )}
        </div>

        {/* === LANGUE === */}
        <div style={{ padding: "0 22px 18px" }}>
          <div style={sectionLabel}>{t("profile.language_label")}</div>
          <div style={{ ...rowBase, cursor: "default" }}>
            <span>{t("settings.lang_row")}</span>
            <LanguageToggle compact />
          </div>
        </div>

        {/* === LEGAL === */}
        {(onShowPrivacy || onShowMentions || onShowCGU) && (
          <div style={{ padding: "0 22px 18px" }}>
            <div style={sectionLabel}>{t("settings.section_legal")}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {onShowPrivacy && (
                <button onClick={() => { haptic.light(); onClose(); onShowPrivacy(); }} style={rowBase}>
                  <span>{t("settings.privacy")}</span>
                  <span style={{ color: "rgba(255,255,255,0.3)" }}>›</span>
                </button>
              )}
              {onShowCGU && (
                <button onClick={() => { haptic.light(); onClose(); onShowCGU(); }} style={rowBase}>
                  <span>{t("settings.cgu")}</span>
                  <span style={{ color: "rgba(255,255,255,0.3)" }}>›</span>
                </button>
              )}
              {onShowMentions && (
                <button onClick={() => { haptic.light(); onClose(); onShowMentions(); }} style={rowBase}>
                  <span>{t("settings.mentions")}</span>
                  <span style={{ color: "rgba(255,255,255,0.3)" }}>›</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* === COMPTE === */}
        <div style={{ padding: "0 22px 22px" }}>
          <div style={sectionLabel}>{t("settings.section_account")}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {onLogout && (
              <button
                onClick={() => { haptic.medium(); onClose(); onLogout(); }}
                style={{ ...rowBase, color: "rgba(255,255,255,0.7)" }}
              >
                <span>{t("settings.logout")}</span>
                <span style={{ color: "rgba(255,255,255,0.3)" }}>›</span>
              </button>
            )}
            {onDeleteRequest && (
              <button
                onClick={() => { haptic.medium(); onClose(); onDeleteRequest(); }}
                style={{ ...rowBase, color: "#ef4444", border: "1px solid rgba(239,68,68,0.15)", background: "rgba(239,68,68,0.04)" }}
              >
                <span>{t("settings.delete_account")}</span>
                <span style={{ color: "rgba(239,68,68,0.4)" }}>›</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
