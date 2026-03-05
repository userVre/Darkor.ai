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
import PremiumVideoPlayer from "./PremiumVideoPlayer";

const reveal = {
  initial: { opacity: 0, y: 50, filter: "blur(10px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: false, amount: 0.15 },
  transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const },
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
              Breathe Life into Empty Spaces
            </h3>
            <p className="text-lg leading-relaxed text-zinc-400">
              Watch your raw, unfurnished rooms transform into breathtaking masterpieces in real-time. Darkor.ai
              seamlessly adds luxurious flooring, ambient lighting, and high-end furniture to bare walls. Don&apos;t
              just imagine the potential—see it unfold before your eyes in a captivating before-and-after experience.
            </p>
          </div>

          <PremiumVideoPlayer
            src="/media/feature-breathe-life.mp4"
            className="h-[360px] lg:h-[420px]"
          />
        </motion.article>

        <motion.article
          {...reveal}
          className="grid items-center gap-16 lg:grid-cols-2 lg:gap-24"
        >
          <PremiumVideoPlayer
            src="/media/feature-immersive-3d.mp4"
            className="h-[360px] lg:h-[420px]"
          />

          <div className="space-y-6">
            <h3 className="text-balance text-4xl font-bold leading-tight text-white md:text-5xl">
              Step Inside Your Dream Space in Immersive 3D
            </h3>
            <p className="text-lg leading-relaxed text-zinc-400">
              Move beyond static images. Darkor.ai turns your 2D renders into fully explorable 3D environments.
              Wander through your newly designed rooms, inspect the textures up close, and feel the exact proportions
              of your future home. Powered by next-gen spatial AI.
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

