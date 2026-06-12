// lib/sfx.ts
// Efectos de sonido (tono de llamada, notificación, mensaje de chat).
// REGLA DE AUTOPLAY: cualquier play() puede ser rechazado por iOS si no hay
// gesto previo en la página. Aquí TODO intento de reproducción se hace con
// catch silencioso, y el primer tap de la clienta en la página "desbloquea"
// los elementos registrados (play + pause inmediato dentro del gesto).

const registry = new Set<HTMLAudioElement>();
let unlockInstalled = false;
let unlocked = false;

function tryUnlock(audio: HTMLAudioElement) {
  if (!audio.paused) return;
  const p = audio.play();
  if (p)
    p.then(() => {
      audio.pause();
      audio.currentTime = 0;
    }).catch(() => {});
}

function installUnlockListener() {
  if (unlockInstalled || typeof document === "undefined") return;
  unlockInstalled = true;
  const unlock = () => {
    unlocked = true;
    registry.forEach(tryUnlock);
    document.removeEventListener("pointerdown", unlock);
  };
  document.addEventListener("pointerdown", unlock, { passive: true });
}

/**
 * Llama desde un tap handler para pre-activar todos los elementos
 * registrados. Útil para garantizar el unlock en iOS cuando el tap
 * que inicia la sesión ocurre antes de que los SFX sean creados.
 */
export function preUnlockAll() {
  unlocked = true;
  registry.forEach(tryUnlock);
}

export interface Sfx {
  /** Intenta reproducir desde el inicio. Nunca lanza. */
  play: () => void;
  /** Detiene y rebobina. */
  stop: () => void;
  element: HTMLAudioElement;
}

/**
 * Crea un efecto de sonido. `loop` para el tono de llamada.
 * `volume` 0–1 (medio para el tono, bajo para notificación/mensajes).
 */
export function createSfx(
  src: string,
  { loop = false, volume = 0.35 }: { loop?: boolean; volume?: number } = {}
): Sfx {
  const audio = new Audio(src);
  audio.loop = loop;
  audio.volume = volume;
  audio.preload = "auto";
  registry.add(audio);
  installUnlockListener();
  // Si el usuario ya tapó antes de que se creara este elemento, activarlo ya
  if (unlocked) tryUnlock(audio);

  return {
    element: audio,
    play() {
      try {
        audio.currentTime = 0;
        const p = audio.play();
        if (p) p.catch(() => {});
      } catch {
        /* asset ausente o autoplay bloqueado: silencio, nunca romper */
      }
    },
    stop() {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {
        /* noop */
      }
    },
  };
}

export function disposeSfx(sfx: Sfx) {
  sfx.stop();
  registry.delete(sfx.element);
}

export function isAudioUnlocked() {
  return unlocked;
}
