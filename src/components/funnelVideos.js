// src/components/funnelVideos.js
//
// Centralise toutes les URLs des vidéos du funnel RB Perform.
// Remplace ici les URLs quand tu uploads les MP4 / Wistia / Mux.
//
// Convention : place les MP4 dans /public/videos/ et utilise des URLs relatives.
// Pour Mux/Wistia, mets l'URL HLS / iframe directement.

export const FUNNEL_VIDEOS = {
  // PAGE 1 — Landing /candidature
  vsl_principale: {
    src: "/videos/vsl-principale.mp4",        // ← swap quand tu as l'mp4
    poster: "/videos/posters/vsl-principale.jpg",
    duration: "6:30",
    title: "Comment je bosse avec mes athlètes",
  },

  // PAGE 3 — /candidature/confirmation
  cadrage_call: {
    src: "/videos/cadrage-call.mp4",
    poster: "/videos/posters/cadrage-call.jpg",
    duration: "2:00",
    title: "Comment va se passer notre appel",
  },
  pilier_1_methode: {
    src: "/videos/pilier-1-methode.mp4",
    poster: "/videos/posters/pilier-1.jpg",
    duration: "4:30",
    title: "Une méthode, pas dix",
  },
  pilier_2_app: {
    src: "/videos/pilier-2-app.mp4",
    poster: "/videos/posters/pilier-2.jpg",
    duration: "4:30",
    title: "L'app RB Perform",
  },
  pilier_3_accountability: {
    src: "/videos/pilier-3-accountability.mp4",
    poster: "/videos/posters/pilier-3.jpg",
    duration: "4:30",
    title: "L'accountability humaine",
  },
  pilier_4_programme_vivant: {
    src: "/videos/pilier-4-programme-vivant.mp4",
    poster: "/videos/posters/pilier-4.jpg",
    duration: "4:30",
    title: "Le programme vivant",
  },
  pilier_5_selection: {
    src: "/videos/pilier-5-selection.mp4",
    poster: "/videos/posters/pilier-5.jpg",
    duration: "4:30",
    title: "Pourquoi je prends 15 athlètes par mois",
  },

  // PAGE 5 — /post-vente
  welcome_post_vente: {
    src: "/videos/welcome-post-vente.mp4",
    poster: "/videos/posters/welcome.jpg",
    duration: "2:00",
    title: "T'es dedans — next steps",
  },

  // PAGE 1/3 BONUS — case study (à filmer mi-septembre 2026)
  case_study_raphael: {
    src: null,                                 // ← null tant que pas tourné
    poster: "/videos/posters/case-study.jpg",
    duration: "3:00",
    title: "Raphaël · 3 mois après",
  },
};

// Helper : vérifie si une vidéo est disponible (src non null)
export const isVideoAvailable = (key) => {
  const v = FUNNEL_VIDEOS[key];
  return v && v.src && v.src.length > 0;
};
