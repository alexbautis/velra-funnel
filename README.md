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
NEXT_PUBLIC_META_PIXEL_ID=   # opcional: por defecto 929383266546423
NEXT_PUBLIC_CLARITY_ID=      # Alex
NEXT_PUBLIC_DISABLE_GUARD=   # "true" solo para QA fuera de dev
```

El Meta Pixel (929383266546423) carga en todas las páginas y dispara `PageView`
automáticamente. El env var solo hace falta para cambiar de Pixel.

## Deploy

1. Repo en GitHub (rama `main`).
2. Vercel → Import Project → seleccionar el repo (deploy automático en cada push).
3. Añadir las dos variables de entorno en Vercel.
4. Dominio sugerido: `experiencia.thevelra.shop`.

## Assets (Sirv: `https://claude.sirv.com/velra-funnel/`)

Subir con estos nombres exactos; el funnel ya es navegable con placeholders
(todos los media tienen fallback visual y temporal):

`foto_dra_perfil.png`, `foto_producto.png`, `landing_bg.png`,
`bg_llamada_entrante.png`, `video_intro_llamada.mp4`,
`video_transicion_teclea.mp4`

Los 3 videos del chat (`video_1_fascia`, `video_2_mecanismo`, `video_3_ugc`),
el audio y `AAProduct.png` se sirven desde `public/` (no Sirv). Los videos del
chat están optimizados a 720p CRF24 +faststart (~7-9 MB) para que arranquen al
instante; si los reemplazas, re-encódealos con:
`ffmpeg -i in.mp4 -vf "scale='min(720,iw)':-2" -c:v libx264 -crf 24 -preset slow -c:a aac -b:a 128k -movflags +faststart out.mp4`

## Salida a la PDP (funnel → producto)

Los CTAs de la Sales Page redirigen a `https://thevelra.shop/es-mx/products/thevelra`
con los UTM de Meta (capturados en `/` y/o presentes en la URL actual) + `funnel=1`.
Misma pestaña. Se usa la URL `/es-mx/products/...` exacta para que Shopify no
cuente la venta como orgánica y para evitar el redirect de locale que podría
perder los parámetros. Al hacer clic disparan `fbq('trackCustom', 'FunnelToPDP')` (además del
evento granular `sales_cta_oferta` / `sales_cta_final`).

⚠️ Verificar que la PDP muestre ~~$179.95~~ → $129.95 (coherente con la Sales Page).

## Pendientes (no bloquean)

- Reseñas reales de clientas (sección Aval — hoy muestra placeholders).
- IDs de Pixel y Clarity en Vercel.
- Assets de la sección anterior en Sirv.
