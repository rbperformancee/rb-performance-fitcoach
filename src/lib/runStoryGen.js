// runStoryGen.js
//
// Générateur des stories de partage de run (RB Perform).
// Rend 2 layouts (V1 / V2) en JPEG via Canvas API, taille story Instagram
// 1080×1920. Utilisé après un run dans le summary de RunSession :
//   1. L'athlète prend une photo (caméra/galerie)
//   2. On rend la photo en background + brand + 3 stats overlay
//   3. On retourne un dataURL JPEG prêt à partager
//
// Volontairement sans dépendance — Canvas natif + fonts via -apple-system
// (iOS/Safari rend SF Pro Display Black à 900 par défaut).

const STORY_W = 1080;
const STORY_H = 1920;
const CYAN = "#02d1ba";

// Charge une image depuis dataURL/file URI/blob. Retourne HTMLImageElement.
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = src;
  });
}

// Dessine la photo en mode cover (rempli le canvas, crop au besoin).
function drawCover(ctx, img, W, H, brightness = 0.55) {
  const ratio = img.width / img.height;
  const target = W / H;
  let sx, sy, sw, sh;
  if (ratio > target) { sh = img.height; sw = sh * target; sx = (img.width - sw) / 2; sy = 0; }
  else { sw = img.width; sh = sw / target; sx = 0; sy = (img.height - sh) / 2; }
  ctx.save();
  ctx.filter = `brightness(${brightness}) contrast(1.05) saturate(0.9)`;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
  ctx.restore();
}

// Overlay gradient pour rendre les textes lisibles sur photo claire.
function drawOverlay(ctx, W, H) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "rgba(0,0,0,0.3)");
  g.addColorStop(0.25, "rgba(0,0,0,0.1)");
  g.addColorStop(0.65, "rgba(0,0,0,0.55)");
  g.addColorStop(1, "rgba(0,0,0,0.92)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// Brand text avec le "." cyan signature.
function drawBrandText(ctx, x, y, fontSize, align = "left") {
  ctx.font = `900 ${fontSize}px -apple-system, "SF Pro Display", Inter, sans-serif`;
  ctx.textAlign = align;
  ctx.fillStyle = "#fff";
  ctx.shadowColor = "rgba(0,0,0,0.7)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 4;
  // Mesure pour positionner le "." cyan
  const rbW = ctx.measureText("RB").width;
  const dotW = ctx.measureText(".").width;
  if (align === "left") {
    ctx.fillText("RB", x, y);
    ctx.fillStyle = CYAN;
    ctx.fillText(".", x + rbW, y);
    ctx.fillStyle = "#fff";
    ctx.fillText("PERFORM", x + rbW + dotW, y);
  } else if (align === "right") {
    const total = rbW + dotW + ctx.measureText("PERFORM").width;
    const startX = x - total;
    ctx.textAlign = "left";
    ctx.fillText("RB", startX, y);
    ctx.fillStyle = CYAN;
    ctx.fillText(".", startX + rbW, y);
    ctx.fillStyle = "#fff";
    ctx.fillText("PERFORM", startX + rbW + dotW, y);
  } else { // center
    const total = rbW + dotW + ctx.measureText("PERFORM").width;
    const startX = x - total / 2;
    ctx.textAlign = "left";
    ctx.fillText("RB", startX, y);
    ctx.fillStyle = CYAN;
    ctx.fillText(".", startX + rbW, y);
    ctx.fillStyle = "#fff";
    ctx.fillText("PERFORM", startX + rbW + dotW, y);
  }
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

// Stat block : valeur grosse + label en-dessous. Allure accent cyan.
function drawStat(ctx, value, unit, label, x, y, align, accent = false) {
  ctx.shadowColor = "rgba(0,0,0,0.7)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 4;
  // valeur
  ctx.font = `900 92px -apple-system, "SF Pro Display", Inter, sans-serif`;
  ctx.fillStyle = accent ? CYAN : "#fff";
  ctx.textAlign = align;
  const vW = ctx.measureText(value).width;
  ctx.fillText(value, x, y);
  // unité
  if (unit) {
    ctx.font = `700 33px -apple-system, "SF Pro Display", Inter, sans-serif`;
    ctx.fillStyle = accent ? "rgba(2,209,186,0.55)" : "rgba(255,255,255,0.55)";
    let unitX;
    if (align === "left") unitX = x + vW + 6;
    else if (align === "right") unitX = x - vW - 6;
    else unitX = x + vW / 2 + 6;
    ctx.textAlign = "left";
    if (align === "right") ctx.textAlign = "right";
    ctx.fillText(unit, unitX, y);
  }
  // label
  ctx.font = `800 24px -apple-system, "SF Pro Display", Inter, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.textAlign = align;
  // letter-spacing manuel : on espace chaque char
  const spacedLabel = label.toUpperCase().split("").join(" "); // thin space
  ctx.fillText(spacedLabel, x, y + 38);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

// Formate la date "11 JUIN · AVIGNON" depuis une Date + locality.
function formatDate(date, locality = "AVIGNON") {
  const months = ["JANV", "FÉVR", "MARS", "AVR", "MAI", "JUIN", "JUIL", "AOÛT", "SEPT", "OCT", "NOV", "DÉC"];
  return `${date.getDate()} ${months[date.getMonth()]} · ${locality}`;
}

/**
 * Génère une story JPEG (data URL) façon Strava avec la photo + stats.
 *
 * @param {Object} opts
 * @param {string} opts.photoDataUrl       — dataURL de la photo (camera/galerie)
 * @param {string} opts.distance           — ex "4,8 km"
 * @param {string} opts.duration           — ex "27:36"
 * @param {string} opts.pace               — ex "5:45 /km"
 * @param {Date}   opts.date               — date du run
 * @param {string} opts.locality           — ex "AVIGNON"
 * @param {"v1"|"v2"} opts.variant         — V1 = brand top L + date top R · V2 = date top center + brand mini above stats
 * @returns {Promise<string>} dataURL JPEG 1080×1920
 */
export async function generateRunStory({ photoDataUrl, distance, duration, pace, date = new Date(), locality = "AVIGNON", variant = "v1" }) {
  const canvas = document.createElement("canvas");
  canvas.width = STORY_W;
  canvas.height = STORY_H;
  const ctx = canvas.getContext("2d");

  // 1. Photo background
  try {
    const img = await loadImage(photoDataUrl);
    drawCover(ctx, img, STORY_W, STORY_H);
  } catch (_) {
    ctx.fillStyle = "#050505";
    ctx.fillRect(0, 0, STORY_W, STORY_H);
  }
  drawOverlay(ctx, STORY_W, STORY_H);

  // 2. Split valeur + unité (ex "4,8 km" → ["4,8", "km"])
  const splitVal = (s) => {
    const m = String(s).match(/^([\d:,\.]+)\s*(.*)$/);
    return m ? [m[1], m[2].trim()] : [String(s), ""];
  };
  const [distV, distU] = splitVal(distance);
  const [paceV, paceU] = splitVal(pace);
  const [durV, durU] = splitVal(duration);
  const dateStr = formatDate(date, locality);

  // 3. Layout V1 — brand top-left + date top-right
  if (variant === "v1") {
    // Top brand
    drawBrandText(ctx, 86, 180, 38, "left");
    // Top date
    ctx.font = `700 30px -apple-system, "SF Pro Display", Inter, sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.textAlign = "right";
    ctx.shadowColor = "rgba(0,0,0,0.7)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 4;
    ctx.fillText(dateStr, STORY_W - 86, 150);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }
  // Layout V2 — date top center + brand mini above stats left
  else {
    ctx.font = `700 30px -apple-system, "SF Pro Display", Inter, sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0,0,0,0.65)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 4;
    ctx.fillText(dateStr, STORY_W / 2, 220);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    // brand mini gauche au-dessus des stats
    drawBrandText(ctx, 86, STORY_H - 380, 49, "left");
  }

  // 4. Stats bottom — Distance | Temps | Allure (cyan)
  const statsY = STORY_H - 175;
  drawStat(ctx, distV, distU, "Distance", 86, statsY, "left");
  drawStat(ctx, durV, durU, "Temps", STORY_W / 2, statsY, "center");
  drawStat(ctx, paceV, paceU, "Allure", STORY_W - 86, statsY, "right", true);

  return canvas.toDataURL("image/jpeg", 0.92);
}
