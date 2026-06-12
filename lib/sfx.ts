// lib/sfx.ts
// Efectos de sonido (tono de llamada, notificación, mensaje de chat).
// REGLA DE AUTOPLAY: cualquier play() puede ser rechazado por iOS si no hay
// gesto previo en la página. Aquí TODO intento de reproducción se hace con
// catch silencioso, y el primer tap de la clienta en la página "desbloquea"
// los elementos registrados (play + pause inmediato dentro del gesto).

const registry = new Set<HTMLAudioElement>();
let unlockInstalled = false;
let unlocked = false;

function installUnlockListener() {
  if (unlockInstalled || typeof document === "undefined") return;
  unlockInstalled = true;
  const unlock = () => {
    unlocked = true;
    registry.forEach((audio) => {
      // Solo desbloquear los que no están sonando ya
      if (!audio.paused) return;
      const p = audio.play();
      if (p) {
        p.then(() => {
          audio.pause();
          audio.currentTime = 0;
        }).catch(() => {});
      }
    });
    document.removeEventListener("pointerdown", unlock);
  };
  document.addEventListener("pointerdown", unlock, { passive: true });
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
