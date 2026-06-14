"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

export interface Review {
  name: string;
  age: number;
  city: string;
  stars: number;
  time: string;
  initial: string;
  avatar: "blush" | "teal";
  text: string;
}

const AVATAR_BG: Record<Review["avatar"], string> = {
  blush: "#F2C4B2",
  teal: "#36CFC3",
};

/** Tarjeta de reseña de clienta verificada (Sales Page / Aval). */
export function ReviewCard({
  review,
  index,
}: {
  review: Review;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.45, delay: index * 0.1 }}
      className="rounded-xl bg-white p-5 text-left shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
    >
      {/* Header: avatar + nombre + edad·ciudad */}
      <div className="flex items-center gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bebas text-xl leading-none text-white"
          style={{ backgroundColor: AVATAR_BG[review.avatar] }}
          aria-hidden
        >
          {review.initial}
        </span>
        <div className="min-w-0">
          <p className="font-poppins text-[15px] font-semibold leading-tight text-[#1A1A1A]">
            {review.name}
          </p>
          <p className="mt-0.5 text-[13px] leading-tight text-[#999]">
            {review.age} años · {review.city}
          </p>
        </div>
      </div>

      {/* Estrellas + verificación */}
      <div className="mt-3 flex items-center gap-2">
        <span className="flex items-center gap-0.5">
          {Array.from({ length: review.stars }).map((_, i) => (
            <Star
              key={i}
              className="h-4 w-4"
              style={{ fill: "#FFC107", color: "#FFC107" }}
              aria-hidden="true"
            />
          ))}
        </span>
        <span className="text-[13px] text-[#999]">
          Cliente verificada · {review.time}
        </span>
      </div>

      {/* Quote */}
      <p className="mt-3 text-[15px] leading-[1.6] text-[#1A1A1A]">
        “{review.text}”
      </p>
    </motion.div>
  );
}
