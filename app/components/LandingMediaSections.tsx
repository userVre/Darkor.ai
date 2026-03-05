"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useState } from "react";

import beforeEmptyRoom from "@/public/media/before-empty-room.png";
import afterBohoChic from "@/public/media/after-boho-chic.png";
import afterCyberpunk from "@/public/media/after-cyberpunk.png";
import afterLuxuryMinimalist from "@/public/media/after-luxury-minimalist.png";
import sketchBefore from "@/public/media/sketch-before.png";
import renderAfter from "@/public/media/render-after.png";
import gardenEmpty from "@/public/media/garden-empty.png";

const reveal = {
  initial: { opacity: 0, y: 36 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.25 },
  transition: { duration: 0.65, ease: "easeOut" as const },
};

export default function LandingMediaSections() {
  const [stackHover, setStackHover] = useState(false);

  return (
    <section id="gallery" className="bg-zinc-950 py-28">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-28 px-6">
        <motion.article {...reveal} className="space-y-14">
          <h2 className="mx-auto max-w-5xl text-center text-3xl font-bold leading-tight text-white md:text-5xl">
            Take a photo and redesign your interior in seconds using AI
          </h2>

          <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto_1fr]">
            <div className="justify-self-center lg:justify-self-start">
              <Image
                src={beforeEmptyRoom}
                alt="Completely empty room before redesign"
                placeholder="blur"
                className="h-[280px] w-[360px] rounded-2xl border border-white/10 object-cover shadow-2xl shadow-black/40 sm:h-[320px] sm:w-[430px]"
              />
            </div>

            <div className="flex items-center justify-center">
              <svg
                aria-hidden="true"
                viewBox="0 0 170 90"
                className="h-16 w-24 text-white sm:h-20 sm:w-32"
                fill="none"
              >
                <path
                  d="M6 45c26 0 34 22 62 22 20 0 34-11 50-24"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <path
                  d="M97 23l26 17-30 12"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <motion.div
              onHoverStart={() => setStackHover(true)}
              onHoverEnd={() => setStackHover(false)}
              className="relative h-[460px] w-[390px] justify-self-center sm:w-[450px] lg:justify-self-end"
            >
              <motion.div
                animate={
                  stackHover
                    ? { x: 18, y: -16, rotate: -12 }
                    : { x: 0, y: 0, rotate: -7 }
                }
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="absolute right-0 top-0"
              >
                <Image
                  src={afterLuxuryMinimalist}
                  alt="Luxury minimalist redesign"
                  placeholder="blur"
                  className="h-[240px] w-[330px] rounded-2xl border border-white/10 object-cover shadow-2xl shadow-black/40"
                />
              </motion.div>

              <motion.div
                animate={stackHover ? { x: 10, y: 4, rotate: 7 } : { x: 0, y: 0, rotate: 3 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="absolute right-4 top-[140px]"
              >
                <Image
                  src={afterBohoChic}
                  alt="Boho chic redesign"
                  placeholder="blur"
                  className="h-[240px] w-[340px] rounded-2xl border border-white/10 object-cover shadow-2xl shadow-black/40"
                />
              </motion.div>

              <motion.div
                animate={
                  stackHover
                    ? { x: -12, y: 28, rotate: -13 }
                    : { x: 0, y: 0, rotate: -9 }
                }
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="absolute right-0 top-[275px]"
              >
                <Image
                  src={afterCyberpunk}
                  alt="Cyberpunk redesign"
                  placeholder="blur"
                  className="h-[180px] w-[320px] rounded-2xl border border-white/10 object-cover shadow-2xl shadow-black/40"
                />
              </motion.div>
            </motion.div>
          </div>
        </motion.article>

        <motion.article
          {...reveal}
          className="grid items-center gap-16 lg:grid-cols-2 lg:gap-24"
        >
          <div className="space-y-6">
            <h3 className="text-balance text-4xl font-bold leading-tight text-white md:text-5xl">
              Transform empty spaces into stunning interiors
            </h3>
            <p className="text-lg leading-relaxed text-zinc-400">
              Start with a completely empty room or raw construction space and watch
              Darkor.ai transform it step by step. Add wallpaper, flooring, furniture,
              lighting, and even people to bring your space to life.
            </p>
          </div>
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            className="h-[360px] w-full rounded-2xl border border-white/10 object-cover shadow-2xl shadow-black/40 lg:h-[420px]"
          >
            <source src="/media/virtual-staging.mp4" type="video/mp4" />
          </video>
        </motion.article>

        <motion.article
          {...reveal}
          className="grid items-center gap-16 lg:grid-cols-2 lg:gap-24"
        >
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            className="h-[360px] w-full rounded-2xl border border-white/10 object-cover shadow-2xl shadow-black/40 lg:h-[420px]"
          >
            <source src="/media/walkthrough-3d.mp4" type="video/mp4" />
          </video>

          <div className="space-y-6">
            <h3 className="text-balance text-4xl font-bold leading-tight text-white md:text-5xl">
              Walk inside your interior designs in 3D
            </h3>
            <p className="text-lg leading-relaxed text-zinc-400">
              Experience your interior designs like never before. Turn any of your
              interior designs of a real space into a fully immersive 3D environment
              that you can explore from every angle. Darkor.ai is an official launch
              partner of state-of-the-art AI world models that make this feature
              possible.
            </p>
          </div>
        </motion.article>

        <motion.article
          {...reveal}
          className="grid items-center gap-16 lg:grid-cols-2 lg:gap-24"
        >
          <div className="space-y-6">
            <h3 className="text-balance text-4xl font-bold leading-tight text-white md:text-5xl">
              Transform your sketches and SketchUp into photorealistic renders
            </h3>
            <p className="text-lg leading-relaxed text-zinc-400">
              With Darkor.ai Sketch2Image™, you can create photorealistic renders from
              your raw interior design sketches. Imagine doing a quick draft of an idea
              you have, upload it, and 30 seconds later you have a realistic AI photo
              of how it looks in real life.
            </p>
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

        <motion.article
          {...reveal}
          className="grid items-center gap-16 lg:grid-cols-2 lg:gap-24"
        >
          <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
            <Image
              src={gardenEmpty}
              alt="Empty outdoor space before redesign"
              placeholder="blur"
              className="h-[260px] w-full rounded-2xl border border-white/10 object-cover shadow-2xl shadow-black/40"
            />
            <span className="text-center text-3xl text-zinc-300">→</span>
            <Image
              src={renderAfter}
              alt="Redesigned outdoor concept"
              placeholder="blur"
              className="h-[260px] w-full rounded-2xl border border-white/10 object-cover shadow-2xl shadow-black/40"
            />
          </div>

          <div className="space-y-6">
            <h3 className="text-balance text-4xl font-bold leading-tight text-white md:text-5xl">
              Design gardens and outdoor spaces
            </h3>
            <p className="text-lg leading-relaxed text-zinc-400">
              Darkor.ai also lets you design gardens and outdoor spaces. Take a photo
              of your outdoor space, select [ Outdoor design ] mode and our AI
              redesigns it with plants, flowers, trees, and other stunning outdoor
              elements.
            </p>
          </div>
        </motion.article>
      </div>
    </section>
  );
}
