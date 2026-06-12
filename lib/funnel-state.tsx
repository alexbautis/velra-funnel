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

const SHOPIFY_URL = "https://thevelra.shop/es-mx/products/thevelra";

const FALLBACK_UTMS: Record<string, string> = {
  utm_source: "facebook",
  utm_medium: "funnel",
  utm_campaign: "funnel_v2",
  utm_term: "directo",
};

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
  /** URL de salida a la product page con UTMs reinyectados */
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
    const stored = readStoredUtms();
    const utms = Object.keys(stored).length > 0 ? stored : FALLBACK_UTMS;
    const url = new URL(SHOPIFY_URL);
    Object.entries(utms).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    // Siempre presente, pisa cualquier utm_content de entrada
    url.searchParams.set("utm_content", "funnel_velra");
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
