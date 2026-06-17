// content/chat-script.ts
// SECUENCIA EXACTA DEL CHAT (brief 12 jun 2026). Copy final, no reescribir.
//
// Gating (brief): los mensajes 4-5 aparecen solo tras terminar el Video 1;
// los 7-9 tras el Video 2; el 11 tras el Video 3; los 15-17 tras la nota de
// voz 3. Cada paso `gate: true` detiene la secuencia hasta su evento de
// completado (fin de video / cierre del reproductor / fin de audio), con
// fallback temporal de 90s para nunca bloquear el avance.

import { ASSETS } from "@/lib/assets";

export type ChatStep =
  | { kind: "text"; text: string }
  | {
      kind: "video";
      id: "video1" | "video2" | "video3";
      src: string;
      poster: string;
      durationLabel: string;
      gate: true;
    }
  | {
      kind: "voice";
      id: "voz1" | "voz2" | "voz3";
      src: string;
      durationLabel: string;
      gate: true;
    }
  | {
      kind: "link";
      title: string;
      domain: string;
      image: string;
    };

export const DRA = {
  name: "Dra. Sofía Reyes",
  subtitle: "Especialista en drenaje linfático",
  photo: ASSETS.foto_dra_perfil,
  notificationPreview: "Prefiero escribirte esto porque…",
} as const;

export const CHAT_SCRIPT: ChatStep[] = [
  // 1
  {
    kind: "text",
    text: "Prefiero escribirte esto porque lo que quiero mostrarte necesitas verlo, no solo escucharlo",
  },
  // 2
  { kind: "text", text: "Mira esto" },
  // 3
  {
    kind: "video",
    id: "video1",
    src: ASSETS.video_1_fascia,
    poster: ASSETS.poster_1_fascia,
    durationLabel: "1:00",
    gate: true,
  },
  // 4
  {
    kind: "text",
    text: "Ahora entiendes por qué nada de lo que probaste podía funcionar",
  },
  // 5
  { kind: "text", text: "Pero hay algo más que necesitas ver" },
  // 6
  {
    kind: "video",
    id: "video2",
    src: ASSETS.video_2_mecanismo,
    poster: ASSETS.poster_2_mecanismo,
    durationLabel: "1:00",
    gate: true,
  },
  // 7
  {
    kind: "text",
    text: "Esa presión constante también se puede trabajar desde casa",
  },
  // 8
  { kind: "text", text: "Es lo que les recomiendo a mis pacientes" },
  // 9
  { kind: "text", text: "Mira lo que me envió una de ellas" },
  // 10
  {
    kind: "video",
    id: "video3",
    src: ASSETS.video_3_ugc,
    poster: ASSETS.poster_3_ugc,
    durationLabel: "0:35",
    gate: true,
  },
  // 11
  { kind: "text", text: "Sé lo que estás pensando ahora mismo" },
  // 12
  {
    kind: "voice",
    id: "voz1",
    src: ASSETS.voz_1_edad,
    durationLabel: "0:12",
    gate: true,
  },
  // 13
  {
    kind: "voice",
    id: "voz2",
    src: ASSETS.voz_2_probetodo,
    durationLabel: "0:12",
    gate: true,
  },
  // 14
  {
    kind: "voice",
    id: "voz3",
    src: ASSETS.voz_3_constancia,
    durationLabel: "0:12",
    gate: true,
  },
  // 15
  { kind: "text", text: "Solo hay una cosa que no te puedo enseñar por aquí" },
  // 16
  { kind: "text", text: "Cómo se siente en tu cuerpo" },
  // 17
  {
    kind: "text",
    text: "Te dejo aquí lo que les recomiendo a mis pacientes",
  },
  // 18
  {
    kind: "link",
    title: "Velra",
    domain: "thevelra.shop",
    image: ASSETS.producto_card,
  },
];
