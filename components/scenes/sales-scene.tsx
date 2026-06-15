"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, ShieldCheck, Truck } from "lucide-react";
import { track } from "@/lib/tracking";
import { useFunnel } from "@/lib/funnel-state";
import { ASSETS } from "@/lib/assets";
import { cn } from "@/lib/utils";
import { DraAvatar } from "@/components/dra-avatar";
import { ReviewCard } from "@/components/scenes/review-card";
import { SALES_COPY as C } from "@/content/sales-copy";

function ProductPhoto({ className }: { className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-gradient-to-br from-teal/25 via-paper to-blush/40",
          className
        )}
      >
        <span className="font-bebas text-4xl tracking-[0.3em] text-text-dark/50">
          VELRA
        </span>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={ASSETS.foto_producto}
      alt="VELRA"
      className={cn("object-cover", className)}
      onError={() => setFailed(true)}
    />
  );
}

/** ESCENA 4 — Sales Page */
export function SalesScene() {
  const { buildExitUrl } = useFunnel();
  const offerRef = useRef<HTMLElement | null>(null);
  const [stickyVisible, setStickyVisible] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const scrollTracked = useRef(false);

  useEffect(() => {
    track("sales_view");
  }, []);

  // Sticky CTA: aparece tras pasar la sección Oferta
  useEffect(() => {
    const section = offerRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !scrollTracked.current) {
          scrollTracked.current = true;
          track("sales_scroll_oferta");
        }
        const passed =
          !entry.isIntersecting && entry.boundingClientRect.top < 0;
        setStickyVisible(passed);
      },
      { threshold: 0.15 }
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  const scrollToOffer = () => {
    offerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // CTA del funnel hacia la PDP: evento granular + FunnelToPDP, y redirige a
  // thevelra.shop/velra con los UTM de Meta + funnel=1.
  const exitToShopify = (event: "sales_cta_oferta" | "sales_cta_final") => {
    track(event);
    track("FunnelToPDP");
    window.location.href = buildExitUrl();
  };

  return (
    <main className="min-h-dvh bg-paper font-dm text-text-dark">
      {/* ------------------------------------------------ 4.1 HERO */}
      <section className="px-6 pb-10 pt-12 text-center">
        <span className="font-bebas text-lg tracking-[0.35em] text-teal-dark">
          VELRA
        </span>
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="mx-auto mt-6 max-w-sm text-balance font-poppins text-[28px] font-semibold leading-tight"
        >
          {C.hero.headline}
        </motion.h1>
        <p className="mx-auto mt-4 max-w-sm text-[16px] leading-relaxed text-text-dark/70">
          {C.hero.subheadline}
        </p>

        <div className="relative mx-auto mt-8 max-w-sm">
          <ProductPhoto className="aspect-square w-full rounded-3xl shadow-lg" />
          <span className="absolute -right-2 -top-3 rotate-3 rounded-full bg-blush px-4 py-2 font-poppins text-sm font-bold text-text-dark shadow-md">
            {C.hero.badge}
          </span>
        </div>

        <button
          onClick={scrollToOffer}
          className="mt-8 w-full max-w-sm rounded-full bg-teal px-8 py-4 font-poppins text-[17px] font-semibold text-ink shadow-[0_8px_30px_rgba(54,207,195,0.35)] transition-colors hover:bg-teal-dark"
        >
          {C.hero.cta}
        </button>
      </section>

      {/* ------------------------------------------------ 4.2 MINI-RECAP */}
      <section className="bg-ink px-6 py-12 text-center text-white">
        <div className="mx-auto max-w-sm space-y-4">
          <p className="font-poppins text-xl font-semibold text-teal">
            {C.miniRecap[0]}
          </p>
          {C.miniRecap.slice(1).map((p, i) => (
            <p key={i} className="text-[15px] leading-relaxed text-white/80">
              {p}
            </p>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------ 4.3 CÓMO FUNCIONA */}
      <section className="px-6 py-12">
        <h2 className="text-center font-poppins text-2xl font-semibold">
          {C.howItWorks.title}
        </h2>
        <div className="mx-auto mt-8 max-w-sm space-y-6">
          {C.howItWorks.steps.map((step, i) => (
            <div key={i} className="flex gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal/15 font-poppins font-bold text-teal-dark">
                {i + 1}
              </span>
              <div>
                <p className="font-poppins font-semibold">{step.label}</p>
                <p className="mt-1 text-[15px] leading-relaxed text-text-dark/75">
                  {step.text}
                </p>
              </div>
            </div>
          ))}
          <p className="pt-2 text-center font-poppins text-lg font-semibold text-teal-dark">
            {C.howItWorks.closing}
          </p>
        </div>
      </section>

      {/* ------------------------------------------------ 4.4 OFERTA */}
      <section ref={offerRef} id="oferta" className="scroll-mt-4 px-6 py-12">
        <div className="mx-auto max-w-sm rounded-3xl border-2 border-teal bg-white p-6 shadow-[0_12px_50px_rgba(54,207,195,0.18)]">
          <h2 className="text-center font-poppins text-2xl font-bold">
            {C.offer.title}
          </h2>
          <div className="mt-4 flex items-baseline justify-center gap-3">
            <span className="text-lg text-text-dark/40 line-through">
              {C.offer.anchorPrice}
            </span>
            <span className="font-poppins text-lg font-semibold text-text-dark/70">
              {C.offer.todayLabel}
            </span>
            <span className="font-poppins text-4xl font-bold text-teal-dark">
              {C.offer.price}
            </span>
          </div>
          <p className="mt-2 text-center font-poppins font-bold text-[#D98A6C]">
            {C.offer.savings}
          </p>
          <ul className="mt-6 space-y-3">
            {C.offer.bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-teal-dark" />
                <span
                  className={cn(
                    "text-[15px] leading-snug",
                    i === C.offer.bullets.length - 1 && "font-bold"
                  )}
                >
                  {b}
                </span>
              </li>
            ))}
          </ul>
          <button
            onClick={() => exitToShopify("sales_cta_oferta")}
            className="mt-7 w-full rounded-full bg-teal px-8 py-4 font-poppins text-[17px] font-semibold text-ink shadow-[0_8px_30px_rgba(54,207,195,0.35)] transition-colors hover:bg-teal-dark"
          >
            {C.offer.cta}
          </button>
        </div>
      </section>

      {/* ------------------------------------------------ 4.5 GARANTÍA */}
      <section className="bg-[#F7FBFA] px-6 py-12">
        <div className="mx-auto max-w-sm text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-teal-dark" />
          <h2 className="mt-4 text-balance font-poppins text-2xl font-semibold">
            {C.guarantee.title}
          </h2>
          <div className="mt-5 space-y-3">
            {C.guarantee.paragraphs.map((p, i) => (
              <p key={i} className="text-[15px] leading-relaxed text-text-dark/75">
                {p}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ 4.6 AVAL */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-sm text-center">
          <div className="mx-auto w-fit rounded-full border-4 border-blush/60 p-1">
            <DraAvatar size={104} />
          </div>
          <h2 className="mt-4 font-poppins text-xl font-semibold">
            {C.endorsement.name}
          </h2>
          <p className="mt-1 text-sm text-text-dark/60">
            {C.endorsement.credentials}
          </p>
          <blockquote className="mt-5 rounded-2xl bg-blush/20 px-5 py-4 text-[15px] italic leading-relaxed text-text-dark/85">
            “{C.endorsement.quote}”
          </blockquote>

          {/* Reseñas reales de clientas verificadas */}
          <div
            role="region"
            aria-label="Reseñas de clientes verificadas"
            className="mt-6 space-y-3"
          >
            {C.reviews.map((r, i) => (
              <ReviewCard key={r.name} review={r} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ 4.7 COMPARACIÓN */}
      <section className="bg-ink px-6 py-12 text-white">
        <div className="mx-auto max-w-sm">
          <h2 className="text-center font-poppins text-2xl font-semibold">
            {C.comparison.title}
          </h2>
          <div className="mt-5 space-y-3 text-center">
            {C.comparison.intro.map((p, i) => (
              <p key={i} className="text-[15px] leading-relaxed text-white/80">
                {p}
              </p>
            ))}
          </div>

          <div className="mt-8 space-y-4">
            <div className="rounded-2xl border border-white/15 bg-white/5 p-5">
              <p className="font-poppins font-semibold text-white/90">
                {C.comparison.clinic.label}
              </p>
              <p className="mt-2 text-[15px] text-white/70">
                {C.comparison.clinic.math}
              </p>
              <p className="mt-1 font-poppins text-2xl font-bold text-blush">
                {C.comparison.clinic.total}
              </p>
              <p className="mt-3 text-[14px] leading-relaxed text-white/60">
                {C.comparison.clinic.note}
              </p>
            </div>

            <div className="rounded-2xl border-2 border-teal bg-teal/10 p-5">
              <p className="font-poppins font-semibold text-teal">
                {C.comparison.velra.label}
              </p>
              <p className="mt-2 font-poppins text-2xl font-bold text-teal">
                {C.comparison.velra.total}
              </p>
              <p className="mt-3 text-[14px] leading-relaxed text-white/80">
                {C.comparison.velra.note}
              </p>
            </div>
          </div>

          <p className="mt-6 text-center text-[15px] leading-relaxed text-white/85">
            {C.comparison.closing}
          </p>
        </div>
      </section>

      {/* ------------------------------------------------ 4.8 FAQ */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-sm">
          <h2 className="text-center font-poppins text-2xl font-semibold">
            Preguntas frecuentes
          </h2>
          <div className="mt-6 divide-y divide-text-dark/10 rounded-2xl border border-text-dark/10">
            {C.faq.map((item, i) => {
              const open = openFaq === i;
              return (
                <div key={i}>
                  <button
                    onClick={() => setOpenFaq(open ? null : i)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
                  >
                    <span className="font-poppins text-[15px] font-medium">
                      {item.question}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-5 w-5 shrink-0 text-teal-dark transition-transform",
                        open && "rotate-180"
                      )}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <p className="px-4 pb-4 text-[14px] leading-relaxed text-text-dark/75">
                          {item.answer}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ 4.9 CTA FINAL */}
      <section className="bg-gradient-to-b from-paper to-blush/25 px-6 pb-32 pt-12">
        <div className="mx-auto max-w-sm text-center">
          <div className="space-y-3">
            {C.finalCta.paragraphs.map((p, i) => (
              <p key={i} className="text-[15px] leading-relaxed text-text-dark/80">
                {p}
              </p>
            ))}
          </div>
          <h2 className="mt-6 text-balance font-poppins text-[24px] font-bold leading-snug">
            {C.finalCta.question}
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-text-dark/75">
            {C.finalCta.closing}
          </p>
          <button
            onClick={() => exitToShopify("sales_cta_final")}
            className="mt-8 w-full rounded-full bg-teal px-8 py-4 font-poppins text-[17px] font-semibold text-ink shadow-[0_8px_30px_rgba(54,207,195,0.4)] transition-colors hover:bg-teal-dark"
          >
            {C.finalCta.cta}
          </button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-[13px] text-text-dark/60">
            <Truck className="h-4 w-4" />
            {C.finalCta.subCta}
          </p>
        </div>
      </section>

      {/* Sticky CTA móvil (tras pasar la Oferta; scroll-to-oferta) */}
      <AnimatePresence>
        {stickyVisible && (
          <motion.div
            initial={{ y: 90 }}
            animate={{ y: 0 }}
            exit={{ y: 90 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="fixed bottom-0 left-0 right-0 z-40 border-t border-text-dark/10 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur"
          >
            <button
              onClick={scrollToOffer}
              className="w-full rounded-full bg-teal px-6 py-3.5 font-poppins text-[16px] font-semibold text-ink shadow-md"
            >
              {C.hero.cta}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
