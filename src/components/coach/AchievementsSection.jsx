import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../../lib/supabase";
import {
  BADGES,
  checkBadgeEligibility,
  calculateCoachStreak,
  calculatePlatformRank,
  rankPhrase,
} from "../../lib/coachGamification";
import {
  calculateMRR,
  countActiveClients,
  calculateRetention,
  calculateBusinessScore,
  calculateActivityScore,
} from "../../lib/coachBusiness";
import AppIcon from "../AppIcon";
import haptic from "../../lib/haptic";
import { toast } from "../Toast";
import Confetti from "../Confetti";

const G = "#02d1ba";
const VIOLET = "#a78bfa";
const ORANGE = "#f97316";
const GOLD = "#fbbf24";

/**
 * AchievementsSection — affiche badges, streak, classement du coach.
 * Integre en bas du dashboard ou via un bouton "Achievements".
 */
export default function AchievementsSection({ coachData, clients = [] }) {
  const [earnedBadges, setEarnedBadges] = useState([]);
  const [streak, setStreak] = useState({ current: 0, best: 0 });
  const [platformRank, setPlatformRank] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);

  // Metrics calcules en live
  const mrr = useMemo(() => calculateMRR(clients), [clients]);
  const active = useMemo(() => countActiveClients(clients), [clients]);
  const retention = useMemo(() => calculateRetention(clients), [clients]);
  const activity = useMemo(() => calculateActivityScore(clients), [clients]);
  const score = useMemo(() => calculateBusinessScore({ retention, activity, mrr }), [retention, activity, mrr]);

  // Transformations = clients avec -5kg entre leur premier et dernier poids
  const transformations = useMemo(() => {
    return clients.filter((c) => {
      const weights = c._weights || [];
      if (weights.length < 2) return false;
      const sorted = [...weights].sort((a, b) => new Date(a.date) - new Date(b.date));
      const delta = sorted[sorted.length - 1].weight - sorted[0].weight;
      return delta <= -5;
    }).length;
  }, [clients]);

  useEffect(() => {
    if (!coachData?.id) return;
    let mounted = true;
    const load = async () => {
      // Batch parallele : badges + snapshots streak + scores plateforme
      const since90 = new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0];
      const todayStr = new Date().toISOString().split("T")[0];
      const [existingRes, snapsRes, allScoresRes] = await Promise.all([
        supabase.from("coach_badges").select("badge_id, earned_at").eq("coach_id", coachData.id),
        supabase.from("coach_business_snapshots").select("snapshot_date, activity_score").eq("coach_id", coachData.id).gte("snapshot_date", since90).order("snapshot_date", { ascending: false }),
        supabase.from("coach_business_snapshots").select("business_score").eq("snapshot_date", todayStr),
      ]);
      if (!mounted) return;
      const existing = existingRes.data;
      const snaps = snapsRes.data;
      const existingIds = new Set((existing || []).map((b) => b.badge_id));

      const s = calculateCoachStreak(snaps || []);
      setStreak(s);

      // Check new badges to unlock
      const eligible = checkBadgeEligibility({
        activeClients: active,
        retention,
        mrr,
        coachCreatedAt: coachData.created_at,
        clientsWithWeightLoss: transformations,
        consistentDays: s.best,
      });
      const toUnlock = eligible.filter((id) => !existingIds.has(id));
      if (toUnlock.length > 0) {
        await supabase.from("coach_badges").insert(
          toUnlock.map((id) => ({ coach_id: coachData.id, badge_id: id }))
        );
        if (!mounted) return;
        const merged = [
          ...(existing || []),
          ...toUnlock.map((id) => ({ badge_id: id, earned_at: new Date().toISOString() })),
        ];
        setEarnedBadges(merged);
        haptic.success();
        // CONFETTI celebration !
        setShowConfetti(true);
        setTimeout(() => mounted && setShowConfetti(false), 3000);
        // Toast pour chaque badge debloque (max 3 affiches)
        toUnlock.slice(0, 3).forEach((bid, i) => {
          const badge = BADGES.find((b) => b.id === bid);
          if (badge) setTimeout(() => toast.success(`Badge debloque : ${badge.label}`), i * 600);
        });
      } else {
        setEarnedBadges(existing || []);
      }

      // Platform rank (deja batche dans Promise.all ci-dessus)
      const allScores = allScoresRes.data;
      if (allScores && allScores.length > 0) {
        const scores = allScores.map((r) => r.business_score || 0);
        setPlatformRank(calculatePlatformRank(score, scores));
      }
    };
    load();
    return () => { mounted = false; };
  }, [coachData?.id, active, retention, mrr, score, transformations]);

  const earnedIds = new Set(earnedBadges.map((b) => b.badge_id));
  const totalBadges = BADGES.length;
  const unlockedCount = earnedIds.size;

  return (
    <div style={{ marginBottom: 40, animation: "fadeUp 0.4s ease both" }}>
      <Confetti active={showConfetti} duration={3000} count={50} />
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <AppIcon name="trophy" size={16} color={GOLD} />
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "3px", textTransform: "uppercase", color: GOLD }}>
          Achievements
        </div>
        <div style={{ marginLeft: "auto", fontSize: 10, color: "rgba(255,255,255,0.4)" }}>
          {unlockedCount}/{totalBadges}
        </div>
      </div>

      {/* Streak + Rank cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        {/* Streak */}
        <div style={{ background: "rgba(249,115,22,0.05)", border: "1px solid rgba(249,115,22,0.18)", borderRadius: 16, padding: "16px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <AppIcon name="flame" size={14} color={ORANGE} />
            <div style={{ fontSize: 9, letterSpacing: "1.5px", textTransform: "uppercase", color: `${ORANGE}d0`, fontWeight: 700 }}>Streak coach</div>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 30, fontWeight: 800, color: ORANGE, lineHeight: 1 }}>{streak.current}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>jour{streak.current > 1 ? "s" : ""}</div>
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>
            Record : {streak.best} · 80%+ clients actifs
          </div>
        </div>

        {/* Classement */}
        <div style={{ background: "rgba(129,140,248,0.05)", border: "1px solid rgba(129,140,248,0.18)", borderRadius: 16, padding: "16px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <AppIcon name="chart" size={14} color="#818cf8" />
            <div style={{ fontSize: 9, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(129,140,248,0.85)", fontWeight: 700 }}>Classement</div>
          </div>
          {platformRank ? (
            <>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 30, fontWeight: 800, color: "#818cf8", lineHeight: 1 }}>#{platformRank.rank}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>/ {platformRank.total}</div>
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 4, lineHeight: 1.4 }}>{rankPhrase(platformRank.percentile)}</div>
            </>
          ) : (
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 8 }}>Pas assez de donnees plateforme.</div>
          )}
        </div>
      </div>

      {/* Badges grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
        {BADGES.map((b) => {
          const earned = earnedIds.has(b.id);
          return <BadgeCard key={b.id} badge={b} earned={earned} />;
        })}
      </div>
    </div>
  );
}

function BadgeCard({ badge, earned }) {
  return (
    <div
      style={{
        background: earned ? `${badge.color}10` : "rgba(255,255,255,0.02)",
        border: earned ? `1px solid ${badge.color}40` : "1px dashed rgba(255,255,255,0.08)",
        borderRadius: 14,
        padding: "14px 12px",
        textAlign: "center",
        opacity: earned ? 1 : 0.4,
        transition: "all 0.3s",
        position: "relative",
      }}
      title={badge.description}
    >
      <div
        style={{
          width: 44, height: 44, margin: "0 auto 10px",
          borderRadius: "50%",
          background: earned ? `${badge.color}18` : "rgba(255,255,255,0.03)",
          border: earned ? `1px solid ${badge.color}50` : "1px solid rgba(255,255,255,0.06)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: earned ? badge.color : "rgba(255,255,255,0.2)",
          boxShadow: earned ? `0 0 16px ${badge.color}35` : "none",
        }}
      >
        <AppIcon name={badge.icon} size={22} color={earned ? badge.color : "rgba(255,255,255,0.2)"} strokeWidth={1.6} />
      </div>
      <div style={{ fontSize: 11, fontWeight: 800, color: earned ? "#fff" : "rgba(255,255,255,0.35)", marginBottom: 3, letterSpacing: "-0.2px" }}>
        {badge.label}
      </div>
      <div style={{ fontSize: 9, color: earned ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.2)", lineHeight: 1.4 }}>
        {badge.description}
      </div>
      {earned && (
        <div style={{ position: "absolute", top: 6, right: 6, width: 14, height: 14, borderRadius: "50%", background: badge.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <AppIcon name="check" size={9} color="#000" strokeWidth={3} />
        </div>
      )}
    </div>
  );
}
