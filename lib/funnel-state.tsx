"use client";

// lib/funnel-state.tsx
// Estado del funnel: React Context + localStorage.
// Persiste la escena máxima alcanzada y los UTMs de entrada.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export const SCENES = ["landing", "llamada", "chat", "velra"] as const;
export type Scene = (typeof SCENES)[number];

const SCENE_KEY = "velra_funnel_scene";
const UTM_KEY = "velra_funnel_utms";

// PDP destino del paso funnel → producto. URL exacta /es-mx/products/thevelra
// para que Shopify atribuya la venta al canal correcto (no como orgánica) y
// para no provocar el redirect de locale que podría perder los parámetros.
const PDP_URL = "https://thevelra.shop/es-mx/products/thevelra";

function sceneIndex(scene: Scene): number {
  return SCENES.indexOf(scene);
}

function readStoredScene(): number {
  try {
    const raw = window.localStorage.getItem(SCENE_KEY);
    const idx = raw === null ? 0 : parseInt(raw, 10);
    return Number.isFinite(idx) ? Math.max(0, Math.min(idx, SCENES.length - 1)) : 0;
  } catch {
    return 0;
  }
}

function readStoredUtms(): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(UTM_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

interface FunnelContextValue {
  /** true cuando ya se leyó localStorage (evita decisiones de guard en SSR/primer render) */
  ready: boolean;
  /** índice de la escena máxima alcanzada */
  reachedIndex: number;
  /** marca una escena como alcanzada (solo avanza, nunca retrocede) */
  markSceneReached: (scene: Scene) => void;
  /** ¿puede la clienta ver esta escena? */
  canAccess: (scene: Scene) => boolean;
  /** captura UTMs de la URL actual (se llama en `/`) */
  captureUtms: () => void;
  /** URL de salida a la PDP con los UTM (capturados o de la URL actual) + funnel=1 */
  buildExitUrl: () => string;
}

const FunnelContext = createContext<FunnelContextValue | null>(null);

export function FunnelProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [reachedIndex, setReachedIndex] = useState(0);

  useEffect(() => {
    setReachedIndex(readStoredScene());
    setReady(true);
  }, []);

  const markSceneReached = useCallback((scene: Scene) => {
    const idx = sceneIndex(scene);
    setReachedIndex((prev) => {
      const next = Math.max(prev, idx);
      try {
        window.localStorage.setItem(SCENE_KEY, String(next));
      } catch {
        /* modo incógnito sin storage: el guard queda permisivo en memoria */
      }
      return next;
    });
  }, []);

  const canAccess = useCallback(
    (scene: Scene) => {
      // Guard secuencial, desactivable en dev
      if (process.env.NODE_ENV === "development") return true;
      if (process.env.NEXT_PUBLIC_DISABLE_GUARD === "true") return true;
      return sceneIndex(scene) <= Math.max(reachedIndex, readStoredScene());
    },
    [reachedIndex]
  );

  const captureUtms = useCallback(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const utms: Record<string, string> = {};
      params.forEach((value, key) => {
        if (key.toLowerCase().startsWith("utm_")) utms[key] = value;
      });
      if (Object.keys(utms).length > 0) {
        window.localStorage.setItem(UTM_KEY, JSON.stringify(utms));
      }
    } catch {
      /* noop */
    }
  }, []);

  const buildExitUrl = useCallback(() => {
    const url = new URL(PDP_URL);
    // 1) UTMs capturados en la landing (persisten aunque la URL actual ya no
    //    los tenga tras navegar entre escenas).
    Object.entries(readStoredUtms()).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    // 2) Parámetros de la URL actual (por si se entró directo con UTMs).
    try {
      new URLSearchParams(window.location.search).forEach((value, key) => {
        url.searchParams.set(key, value);
      });
    } catch {
      /* noop */
    }
    // 3) Marca del paso por el funnel.
    url.searchParams.set("funnel", "1");
    return url.toString();
  }, []);

  return (
    <FunnelContext.Provider
      value={{
        ready,
        reachedIndex,
        markSceneReached,
        canAccess,
        captureUtms,
        buildExitUrl,
      }}
    >
      {children}
    </FunnelContext.Provider>
  );
}

export function useFunnel(): FunnelContextValue {
  const ctx = useContext(FunnelContext);
  if (!ctx) throw new Error("useFunnel debe usarse dentro de <FunnelProvider>");
  return ctx;
}
