// lib/sfx.ts
// Efectos de sonido (tono de llamada, notificación, mensaje de chat).
//
// PATRÓN iOS (no cambiar):
// - Vía principal: Web Audio API. En el tap de ENTRAR, unlockAudioSession()
//   arranca el AudioContext (dentro del gesto) y descarga + decodifica los
//   SFX en memoria. Un contexto desbloqueado puede reproducir buffers en
//   CUALQUIER momento posterior sin gesto — fin de video, timers del chat —
//   que es justo donde iOS bloquea los play() de elementos <audio>.
// - Cada reproducción crea un BufferSourceNode nuevo (son de un solo uso):
//   instancia fresca por sonido, nunca referencias reutilizadas.
// - Fallback: si el buffer aún no está decodificado o no hay Web Audio,
//   playSfx instancia `new Audio(src)` en el momento (Android siempre lo
//   permite; iOS solo cerca de un gesto).
// - NUNCA pre-reproducir SFX reales a volumen 0 para "desbloquear":
//   iOS IGNORA element.volume y sonarían a volumen real en el iPhone.

let silentDataUri: string | null = null;
let silentEl: HTMLAudioElement | null = null;

let audioCtx: AudioContext | null = null;
let keepAliveStarted = false;
const bufferCache = new Map<string, AudioBuffer>();
const inflight = new Map<string, Promise<AudioBuffer | null>>();

/** Mantiene el AudioContext "activo" con una fuente silenciosa en loop, para
 *  que iOS no lo suspenda por inactividad entre el tap de ENTRAR y el tono
 *  (que suena solo, sin gesto). Una sola vez. */
function startKeepAlive(ctx: AudioContext) {
  if (keepAliveStarted) return;
  try {
    const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); // 1s silencio
    const node = ctx.createBufferSource();
    node.buffer = buf;
    node.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    node.connect(gain);
    gain.connect(ctx.destination);
    node.start(0);
    keepAliveStarted = true;
  } catch {
    /* noop */
  }
}

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    try {
      audioCtx = new AC();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

/** Descarga y decodifica un SFX a un AudioBuffer (no requiere gesto ni
 *  contexto corriendo). Devuelve el buffer (cacheado) o null si falla.
 *  Dedupe por src para no decodificar dos veces. */
function decodeSfx(src: string): Promise<AudioBuffer | null> {
  const ctx = getCtx();
  if (!ctx) return Promise.resolve(null);
  const have = bufferCache.get(src);
  if (have) return Promise.resolve(have);
  const pending = inflight.get(src);
  if (pending) return pending;
  const p = fetch(src)
    .then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.arrayBuffer();
    })
    .then((ab) => ctx.decodeAudioData(ab))
    .then((buf) => {
      bufferCache.set(src, buf);
      inflight.delete(src);
      return buf;
    })
    .catch(() => {
      inflight.delete(src); // permitir reintento
      return null;
    });
  inflight.set(src, p);
  return p;
}

/** Pre-descarga/decodifica (fire-and-forget) para el desbloqueo. */
function prefetchSfx(src: string) {
  decodeSfx(src);
}

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
 * handler de tap real (ENTRAR, Contestar, notificación). Hace tres cosas,
 * ninguna audible:
 * 1. Arranca/resume el AudioContext y emite un buffer mudo de 1 sample
 *    (desbloqueo Web Audio: habilita los SFX programáticos posteriores).
 * 2. Reproduce un WAV mudo por elemento <audio> (bendice el documento
 *    para los media elements: audio llamada, notas de voz, videos).
 * 3. Pre-descarga y decodifica los SFX indicados al caché de buffers.
 */
export function unlockAudioSession(prefetch: string[] = []) {
  if (typeof window === "undefined") return;
  const ctx = getCtx();
  if (ctx) {
    try {
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      const silent = ctx.createBuffer(1, 1, 22050);
      const node = ctx.createBufferSource();
      node.buffer = silent;
      node.connect(ctx.destination);
      node.start(0);
      startKeepAlive(ctx); // mantener el contexto vivo hasta el tono
    } catch {
      /* noop */
    }
  }
  try {
    if (!silentDataUri) silentDataUri = makeSilentWavDataUri();
    if (!silentEl) silentEl = new Audio(silentDataUri);
    silentEl.currentTime = 0;
    const p = silentEl.play();
    if (p) p.catch(() => {});
  } catch {
    /* noop */
  }
  prefetch.forEach(prefetchSfx);
}

export interface SfxHandle {
  /** Detiene y libera la instancia. */
  stop: () => void;
}

/**
 * Reproduce un SFX. Nunca lanza. Vía Web Audio SIEMPRE que haya AudioContext
 * (iOS-proof: no requiere gesto si el contexto está vivo): si el buffer ya
 * está decodificado suena al instante; si no, suena en cuanto decodifica.
 * Solo si NO hay Web Audio cae a `new Audio(src)` (que en iOS exige gesto).
 */
export function playSfx(
  src: string,
  { loop = false, volume = 0.35 }: { loop?: boolean; volume?: number } = {}
): SfxHandle {
  if (typeof window === "undefined") return { stop() {} };

  const ctx = getCtx();
  if (ctx) {
    let stopped = false;
    let node: AudioBufferSourceNode | null = null;
    let gain: GainNode | null = null;
    const startBuffer = (buf: AudioBuffer | null) => {
      if (stopped || !buf) return;
      try {
        if (ctx.state === "suspended") ctx.resume().catch(() => {});
        node = ctx.createBufferSource();
        node.buffer = buf;
        node.loop = loop;
        gain = ctx.createGain();
        gain.gain.value = volume;
        node.connect(gain);
        gain.connect(ctx.destination);
        node.start(0);
      } catch {
        /* noop */
      }
    };
    const cached = bufferCache.get(src);
    if (cached) startBuffer(cached);
    else decodeSfx(src).then(startBuffer); // suena en cuanto decodifica (sin gesto)
    return {
      stop() {
        stopped = true;
        try {
          if (gain) gain.gain.value = 0; // silencio inmediato aunque stop() falle
        } catch {
          /* noop */
        }
        try {
          if (node) node.stop();
        } catch {
          /* ya parado o aún sin arrancar */
        }
        try {
          if (node) node.disconnect();
          if (gain) gain.disconnect();
        } catch {
          /* noop */
        }
      },
    };
  }

  // Sin Web Audio (navegador muy viejo): fallback a elemento.
  let audio: HTMLAudioElement | null = null;
  let stopped = false;
  try {
    audio = new Audio(src);
    audio.loop = loop;
    audio.volume = volume;
    const p = audio.play();
    if (p)
      p.then(() => {
        if (stopped && audio) {
          audio.pause();
          audio.src = "";
        }
      }).catch(() => {});
    if (!loop) {
      audio.onended = () => {
        if (audio) audio.src = "";
      };
    }
  } catch {
    /* noop */
  }
  return {
    stop() {
      stopped = true;
      try {
        if (audio) {
          audio.pause();
          audio.src = "";
        }
      } catch {
        /* noop */
      }
    },
  };
}
