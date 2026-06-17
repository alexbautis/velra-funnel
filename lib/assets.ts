// lib/assets.ts
// Imágenes → Sirv CDN. Audio → /public/audio/ (Sirv no sirve MP3).
// Videos del chat → /public/video/ (optimizados: 720p CRF24 +faststart, ~7-9 MB
// vs 38-54 MB en Sirv sin faststart; arrancan al instante por streaming).
const SIRV = "https://claude.sirv.com/velra-funnel";
const AUDIO = "/audio";
const VIDEO = "/video";

export const ASSETS = {
  // Audio (Vercel public/)
  audio_llamada: `${AUDIO}/audio_llamada.mp3`,
  voz_1_edad: `${AUDIO}/voz_1_edad.mp3`,
  voz_2_probetodo: `${AUDIO}/voz_2_probetodo.mp3`,
  voz_3_constancia: `${AUDIO}/voz_3_constancia.mp3`,
  sfx_tono_llamada: `${AUDIO}/sfx_tono_llamada.mp3`,
  sfx_notif_whatsapp: `${AUDIO}/sfx_notif_whatsapp.mp3`,
  sfx_mensaje_whatsapp: `${AUDIO}/sfx_mensaje_whatsapp.mp3`,
  // Videos cortos de la llamada (Sirv, ~1 MB, cargan al instante)
  video_intro_llamada: `${SIRV}/video_intro_llamada.mp4?v=3`,
  video_transicion_teclea: `${SIRV}/video_transicion_teclea.mp4?v=3`,
  // Videos del chat optimizados (Vercel public/, faststart)
  video_1_fascia: `${VIDEO}/video_1_fascia.mp4`,
  video_2_mecanismo: `${VIDEO}/video_2_mecanismo.mp4`,
  video_3_ugc: `${VIDEO}/video_3_ugc.mp4`,
  foto_dra_perfil: `${SIRV}/foto_dra_perfil.png?v=3`,
  foto_producto: `${SIRV}/foto_producto.png?v=3`,
  landing_bg: `${SIRV}/landing_bg.png?v=3`,
  bg_llamada_entrante: `${SIRV}/bg_llamada_entrante.png?v=3`,
  // Imagen del producto para la tarjeta del chat (Vercel public/)
  producto_card: `/AAProduct.png`,
} as const;

export type AssetKey = keyof typeof ASSETS;
