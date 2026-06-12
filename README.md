# VELRA — Funnel Inmersivo (v2)

Funnel de 4 escenas para VELRA (brief 12 jun 2026). Mobile-first (390px),
interacciones de gestos humanos reales, sin botones de funnel.

## Rutas

| Ruta | Escena |
|---|---|
| `/` | Landing mínima |
| `/llamada` | Video intro → llamada entrante → llamada activa → video transición → notificación WhatsApp |
| `/chat` | WhatsApp con la Dra. (3 videos, 3 notas de voz, tarjeta de enlace) |
| `/velra` | Sales Page → salida a `thevelra.shop` |

## Stack

Next.js 14 (App Router) · TypeScript · TailwindCSS · Framer Motion · Lucide.

- `lib/tracking.ts` — helper único (Meta Pixel + Clarity + console en dev). Ninguna escena llama a fbq/clarity directamente.
- `lib/funnel-state.tsx` — Context + localStorage: escena alcanzada, UTMs, guard secuencial (desactivado en dev), URL de salida a Shopify.
- `lib/assets.ts` — URLs de Sirv centralizadas. Los assets se reemplazan en Sirv sin tocar código.
- `lib/sfx.ts` — efectos de sonido con manejo de la política de autoplay de iOS.
- `content/sales-copy.ts` y `content/chat-script.ts` — copy final auditado, literal del brief.

## Política de autoplay (iOS)

Todos los audios arrancan SOLO dentro del handler del tap de la clienta
(contestar, miniatura de video, play de nota de voz). Los videos con autoplay
van siempre `muted`. Los SFX intentan reproducirse con catch silencioso y se
desbloquean con el primer tap en la página.

## Setup

```bash
npm install
npm run dev
```

Variables (`.env.local` y Vercel):

```
NEXT_PUBLIC_META_PIXEL_ID=   # Alex
NEXT_PUBLIC_CLARITY_ID=      # Alex
NEXT_PUBLIC_DISABLE_GUARD=   # "true" solo para QA fuera de dev
```

## Deploy

1. Repo en GitHub (rama `main`).
2. Vercel → Import Project → seleccionar el repo (deploy automático en cada push).
3. Añadir las dos variables de entorno en Vercel.
4. Dominio sugerido: `experiencia.thevelra.shop`.

## Assets (Sirv: `https://claude.sirv.com/velra-funnel/`)

Subir con estos nombres exactos; el funnel ya es navegable con placeholders
(todos los media tienen fallback visual y temporal):

`foto_dra_perfil.jpg`, `foto_producto.jpg`, `landing_bg.jpg`,
`video_intro_llamada.mp4`, `video_transicion_teclea.mp4`,
`video_1_fascia.mp4`, `video_2_mecanismo.mp4`, `video_3_ugc.mp4`,
`audio_llamada.mp3`, `voz_1_edad.mp3`, `voz_2_probetodo.mp3`,
`voz_3_constancia.mp3`, `sfx_tono_llamada.mp3`, `sfx_notif_whatsapp.mp3`,
`sfx_mensaje_whatsapp.mp3`

## Salida a Shopify

`https://thevelra.shop/es-mx/products/thevelra` + UTMs capturados en `/`
(fallback `utm_source=facebook&utm_medium=funnel&utm_campaign=funnel_v2&utm_term=directo`)
+ siempre `utm_content=funnel_velra`. Misma pestaña. `InitiateCheckout` en cada salida.

⚠️ Verificar que la product page muestre ~~$179.95~~ → $129.95 (coherente con la Sales Page).

## Pendientes (no bloquean)

- Reseñas reales de clientas (sección Aval — hoy muestra placeholders).
- IDs de Pixel y Clarity en Vercel.
- Assets de la sección anterior en Sirv.
