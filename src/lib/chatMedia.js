// chatMedia.js — upload de média (photo) pour la messagerie.
//
// Photo bilan envoyée dans le chat → bucket Storage `progress-photos`
// (public, policies RLS ajoutées migration 083). On redimensionne et
// recompresse côté client pour éviter d'uploader des photos de 8 Mo.

import { supabase } from "./supabase";

const PHOTO_BUCKET = "progress-photos";
const AUDIO_BUCKET = "audio-messages";
const MAX_DIM = 1280; // px — côté le plus long

// Redimensionne (max 1280px) + recompresse en JPEG. Respecte l'orientation
// EXIF (photos iPhone). Fallback : renvoie le fichier brut si quoi que ce
// soit échoue — l'upload se fera tel quel.
async function downscaleImage(file) {
  if (!file || !file.type || !file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    let { width, height } = bitmap;
    const longest = Math.max(width, height);
    if (longest <= MAX_DIM && file.size < 1_200_000) {
      bitmap.close?.();
      return file; // déjà raisonnable
    }
    const scale = Math.min(1, MAX_DIM / longest);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d").drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.82));
    return blob || file;
  } catch {
    return file;
  }
}

/**
 * Upload une photo de chat et renvoie son URL publique.
 * @param {File}   file     - fichier image choisi par l'utilisateur
 * @param {string} clientId - id du client de la conversation (préfixe du chemin)
 * @returns {Promise<string>} URL publique de la photo
 */
export async function uploadChatPhoto(file, clientId) {
  if (!file) throw new Error("Aucun fichier");
  const processed = await downscaleImage(file);
  const rand = Math.random().toString(36).slice(2, 8);
  const path = `${clientId || "chat"}/${Date.now()}-${rand}.jpg`;
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, processed, {
    contentType: processed.type || "image/jpeg",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Upload un message vocal (Blob audio enregistré) et renvoie son URL publique.
 * @param {Blob}   blob     - enregistrement audio (MediaRecorder)
 * @param {string} clientId - id du client de la conversation
 * @returns {Promise<string>} URL publique du fichier audio
 */
export async function uploadChatAudio(blob, clientId) {
  if (!blob || !blob.size) throw new Error("Enregistrement vide");
  const type = blob.type || "audio/webm";
  const ext = type.includes("mp4") || type.includes("aac") || type.includes("m4a")
    ? "m4a"
    : type.includes("ogg") ? "ogg" : "webm";
  const rand = Math.random().toString(36).slice(2, 8);
  const path = `${clientId || "chat"}/${Date.now()}-${rand}.${ext}`;
  const { error } = await supabase.storage.from(AUDIO_BUCKET).upload(path, blob, {
    contentType: type,
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
