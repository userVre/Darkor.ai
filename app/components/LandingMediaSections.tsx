"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

import beforeEmptyRoom from "@/public/media/before-empty-room.png";
import afterBohoChic from "@/public/media/after-boho-chic.png";
import afterLuxuryMinimalist from "@/public/media/after-luxury-minimalist.png";
import sketchBefore from "@/public/media/sketch-before.png";
import renderAfter from "@/public/media/render-after.png";
import gardenEmpty from "@/public/media/garden-empty.png";

const reveal = {
  initial: { opacity: 0, y: 50, filter: "blur(10px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: false, amount: 0.15 },
  transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const },
};

const ctaClass =
  "inline-flex items-center rounded-xl bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(168,85,247,0.35)] transition hover:brightness-110";

export default function LandingMediaSections() {
  return (
    <section className="bg-zinc-950 py-28">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-28 px-6">
        <motion.article {...reveal} className="space-y-12">
          <h2 className="mx-auto max-w-5xl text-center text-3xl font-bold leading-tight text-white md:text-5xl">
            Take a photo and redesign your interior in seconds
          </h2>

          <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto_1fr]">
            <Image
              src={beforeEmptyRoom}
              alt="Input interior"
              placeholder="blur"
              className="h-[280px] w-full rounded-2xl border border-white/10 object-cover shadow-2xl shadow-black/40 sm:h-[320px]"
            />

            <span className="text-center text-3xl text-zinc-300">→</span>

            <div className="grid gap-4 sm:grid-cols-2">
              <Image
                src={afterLuxuryMinimalist}
                alt="Darkor redesigned interior one"
                placeholder="blur"
                className="h-[180px] w-full rounded-2xl border border-white/10 object-cover shadow-2xl shadow-black/40"
              />
              <Image
                src={afterBohoChic}
                alt="Darkor redesigned interior two"
                placeholder="blur"
                className="h-[180px] w-full rounded-2xl border border-white/10 object-cover shadow-2xl shadow-black/40"
              />
            </div>
          </div>

          <div className="text-center">
            <Link href="#auth-flow" className={ctaClass}>
              Start for free
            </Link>
          </div>
        </motion.article>

        <motion.article {...reveal} className="grid items-center gap-16 lg:grid-cols-2 lg:gap-24">
          <div className="space-y-6">
            <h3 className="text-balance text-4xl font-bold leading-tight text-white md:text-5xl">
              Sketch2Image™: From napkin sketch to 8K render.
            </h3>
            <p className="text-lg leading-relaxed text-zinc-400">
              Upload a rough concept sketch and convert it into a polished, photorealistic interior render ready for client presentations.
            </p>
            <Link href="#auth-flow" className={ctaClass}>
              Redesign yours now
            </Link>
          </div>

          <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
            <Image
              src={sketchBefore}
              alt="Interior sketch before conversion"
              placeholder="blur"
              className="h-[260px] w-full rounded-2xl border border-white/10 object-cover shadow-2xl shadow-black/40"
            />
            <span className="text-center text-3xl text-zinc-300">→</span>
            <Image
              src={renderAfter}
              alt="Photorealistic render after conversion"
              placeholder="blur"
              className="h-[260px] w-full rounded-2xl border border-white/10 object-cover shadow-2xl shadow-black/40"
            />
          </div>
        </motion.article>

        <motion.article {...reveal} className="grid items-center gap-16 lg:grid-cols-2 lg:gap-24">
          <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
            <Image
              src={gardenEmpty}
              alt="Garden before redesign"
              placeholder="blur"
              className="h-[260px] w-full rounded-2xl border border-white/10 object-cover shadow-2xl shadow-black/40"
            />
            <span className="text-center text-3xl text-zinc-300">→</span>
            <Image
              src={renderAfter}
              alt="Garden after redesign"
              placeholder="blur"
              className="h-[260px] w-full rounded-2xl border border-white/10 object-cover shadow-2xl shadow-black/40"
            />
          </div>

          <div className="space-y-6">
            <h3 className="text-balance text-4xl font-bold leading-tight text-white md:text-5xl">
              Outdoor &amp; Garden Design.
            </h3>
            <p className="text-lg leading-relaxed text-zinc-400">
              Turn underwhelming exteriors into premium outdoor experiences with AI-generated landscaping, seating zones, and visual harmony.
            </p>
            <Link href="#auth-flow" className={ctaClass}>
              Start for free
            </Link>
          </div>
        </motion.article>
      </div>
    </section>
  );
}
