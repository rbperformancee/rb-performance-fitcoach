// src/lib/weather.js
//
// Open-Meteo client minimal. Free, sans clé, ratés tolérés.
// API doc : https://open-meteo.com/en/docs
//
// Retourne :
//   {
//     tempC: 18.3,
//     windKmh: 12,
//     humidityPct: 65,
//     code: 3,                 // WMO weather code
//     emoji: "⛅",
//     label: "Nuageux",
//   }

const WMO = {
  0: { emoji: "☀️", label: "Soleil" },
  1: { emoji: "🌤️", label: "Peu nuageux" },
  2: { emoji: "⛅", label: "Nuageux" },
  3: { emoji: "☁️", label: "Couvert" },
  45: { emoji: "🌫️", label: "Brouillard" },
  48: { emoji: "🌫️", label: "Brouillard givrant" },
  51: { emoji: "🌦️", label: "Bruine légère" },
  53: { emoji: "🌦️", label: "Bruine" },
  55: { emoji: "🌦️", label: "Bruine dense" },
  61: { emoji: "🌧️", label: "Pluie légère" },
  63: { emoji: "🌧️", label: "Pluie" },
  65: { emoji: "🌧️", label: "Pluie forte" },
  71: { emoji: "🌨️", label: "Neige légère" },
  73: { emoji: "🌨️", label: "Neige" },
  75: { emoji: "❄️", label: "Neige forte" },
  77: { emoji: "🌨️", label: "Grésil" },
  80: { emoji: "🌦️", label: "Averses" },
  81: { emoji: "🌧️", label: "Averses fortes" },
  82: { emoji: "⛈️", label: "Averses violentes" },
  85: { emoji: "🌨️", label: "Averses de neige" },
  86: { emoji: "❄️", label: "Averses de neige fortes" },
  95: { emoji: "⛈️", label: "Orage" },
  96: { emoji: "⛈️", label: "Orage + grêle" },
  99: { emoji: "⚡", label: "Orage violent" },
};

function codeMeta(c) {
  return WMO[c] || { emoji: "🌡️", label: "Conditions" };
}

/**
 * Fetch weather actuel pour les coords données.
 * Timeout 4s — si pas de réponse on retourne null sans bloquer le run.
 */
export async function fetchCurrentWeather({ lat, lng, timeoutMs = 4000 } = {}) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&wind_speed_unit=kmh&timezone=auto`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const data = await res.json();
    const cur = data?.current;
    if (!cur) return null;
    const code = Number(cur.weather_code);
    const meta = codeMeta(code);
    return {
      tempC: Math.round(cur.temperature_2m * 10) / 10,
      windKmh: Math.round(cur.wind_speed_10m),
      humidityPct: Math.round(cur.relative_humidity_2m),
      code,
      emoji: meta.emoji,
      label: meta.label,
    };
  } catch (e) {
    clearTimeout(t);
    // eslint-disable-next-line no-console
    console.warn("[weather] fetch failed:", e?.message || e);
    return null;
  }
}
