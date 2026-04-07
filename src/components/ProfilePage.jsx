import React, { useState, useEffect } from "react";
import AvatarPicker from "./AvatarPicker";
import { BadgeSystem } from "./BadgeSystem";
import { useStreak } from "../hooks/useStreak";
import { useWeightTracking } from "../hooks/useWeightTracking";
import { useXP, getLevelInfo } from "../hooks/useXP";
import { supabase } from "../lib/supabase";

const GREEN = "#02d1ba";

export default function ProfilePage({ client, onLogout, appData }) {
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
        const days = ["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];
        const topDays = dayCount.map((c,i) => ({day: days[i], count: c})).filter(d => d.count > 0).sort((a,b) => b.count - a.count).slice(0,3);
        const topSession = Object.entries(sessionNames).sort((a,b) => b[1]-a[1])[0];
        const freq = count >= 12 ? "3x / semaine" : count >= 6 ? "2x / semaine" : "1x / semaine";
        setAdnData({ topDays, topSession: topSession?.[0], freq, total: count });
      }
    };
    fetchSessionData();
  }, [client?.id]);
  const name = client?.full_name || client?.email?.split("@")[0] || "Athlete";
  const firstName = name.split(" ")[0];
  const email = client?.email || "";
  const streakPct = bestStreak ? Math.min(Math.round((streak / bestStreak) * 100), 100) : 100;
  const { current: lvl, next: nextLvl, pct: xpPct } = levelInfo;

  return (
    <div style={{ minHeight: "100vh", background: "#050505", fontFamily: "-apple-system,Inter,sans-serif", color: "#fff", paddingBottom: 100, position: "relative", overflowX: "hidden" }}>

      {/* Ambient */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: "50%", background: "radial-gradient(ellipse at 30% 0%, rgba(2,209,186,0.1) 0%, transparent 55%), radial-gradient(ellipse at 80% 0%, rgba(129,140,248,0.06) 0%, transparent 50%)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1 }}>

        {/* HERO */}
        <div style={{ padding: "0px 24px 0" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 10, color: "rgba(2,209,186,0.55)", letterSpacing: "3px", textTransform: "uppercase", marginBottom: 10 }}>Mon profil</div>
              <div style={{ fontSize: 52, fontWeight: 800, color: "#fff", letterSpacing: "-3px", lineHeight: 0.92, marginBottom: 10 }}>{firstName}<span style={{ color: GREEN }}>.</span></div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.18)", fontStyle: "italic" }}>
                " Tu n'es pas la pour survivre. Tu es la pour dominer. "
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
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 4 }}>Niveau athlete</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 38, fontWeight: 100, color: lvl.color, letterSpacing: "-2px" }}>0{lvl.level}</span>
                <span style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>{lvl.name}</span>
              </div>
            </div>
            {nextLvl && (
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.18)", marginBottom: 2 }}>Prochain</div>
                <div style={{ fontSize: 13, color: nextLvl.color, fontWeight: 600 }}>{nextLvl.name}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 2 }}>{nextLvl.min - xp} XP restants</div>
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
            { label: "Streak", value: streak || 0, unit: "j", color: "#f97316", hot: true },
            { label: "Record", value: bestStreak || 0, unit: "j", color: "#fbbf24", hot: false },
            { label: "Poids", value: latest?.weight || "--", unit: "kg", color: GREEN, hot: false },
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
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: "2px", textTransform: "uppercase" }}>Progression streak</div>
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
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: "3px", textTransform: "uppercase", marginBottom: 14 }}>Activite recente</div>
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
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: "3px", textTransform: "uppercase", marginBottom: 14 }}>Ton ADN Athlete</div>
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
                {adnData.topDays[0] ? `Tu t entraînes le plus le ${adnData.topDays[0].day}. ${adnData.total >= 10 ? "Tu es consistant — continue." : "Construis ta regularite."}` : "Continue tes seances pour voir ton ADN se former."}
              </div>
            </div>
          </div>
        )}

        {/* DIVIDER */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "0 24px 20px" }} />

        {/* CITATION */}
        <div style={{ padding: "0 24px", marginBottom: 28 }}>
          <div style={{ fontSize: 17, fontWeight: 900, lineHeight: 1.35, textTransform: "uppercase", letterSpacing: "-0.3px" }}>
            <span style={{ color: GREEN }}>LA </span>
            <span style={{ color: "rgba(255,255,255,0.1)" }}>DISCIPLINE </span>
            <span style={{ color: "rgba(255,255,255,0.06)" }}>C EST </span>
            <span style={{ color: "rgba(255,255,255,0.3)" }}>LA LIBERTE.</span>
          </div>
        </div>

        {/* LOGOUT */}
        <div style={{ padding: "0 24px" }}>
          <button onClick={onLogout} style={{ width: "100%", padding: "15px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.07)", background: "transparent", color: "rgba(255,255,255,0.18)", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "-apple-system,Inter,sans-serif", letterSpacing: "0.3px" }}>
            Se deconnecter
          </button>
        </div>

      </div>

    </div>
  );
}
