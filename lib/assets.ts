// lib/assets.ts
// Videos e imágenes → Sirv CDN. Audio → /public/audio/ (Sirv no sirve MP3).
const SIRV = "https://claude.sirv.com/velra-funnel";
const AUDIO = "/audio";

export const ASSETS = {
  // Audio (Vercel public/)
  audio_llamada: `${AUDIO}/audio_llamada.mp3`,
  voz_1_edad: `${AUDIO}/voz_1_edad.mp3`,
  voz_2_probetodo: `${AUDIO}/voz_2_probetodo.mp3`,
  voz_3_constancia: `${AUDIO}/voz_3_constancia.mp3`,
  sfx_tono_llamada: `${AUDIO}/sfx_tono_llamada.mp3`,
  sfx_notif_whatsapp: `${AUDIO}/sfx_notif_whatsapp.mp3`,
  sfx_mensaje_whatsapp: `${AUDIO}/sfx_mensaje_whatsapp.mp3`,
  // Video e imágenes (Sirv) — subir ?v=N fuerza recarga tras reemplazar archivos
  video_intro_llamada: `${SIRV}/video_intro_llamada.mp4?v=3`,
  video_transicion_teclea: `${SIRV}/video_transicion_teclea.mp4?v=3`,
  video_1_fascia: `${SIRV}/video_1_fascia.mp4?v=3`,
  video_2_mecanismo: `${SIRV}/video_2_mecanismo.mp4?v=3`,
  video_3_ugc: `${SIRV}/video_3_ugc.mp4?v=3`,
  foto_dra_perfil: `${SIRV}/foto_dra_perfil.png?v=3`,
  foto_producto: `${SIRV}/foto_producto.png?v=3`,
  landing_bg: `${SIRV}/landing_bg.png?v=3`,
  bg_llamada_entrante: `${SIRV}/bg_llamada_entrante.png?v=3`,
} as const;

export type AssetKey = keyof typeof ASSETS;
