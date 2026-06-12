// lib/assets.ts
// URL base de Sirv. Alex sube y reemplaza los assets manualmente en Sirv;
// el código nunca cambia. Placeholders (404) hasta que existan: todos los
// componentes de media tienen fallback visual.
const SIRV = "https://claude.sirv.com/velra-funnel";

export const ASSETS = {
  audio_llamada: `${SIRV}/audio_llamada.mp3`,
  voz_1_edad: `${SIRV}/voz_1_edad.mp3`,
  voz_2_probetodo: `${SIRV}/voz_2_probetodo.mp3`,
  voz_3_constancia: `${SIRV}/voz_3_constancia.mp3`,
  video_intro_llamada: `${SIRV}/video_intro_llamada.mp4`,
  video_transicion_teclea: `${SIRV}/video_transicion_teclea.mp4`,
  video_1_fascia: `${SIRV}/video_1_fascia.mp4`,
  video_2_mecanismo: `${SIRV}/video_2_mecanismo.mp4`,
  video_3_ugc: `${SIRV}/video_3_ugc.mp4`,
  foto_dra_perfil: `${SIRV}/foto_dra_perfil.jpg`,
  foto_producto: `${SIRV}/foto_producto.jpg`,
  landing_bg: `${SIRV}/landing_bg.jpg`,
  sfx_tono_llamada: `${SIRV}/sfx_tono_llamada.mp3`,
  sfx_notif_whatsapp: `${SIRV}/sfx_notif_whatsapp.mp3`,
  sfx_mensaje_whatsapp: `${SIRV}/sfx_mensaje_whatsapp.mp3`,
} as const;

export type AssetKey = keyof typeof ASSETS;
