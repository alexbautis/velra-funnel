// lib/tracking.ts
// Helper único de tracking: Meta Pixel + Microsoft Clarity + console.log en dev.
// Ninguna escena llama a fbq/clarity directamente.

type TrackParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    clarity?: (...args: unknown[]) => void;
  }
}

const isDev = process.env.NODE_ENV === "development";

/** Evento custom del funnel (landing_view, exp2_answer, chat_video1_play, …). */
export function track(event: string, params?: TrackParams): void {
  if (typeof window === "undefined") return;
  if (isDev) {
    // eslint-disable-next-line no-console
    console.log(`[track] ${event}`, params ?? "");
  }
  try {
    window.fbq?.("trackCustom", event, params);
  } catch {
    /* nunca romper el funnel por tracking */
  }
  try {
    window.clarity?.("event", event);
  } catch {
    /* noop */
  }
}

/** Evento estándar de Meta Pixel (p. ej. InitiateCheckout en cada salida a Shopify). */
export function trackStandard(event: string, params?: TrackParams): void {
  if (typeof window === "undefined") return;
  if (isDev) {
    // eslint-disable-next-line no-console
    console.log(`[track:standard] ${event}`, params ?? "");
  }
  try {
    window.fbq?.("track", event, params);
  } catch {
    /* noop */
  }
  try {
    window.clarity?.("event", event);
  } catch {
    /* noop */
  }
}
