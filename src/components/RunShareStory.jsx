// src/components/RunShareStory.jsx
//
// Écran "Partager ma course" — style Strava.
//
// UX :
//   • Photo galerie en fond plein écran (9:16)
//   • Trace GPS overlay (SVG path depuis route_coords)
//   • Trace draggable (1 doigt) + pinch zoom + rotate (2 doigts)
//   • Bottom sheet 3 onglets : Tracé (couleur) · Layout · Photo
//   • Hint pinch éphémère au 1er boot (localStorage)
//
// Export :
//   • Render dans canvas 1080×1920
//   • Sur natif : @capacitor/filesystem write → @capacitor/share avec files=[path]
//   • Sur web fallback : download .png
//
// Props :
//   route : [{lat,lng}] (coords GPS)
//   summary : { distanceM, durationS, paceSPerKm }
//   onClose : fn

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { isNative } from "../lib/native";
import { formatPace, formatDuration, formatDistance } from "../lib/runTracker";
import { toast } from "./Toast";
import haptic from "../lib/haptic";

const G = "#02d1ba";
const HINT_KEY = "rb_share_pinch_hint_seen";

const COLORS = [
  { c: "#ffffff", end: "#fc4c02", label: "Blanc" },
  { c: "#02d1ba", end: "#02d1ba", label: "RB" },
  { c: "#fc4c02", end: "#ffffff", label: "Strava" },
  { c: "#fbbf24", end: "#ffffff", label: "Or" },
  { c: "#a855f7", end: "#ffffff", label: "Violet" },
  { c: "#000000", end: "#02d1ba", label: "Noir" },
];

const LAYOUTS = [
  { k: "strava", label: "Strava" },
  { k: "big", label: "Big" },
  { k: "min", label: "Min" },
];

// Convertit route_coords (lat/lng) en SVG path normalisé dans une box donnée.
// Retourne { d, end:{x,y} } ou null si pas assez de points.
function routeToSvgPath(route, boxW, boxH, padding = 12) {
  if (!Array.isArray(route) || route.length < 2) return null;
  const lats = route.map((p) => p.lat).filter((v) => Number.isFinite(v));
  const lngs = route.map((p) => p.lng).filter((v) => Number.isFinite(v));
  if (lats.length < 2) return null;
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const w = boxW - padding * 2;
  const h = boxH - padding * 2;
  const dLat = maxLat - minLat || 1e-6;
  const dLng = maxLng - minLng || 1e-6;
  // Préserver le ratio : on choisit la dimension contrainte
  const scaleX = w / dLng;
  const scaleY = h / dLat;
  const scale = Math.min(scaleX, scaleY);
  const projW = dLng * scale;
  const projH = dLat * scale;
  const offX = padding + (w - projW) / 2;
  const offY = padding + (h - projH) / 2;
  const pts = route.map((p) => {
    const x = offX + (p.lng - minLng) * scale;
    // Inverser Y : lat augmente vers le nord = vers le haut visuel
    const y = offY + (maxLat - p.lat) * scale;
    return { x, y };
  });
  const d = pts
    .map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
    .join(" ");
  return { d, end: pts[pts.length - 1] };
}

export default function RunShareStory({ route, summary, onClose, preloadedPhoto = null, weather = null }) {
  // Le path de la trace est calculé une fois pour une viewBox 240×200
  const tracePath = useMemo(
    () => routeToSvgPath(route || [], 240, 200, 14),
    [route]
  );

  // État
  const [bgUrl, setBgUrl] = useState(preloadedPhoto);
  const [color, setColor] = useState(COLORS[0]);
  const [layout, setLayout] = useState("strava");
  const [tab, setTab] = useState("trace");
  const [sheetCollapsed, setSheetCollapsed] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Position / taille / rotation de la trace en pourcentages (relatifs au story)
  const [box, setBox] = useState({ leftPct: 18, topPct: 28, widthPct: 64, heightPct: 32, rot: 0 });
  const storyRef = useRef(null);
  const boxRef = useRef(null);
  const gestureRef = useRef(null);

  // ─── Hint pinch (1× max) ───
  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    if (localStorage.getItem(HINT_KEY)) return;
    const t = setTimeout(() => setHintVisible(true), 500);
    const u = setTimeout(() => setHintVisible(false), 3000);
    return () => { clearTimeout(t); clearTimeout(u); };
  }, []);
  function dismissHint() {
    setHintVisible(false);
    try { localStorage.setItem(HINT_KEY, "1"); } catch (_) {}
  }

  // ─── Picker photo galerie ───
  async function pickPhoto() {
    try {
      if (isNative()) {
        const photo = await Camera.getPhoto({
          quality: 92,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Photos,
        });
        if (photo?.dataUrl) setBgUrl(photo.dataUrl);
      } else {
        // Fallback web : input file
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = (e) => {
          const f = e.target.files?.[0];
          if (f) setBgUrl(URL.createObjectURL(f));
        };
        input.click();
      }
    } catch (e) {
      console.warn("[shareStory] pickPhoto:", e);
    }
  }

  // ─── Gestures sur la trace ───
  function pointDist(a, b) {
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  }
  function pointAngle(a, b) {
    return (Math.atan2(b.clientY - a.clientY, b.clientX - a.clientX) * 180) / Math.PI;
  }

  function onTraceTouchStart(e) {
    e.preventDefault();
    dismissHint();
    const touches = e.touches;
    const sRect = storyRef.current.getBoundingClientRect();
    const bRect = boxRef.current.getBoundingClientRect();
    if (touches.length === 1) {
      gestureRef.current = {
        kind: "drag",
        startX: touches[0].clientX,
        startY: touches[0].clientY,
        origLeftPx: bRect.left - sRect.left,
        origTopPx: bRect.top - sRect.top,
        sRect,
      };
    } else if (touches.length >= 2) {
      gestureRef.current = {
        kind: "pinch",
        startDist: pointDist(touches[0], touches[1]),
        startAngle: pointAngle(touches[0], touches[1]),
        origWPx: bRect.width,
        origHPx: bRect.height,
        origLeftPx: bRect.left - sRect.left,
        origTopPx: bRect.top - sRect.top,
        origRot: box.rot,
        sRect,
      };
    }
  }

  function onTraceTouchMove(e) {
    if (!gestureRef.current) return;
    e.preventDefault();
    const touches = e.touches;
    const g = gestureRef.current;
    const sW = g.sRect.width;
    const sH = g.sRect.height;
    if (g.kind === "drag" && touches.length === 1) {
      const dx = touches[0].clientX - g.startX;
      const dy = touches[0].clientY - g.startY;
      const newLeftPx = g.origLeftPx + dx;
      const newTopPx = g.origTopPx + dy;
      setBox((b) => ({
        ...b,
        leftPct: (newLeftPx / sW) * 100,
        topPct: (newTopPx / sH) * 100,
      }));
    } else if (g.kind === "pinch" && touches.length >= 2) {
      const newDist = pointDist(touches[0], touches[1]);
      const newAngle = pointAngle(touches[0], touches[1]);
      const scale = Math.max(0.3, newDist / g.startDist);
      const newW = Math.max(60, g.origWPx * scale);
      const newH = Math.max(50, g.origHPx * scale);
      const cx = g.origLeftPx + g.origWPx / 2;
      const cy = g.origTopPx + g.origHPx / 2;
      const newLeft = cx - newW / 2;
      const newTop = cy - newH / 2;
      const rot = g.origRot + (newAngle - g.startAngle);
      setBox({
        leftPct: (newLeft / sW) * 100,
        topPct: (newTop / sH) * 100,
        widthPct: (newW / sW) * 100,
        heightPct: (newH / sH) * 100,
        rot,
      });
    }
  }

  function onTraceTouchEnd() {
    gestureRef.current = null;
  }

  // ─── Export canvas 1080×1920 + share ───
  async function generateAndShare() {
    if (exporting) return;
    setExporting(true);
    haptic.medium();
    try {
      const W = 1080;
      const H = 1920;
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");

      // 1. Background photo (ou fallback dégradé sombre)
      if (bgUrl) {
        const img = await loadImage(bgUrl);
        drawCoverImage(ctx, img, W, H);
      } else {
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, "#0a0a0a");
        grad.addColorStop(1, "#1a1a1a");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      }

      // 2. Veil gradient
      const veil = ctx.createLinearGradient(0, 0, 0, H);
      veil.addColorStop(0, "rgba(0,0,0,0.45)");
      veil.addColorStop(0.22, "rgba(0,0,0,0)");
      veil.addColorStop(0.58, "rgba(0,0,0,0)");
      veil.addColorStop(1, "rgba(0,0,0,0.85)");
      ctx.fillStyle = veil;
      ctx.fillRect(0, 0, W, H);

      // 3. Brand top
      ctx.save();
      ctx.font = '900 26px "Inter", -apple-system, sans-serif';
      ctx.fillStyle = "#fff";
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 8;
      ctx.fillText("RB", 60, 180);
      ctx.fillStyle = G;
      ctx.fillText(".", 60 + ctx.measureText("RB").width, 180);
      ctx.fillStyle = "#fff";
      ctx.fillText("PERFORM", 60 + ctx.measureText("RB.").width, 180);
      ctx.restore();

      // 4. Trace SVG → bitmap
      if (tracePath) {
        const boxXPx = (box.leftPct / 100) * W;
        const boxYPx = (box.topPct / 100) * H;
        const boxWPx = (box.widthPct / 100) * W;
        const boxHPx = (box.heightPct / 100) * H;
        const stroke = 18; // épaisseur fixée premium
        const svgStr = buildTraceSvg(tracePath, boxWPx, boxHPx, color.c, color.end, stroke);
        const traceImg = await loadImage("data:image/svg+xml;utf8," + encodeURIComponent(svgStr));
        ctx.save();
        ctx.translate(boxXPx + boxWPx / 2, boxYPx + boxHPx / 2);
        ctx.rotate((box.rot * Math.PI) / 180);
        ctx.drawImage(traceImg, -boxWPx / 2, -boxHPx / 2, boxWPx, boxHPx);
        ctx.restore();
      }

      // 5. Stats bas
      drawStats(ctx, W, H, summary, layout);

      // 6. Export PNG
      const dataUrl = canvas.toDataURL("image/png", 0.92);

      // 7. Share
      if (isNative()) {
        const base64 = dataUrl.split(",")[1];
        const fileName = `run-${Date.now()}.png`;
        await Filesystem.writeFile({
          path: fileName,
          data: base64,
          directory: Directory.Cache,
        });
        const uri = await Filesystem.getUri({
          path: fileName,
          directory: Directory.Cache,
        });
        await Share.share({
          title: "Ma course RB Perform",
          text: `${formatDistance(summary?.distanceM || 0)} · ${formatDuration(summary?.durationS || 0)}`,
          url: uri.uri,
          dialogTitle: "Partager ma course",
        });
        haptic.success();
      } else {
        // Web fallback : download
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `run-${Date.now()}.png`;
        a.click();
        toast.success("Image téléchargée");
      }
    } catch (e) {
      console.error("[shareStory] generate:", e);
      if (!String(e?.message || "").toLowerCase().includes("cancel")) {
        toast.error("Partage impossible");
      }
    } finally {
      setExporting(false);
    }
  }

  // ─── Render ───
  return (
    <div style={S.root}>
      {/* Hint pinch */}
      {hintVisible && (
        <div style={S.hint}>
          <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke={G} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}>
            <circle cx="8" cy="12" r="2.5" />
            <circle cx="16" cy="12" r="2.5" />
            <path d="M5 12 L2 9 M5 12 L2 15 M19 12 L22 9 M19 12 L22 15" />
          </svg>
          Pince à 2 doigts pour redimensionner
        </div>
      )}

      {/* Top bar */}
      <div style={S.topbarVeil} />
      <div style={S.topbar}>
        <button style={S.closeBtn} onClick={onClose}>
          <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <button style={S.shareBtn(exporting)} onClick={generateAndShare} disabled={exporting}>
          <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="#050505" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 7 }}>
            <path d="M12 3v13" />
            <path d="M7 8l5-5 5 5" />
            <path d="M5 14v5a2 2 0 002 2h10a2 2 0 002-2v-5" />
          </svg>
          {exporting ? "Génération…" : "Partager"}
        </button>
      </div>

      {/* Stage */}
      <div style={S.stage}>
        <div ref={storyRef} style={S.story}>
          {/* Background */}
          {bgUrl ? (
            <div style={{ ...S.bg, backgroundImage: `url('${bgUrl}')` }} />
          ) : (
            <div style={S.bgFallback}>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", textAlign: "center", padding: 24 }}>
                Choisis une photo depuis l'onglet <strong style={{ color: G }}>Photo</strong> pour le fond
              </div>
            </div>
          )}
          <div style={S.veil} />

          {/* Brand */}
          <div style={S.brand}>
            RB<span style={{ color: G }}>.</span>PERFORM
          </div>

          {/* Trace */}
          {tracePath ? (
            <div
              ref={boxRef}
              onTouchStart={onTraceTouchStart}
              onTouchMove={onTraceTouchMove}
              onTouchEnd={onTraceTouchEnd}
              style={{
                position: "absolute",
                left: `${box.leftPct}%`,
                top: `${box.topPct}%`,
                width: `${box.widthPct}%`,
                height: `${box.heightPct}%`,
                transform: `rotate(${box.rot}deg)`,
                transformOrigin: "center center",
                zIndex: 5,
                touchAction: "none",
                cursor: "grab",
              }}
            >
              <svg viewBox="0 0 240 200" preserveAspectRatio="none" style={{ width: "100%", height: "100%", overflow: "visible", pointerEvents: "none" }}>
                <path
                  d={tracePath.d}
                  fill="none"
                  stroke={color.c}
                  strokeWidth={5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ filter: `drop-shadow(0 0 8px ${color.c === "#ffffff" ? "rgba(0,0,0,0.7)" : color.c + "cc"})` }}
                />
                <circle cx={tracePath.end.x} cy={tracePath.end.y} r={6} fill={color.end} stroke="#fff" strokeWidth={2.5} />
              </svg>
            </div>
          ) : (
            <div style={S.noTrace}>Pas assez de points GPS pour dessiner la trace</div>
          )}

          {/* Stats bottom */}
          <div
            style={{
              ...S.statsWrap,
              bottom: sheetCollapsed ? "calc(env(safe-area-inset-bottom, 0px) + 90px)" : "calc(env(safe-area-inset-bottom, 0px) + 280px)",
            }}
          >
            <StatsBlock layout={layout} summary={summary} />
          </div>
        </div>
      </div>

      {/* Bottom sheet */}
      <div
        style={{
          ...S.sheet,
          transform: sheetCollapsed
            ? "translateY(calc(100% - 70px - env(safe-area-inset-bottom, 0px)))"
            : "translateY(0)",
        }}
      >
        <div style={S.sheetHandle} onClick={() => setSheetCollapsed((v) => !v)}>
          <div style={S.sheetHandleBar} />
        </div>

        <div style={S.tabs}>
          {[
            { k: "trace", label: "Tracé" },
            { k: "layout", label: "Layout" },
            { k: "photo", label: "Photo" },
          ].map((t) => (
            <button key={t.k} style={S.tab(tab === t.k)} onClick={() => setTab(t.k)}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={S.pane}>
          {tab === "trace" && (
            <div style={S.swatchRow}>
              {COLORS.map((co) => (
                <button
                  key={co.c}
                  onClick={() => setColor(co)}
                  style={S.swatch(co.c, color.c === co.c)}
                  aria-label={co.label}
                />
              ))}
            </div>
          )}

          {tab === "layout" && (
            <div style={S.layoutRow}>
              {LAYOUTS.map((l) => (
                <button key={l.k} onClick={() => setLayout(l.k)} style={S.layoutBtn(layout === l.k)}>
                  {l.label}
                </button>
              ))}
            </div>
          )}

          {tab === "photo" && (
            <div style={S.photoRow}>
              <button style={S.photoBtn} onClick={pickPhoto}>
                🖼️ Galerie
              </button>
              <button
                style={S.photoBtn}
                onClick={() => setBox({ leftPct: 18, topPct: 28, widthPct: 64, heightPct: 32, rot: 0 })}
              >
                ↺ Reset trace
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───

function StatsBlock({ layout, summary }) {
  const dist = formatDistance(summary?.distanceM || 0);
  const dur = formatDuration(summary?.durationS || 0);
  const pace = summary?.paceSPerKm ? formatPace(summary.paceSPerKm) : "--:--";

  if (layout === "strava") {
    return (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}>
        <div style={{ flex: 1 }}>
          <div style={S.statV}>{dist.replace(" km", "")}<small style={S.statSmall}>km</small></div>
          <div style={S.statL}>Distance</div>
        </div>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={S.statV}>{dur}</div>
          <div style={S.statL}>Temps</div>
        </div>
        <div style={{ flex: 1, textAlign: "right" }}>
          <div style={S.statV}>{pace}<small style={S.statSmall}>/km</small></div>
          <div style={S.statL}>Allure</div>
        </div>
      </div>
    );
  }
  if (layout === "big") {
    return (
      <div style={{ textShadow: "0 3px 14px rgba(0,0,0,0.7)" }}>
        <div style={S.distBig}>{dist.replace(" km", "")}<small style={S.distBigSmall}>km</small></div>
        <div style={S.metaBig}>
          {dur}
          <span style={{ color: "rgba(255,255,255,0.4)", margin: "0 8px" }}>·</span>
          <span style={{ color: G }}>{pace} /km</span>
        </div>
      </div>
    );
  }
  // min
  return (
    <div style={{ ...S.statSingle, textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}>
      {dist}
      <span style={{ color: "rgba(255,255,255,0.4)", margin: "0 8px" }}>·</span>
      {dur}
      <span style={{ color: "rgba(255,255,255,0.4)", margin: "0 8px" }}>·</span>
      <span style={{ color: G }}>{pace} /km</span>
    </div>
  );
}

// ─── Helpers canvas ───

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawCoverImage(ctx, img, W, H) {
  const ratio = img.width / img.height;
  const target = W / H;
  let sx, sy, sw, sh;
  if (ratio > target) {
    sh = img.height;
    sw = img.height * target;
    sx = (img.width - sw) / 2;
    sy = 0;
  } else {
    sw = img.width;
    sh = img.width / target;
    sx = 0;
    sy = (img.height - sh) / 2;
  }
  // Légère atténuation pour cohérence avec le veil de la preview
  ctx.save();
  ctx.filter = "brightness(0.78) contrast(1.05)";
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
  ctx.restore();
}

function buildTraceSvg(tp, w, h, stroke, end, strokeWidth) {
  // Génère un SVG indépendant avec viewBox 240×200 et la path tracée + glow
  const glow = stroke === "#ffffff" ? "rgba(0,0,0,0.7)" : end + "cc";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 200" width="${w}" height="${h}">
    <defs>
      <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="3" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <path d="${tp.d}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)" />
    <circle cx="${tp.end.x}" cy="${tp.end.y}" r="9" fill="${end}" stroke="#fff" stroke-width="3" />
  </svg>`;
}

function drawStats(ctx, W, H, summary, layout) {
  const dist = formatDistance(summary?.distanceM || 0).replace(" km", "");
  const dur = formatDuration(summary?.durationS || 0);
  const pace = summary?.paceSPerKm ? formatPace(summary.paceSPerKm) : "--:--";
  const marginX = 64;
  const baseY = H - 220; // safe area-ish

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 16;

  if (layout === "strava") {
    // 3 colonnes : Distance · Temps · Allure
    const cols = [
      { v: dist, small: "km", l: "Distance", align: "left" },
      { v: dur, small: "", l: "Temps", align: "center" },
      { v: pace, small: "/km", l: "Allure", align: "right" },
    ];
    cols.forEach((col, i) => {
      let x;
      if (col.align === "left") x = marginX;
      if (col.align === "center") x = W / 2;
      if (col.align === "right") x = W - marginX;
      ctx.textAlign = col.align;
      ctx.font = '900 84px "Inter", -apple-system, sans-serif';
      ctx.fillStyle = "#fff";
      const valW = ctx.measureText(col.v).width;
      ctx.fillText(col.v, x, baseY);
      if (col.small) {
        ctx.font = '800 42px "Inter", -apple-system, sans-serif';
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        const dx = col.align === "right" ? -valW - 8 : col.align === "center" ? valW / 2 + 8 : valW + 8;
        ctx.textAlign = col.align === "right" ? "right" : "left";
        ctx.fillText(col.small, col.align === "right" ? x - valW - 8 : col.align === "center" ? x + valW / 2 + 8 : x + valW + 8, baseY);
      }
      // Label
      ctx.textAlign = col.align;
      ctx.font = '800 24px "Inter", -apple-system, sans-serif';
      ctx.fillStyle = "rgba(255,255,255,0.78)";
      ctx.fillText(col.l.toUpperCase(), x, baseY + 56);
    });
  } else if (layout === "big") {
    ctx.textAlign = "left";
    ctx.fillStyle = "#fff";
    ctx.font = '900 180px "Inter", -apple-system, sans-serif';
    const distW = ctx.measureText(dist).width;
    ctx.fillText(dist, marginX, baseY + 40);
    ctx.font = '800 70px "Inter", -apple-system, sans-serif';
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText("km", marginX + distW + 12, baseY + 40);
    ctx.font = '800 48px "Inter", -apple-system, sans-serif';
    ctx.fillStyle = "#fff";
    const durTxt = `${dur}  ·  `;
    ctx.fillText(durTxt, marginX, baseY + 110);
    const durW = ctx.measureText(durTxt).width;
    ctx.fillStyle = G;
    ctx.fillText(`${pace} /km`, marginX + durW, baseY + 110);
  } else {
    // min
    ctx.textAlign = "left";
    ctx.font = '800 56px "Inter", -apple-system, sans-serif';
    ctx.fillStyle = "#fff";
    const txt1 = `${dist} km  ·  ${dur}  ·  `;
    ctx.fillText(txt1, marginX, baseY + 40);
    const w1 = ctx.measureText(txt1).width;
    ctx.fillStyle = G;
    ctx.fillText(`${pace} /km`, marginX + w1, baseY + 40);
  }
  ctx.restore();

  // Brand top
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 10;
  ctx.font = '900 32px "Inter", -apple-system, sans-serif';
  ctx.textAlign = "left";
  ctx.fillStyle = "#fff";
  const rb = "RB";
  const dot = ".";
  const perform = "PERFORM";
  ctx.fillText(rb, 64, 200);
  let cursor = 64 + ctx.measureText(rb).width;
  ctx.fillStyle = G;
  ctx.fillText(dot, cursor, 200);
  cursor += ctx.measureText(dot).width;
  ctx.fillStyle = "#fff";
  ctx.fillText(perform, cursor, 200);
  ctx.restore();
}

// ─── Styles ───
const S = {
  root: {
    position: "fixed",
    inset: 0,
    background: "#000",
    color: "#fff",
    zIndex: 9999,
    fontFamily: "'Inter', -apple-system, sans-serif",
    overflow: "hidden",
    touchAction: "none",
  },
  topbarVeil: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    height: "calc(env(safe-area-inset-top, 0px) + 64px)",
    background: "linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%)",
    pointerEvents: "none",
    zIndex: 50,
  },
  topbar: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    padding: "calc(env(safe-area-inset-top, 0px) + 12px) 16px 12px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 51,
  },
  closeBtn: {
    background: "rgba(0,0,0,0.5)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.15)",
    width: 40,
    height: 40,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
  },
  shareBtn: (busy) => ({
    background: busy ? "rgba(2,209,186,0.5)" : G,
    color: "#050505",
    border: "none",
    height: 40,
    padding: "0 18px 0 16px",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 900,
    letterSpacing: 0.3,
    display: "flex",
    alignItems: "center",
    cursor: busy ? "default" : "pointer",
    boxShadow: "0 6px 20px rgba(2,209,186,0.3)",
  }),
  stage: {
    position: "fixed",
    inset: 0,
    display: "grid",
    placeItems: "center",
    background: "#000",
  },
  story: {
    position: "relative",
    width: "100%",
    height: "100%",
    maxWidth: "calc((100vh - 220px) * 0.5625)",
    aspectRatio: "9 / 16",
    background: "#050505",
    overflow: "hidden",
  },
  bg: {
    position: "absolute",
    inset: 0,
    backgroundSize: "cover",
    backgroundPosition: "center",
    filter: "brightness(0.78) contrast(1.05)",
    zIndex: 0,
  },
  bgFallback: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(180deg, #0a0a0a 0%, #1a1a1a 100%)",
    display: "grid",
    placeItems: "center",
    zIndex: 0,
  },
  veil: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    zIndex: 1,
    background: "linear-gradient(180deg, rgba(0,0,0,0.45) 0%, transparent 22%, transparent 58%, rgba(0,0,0,0.85) 100%)",
  },
  brand: {
    position: "absolute",
    top: "calc(env(safe-area-inset-top, 0px) + 70px)",
    left: 18,
    zIndex: 4,
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 0.5,
    textShadow: "0 1px 4px rgba(0,0,0,0.5)",
    pointerEvents: "none",
  },
  noTrace: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    zIndex: 5,
    background: "rgba(0,0,0,0.6)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: "12px 18px",
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    pointerEvents: "none",
  },
  statsWrap: {
    position: "absolute",
    left: 18,
    right: 18,
    zIndex: 4,
    pointerEvents: "none",
    transition: "bottom 0.25s",
  },
  statV: { fontSize: 26, fontWeight: 900, letterSpacing: -1.2, lineHeight: 1 },
  statSmall: { fontSize: 13, fontWeight: 800, opacity: 0.85, marginLeft: 2, letterSpacing: -0.4 },
  statL: { fontSize: 8, letterSpacing: 2.2, textTransform: "uppercase", fontWeight: 700, color: "rgba(255,255,255,0.78)", marginTop: 6 },
  distBig: { fontSize: 56, fontWeight: 900, letterSpacing: -2.6, lineHeight: 0.9 },
  distBigSmall: { fontSize: 20, letterSpacing: -1, marginLeft: 4, fontWeight: 800, color: "rgba(255,255,255,0.85)" },
  metaBig: { fontSize: 15, fontWeight: 800, marginTop: 10, letterSpacing: -0.3 },
  statSingle: { fontSize: 18, fontWeight: 800, letterSpacing: -0.3 },
  sheet: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    background: "rgba(8,8,8,0.92)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderTop: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "22px 22px 0 0",
    paddingBottom: "env(safe-area-inset-bottom, 0px)",
    transition: "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
    boxShadow: "0 -10px 40px rgba(0,0,0,0.5)",
  },
  sheetHandle: {
    padding: "8px 0 6px",
    cursor: "grab",
    display: "grid",
    placeItems: "center",
  },
  sheetHandleBar: {
    width: 40,
    height: 4,
    background: "rgba(255,255,255,0.3)",
    borderRadius: 999,
  },
  tabs: {
    display: "flex",
    gap: 4,
    padding: "6px 12px 12px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  tab: (active) => ({
    flex: 1,
    background: active ? "rgba(2,209,186,0.08)" : "transparent",
    color: active ? G : "rgba(255,255,255,0.55)",
    border: "none",
    padding: "10px 4px",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 0.3,
    cursor: "pointer",
    borderRadius: 8,
    textTransform: "uppercase",
  }),
  pane: { padding: "18px 16px 22px" },
  swatchRow: { display: "flex", gap: 14, justifyContent: "space-between" },
  swatch: (color, active) => ({
    width: 48,
    height: 48,
    borderRadius: "50%",
    cursor: "pointer",
    border: active ? "3px solid #fff" : "3px solid rgba(255,255,255,0.15)",
    flexShrink: 0,
    background: color,
    transform: active ? "scale(1.08)" : "scale(1)",
    transition: "transform 0.12s, border-color 0.12s",
    padding: 0,
  }),
  layoutRow: { display: "flex", gap: 10 },
  layoutBtn: (active) => ({
    flex: 1,
    background: active ? "rgba(2,209,186,0.1)" : "rgba(255,255,255,0.05)",
    color: active ? G : "#fff",
    border: active ? "1px solid " + G : "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: "14px 8px",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  }),
  photoRow: { display: "flex", gap: 10, flexWrap: "wrap" },
  photoBtn: {
    flex: 1,
    minWidth: 100,
    background: "rgba(255,255,255,0.05)",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: "14px",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  hint: {
    position: "fixed",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    zIndex: 60,
    background: "rgba(8,8,8,0.85)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 14,
    padding: "14px 18px",
    display: "flex",
    alignItems: "center",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.2,
    color: "rgba(255,255,255,0.92)",
    pointerEvents: "none",
    boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
    animation: "fadeIn 0.3s ease-out",
  },
};
