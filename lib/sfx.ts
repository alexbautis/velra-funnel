// lib/sfx.ts
// Efectos de sonido (tono de llamada, notificación, mensaje de chat).
//
// PATRÓN iOS (no cambiar):
// - Los SFX NO viven como elementos <audio> en el DOM ni se precargan.
//   Cada uno se instancia con `new Audio(src)` en el momento exacto de
//   reproducirse y se libera al terminar. Así iOS nunca puede adelantar
//   una reproducción (iOS IGNORA element.volume: un "play silencioso a
//   volumen 0" suena a volumen real en iPhone).
// - El desbloqueo de la sesión se hace UNA vez, dentro del tap de ENTRAR,
//   reproduciendo un WAV mudo de 0.1s. Eso marca el documento como
//   "interactuado con media" en WebKit y permite los play() programáticos
//   posteriores (fin de video → tono, timers del chat → mensaje).

let silentDataUri: string | null = null;
let silentEl: HTMLAudioElement | null = null;

/** WAV PCM 8-bit mono 8kHz, 0.1s de silencio (~850 bytes). */
function makeSilentWavDataUri(): string {
  const sampleRate = 8000;
  const numSamples = 800;
  const buf = new Uint8Array(44 + numSamples);
  const view = new DataView(buf.buffer);
  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) buf[off + i] = s.charCodeAt(i);
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + numSamples, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate, true); // byteRate (blockAlign = 1)
  view.setUint16(32, 1, true); // blockAlign
  view.setUint16(34, 8, true); // bitsPerSample
  writeStr(36, "data");
  view.setUint32(40, numSamples, true);
  buf.fill(0x80, 44); // silencio en PCM 8-bit
  let bin = "";
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  return "data:audio/wav;base64," + btoa(bin);
}

/**
 * Desbloquea el audio de la sesión en iOS. Llamar SOLO dentro de un
 * handler de tap real (ENTRAR, notificación). Reproduce un WAV mudo;
 * no toca ningún SFX real. Idempotente y sin efecto audible.
 */
export function unlockAudioSession() {
  if (typeof window === "undefined") return;
  try {
    if (!silentDataUri) silentDataUri = makeSilentWavDataUri();
    if (!silentEl) silentEl = new Audio(silentDataUri);
    silentEl.currentTime = 0;
    const p = silentEl.play();
    if (p) p.catch(() => {});
  } catch {
    /* noop */
  }
}

export interface SfxHandle {
  /** Detiene y libera el elemento. */
  stop: () => void;
}

/**
 * Instancia y reproduce un SFX AHORA. Nunca lanza. El elemento se libera
 * al terminar (one-shot) o al llamar stop() (loops).
 * Nota: iOS ignora `volume` (siempre suena a volumen de hardware);
 * en Android sí se aplica.
 */
export function playSfx(
  src: string,
  { loop = false, volume = 0.35 }: { loop?: boolean; volume?: number } = {}
): SfxHandle {
  if (typeof window === "undefined") return { stop() {} };
  let audio: HTMLAudioElement | null = null;
  try {
    audio = new Audio(src);
    audio.loop = loop;
    audio.volume = volume;
    const p = audio.play();
    if (p) p.catch(() => {});
    if (!loop) {
      audio.onended = () => {
        if (audio) audio.src = "";
      };
    }
  } catch {
    /* asset ausente o autoplay bloqueado: silencio, nunca romper */
  }
  return {
    stop() {
      try {
        if (audio) {
          audio.pause();
          audio.src = "";
          audio = null;
        }
      } catch {
        /* noop */
      }
    },
  };
}
