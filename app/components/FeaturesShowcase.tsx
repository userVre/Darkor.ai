"use client";
/* eslint-disable @next/next/no-img-element */

import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Maximize,
  Play,
  Settings,
  Volume2,
} from "lucide-react";
import { useState } from "react";

const reveal = {
  initial: { opacity: 0, y: 48 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.25 },
  transition: { duration: 0.7, ease: "easeOut" as const },
};

const sliderImages = [
  {
    src: "https://images.unsplash.com/photo-1617098900591-3f90928e8c54?auto=format&fit=crop&w=1600&q=80",
    alt: "Modern living room with warm neutral materials",
  },
  {
    src: "https://images.unsplash.com/photo-1616594039964-3f9f4a6cc7f3?auto=format&fit=crop&w=1600&q=80",
    alt: "Elegant interior with layered lighting and modern furniture",
  },
  {
    src: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1600&q=80",
    alt: "Contemporary lounge with open-plan seating",
  },
];

export default function FeaturesShowcase() {
  const [activeSlide, setActiveSlide] = useState(0);

  const prevSlide = () => {
    setActiveSlide((prev) => (prev - 1 + sliderImages.length) % sliderImages.length);
  };

  const nextSlide = () => {
    setActiveSlide((prev) => (prev + 1) % sliderImages.length);
  };

  return (
    <section className="bg-zinc-950 py-32">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-32 px-6">
        <motion.article
          {...reveal}
          className="grid items-center gap-16 lg:grid-cols-2 lg:gap-24"
        >
          <div className="space-y-6">
            <h2 className="text-balance text-4xl font-bold leading-tight text-white md:text-5xl">
              Transform empty spaces into stunning interiors
            </h2>
            <p className="text-lg leading-relaxed text-zinc-400">
              Start with a completely empty room or raw construction space and watch
              Darkor.ai transform it step by step.
            </p>
            <p className="text-lg leading-relaxed text-zinc-400">
              Add wallpaper, flooring, furniture, lighting, and even people... And at
              the end you can turn it into a before/after video like this one!
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900">
            <img
              src="https://images.unsplash.com/photo-1616486029423-aaa4789e8c9a?auto=format&fit=crop&w=1800&q=80"
              alt="Luxury pink living room render"
              className="h-[420px] w-full object-cover"
            />

            <div className="flex items-center gap-4 border-t border-white/10 bg-black/60 p-3 backdrop-blur-md">
              <button
                type="button"
                aria-label="Play"
                className="rounded-lg bg-white/10 p-2 text-white transition hover:bg-white/20"
              >
                <Play className="h-4 w-4 fill-white" />
              </button>

              <div className="flex flex-1 items-center gap-3">
                <div className="relative h-1 w-full rounded-full bg-white/30">
                  <div className="h-full w-1/2 rounded-full bg-white" />
                  <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/40 bg-white" />
                </div>
                <span className="whitespace-nowrap text-xs font-medium text-zinc-200">
                  0:05 / 0:10
                </span>
              </div>

              <button
                type="button"
                aria-label="Volume"
                className="rounded-lg bg-white/10 p-2 text-white transition hover:bg-white/20"
              >
                <Volume2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Settings"
                className="rounded-lg bg-white/10 p-2 text-white transition hover:bg-white/20"
              >
                <Settings className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Maximize"
                className="rounded-lg bg-white/10 p-2 text-white transition hover:bg-white/20"
              >
                <Maximize className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.article>

        <motion.article
          {...reveal}
          transition={{ ...reveal.transition, delay: 0.1 }}
          className="grid items-center gap-16 lg:grid-cols-2 lg:gap-24"
        >
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-900">
            <AnimatePresence mode="wait">
              <motion.img
                key={sliderImages[activeSlide].src}
                src={sliderImages[activeSlide].src}
                alt={sliderImages[activeSlide].alt}
                initial={{ opacity: 0.25, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0.25, scale: 1.02 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="h-[420px] w-full object-cover"
              />
            </AnimatePresence>

            <button
              type="button"
              onClick={prevSlide}
              aria-label="Previous slide"
              className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-black/40 p-3 text-white backdrop-blur-md transition hover:bg-white/20"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={nextSlide}
              aria-label="Next slide"
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-black/40 p-3 text-white backdrop-blur-md transition hover:bg-white/20"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-6">
            <h2 className="text-balance text-4xl font-bold leading-tight text-white md:text-5xl">
              Walk inside your interior designs in 3D
            </h2>
            <p className="text-lg leading-relaxed text-zinc-400">
              Move naturally through every room and evaluate layout decisions from a true
              first-person perspective.
            </p>
            <p className="text-lg leading-relaxed text-zinc-400">
              Explore how daylight, textures, and furniture scale behave together as you
              navigate your transformed space.
            </p>
            <p className="text-lg leading-relaxed text-zinc-400">
              Present immersive concepts to clients and let them experience each design
              direction before any physical work starts.
            </p>
            <p className="text-lg leading-relaxed text-zinc-400">
              Darkor.ai is an official launch partner of World Labs state-of-the-art AI
              world model that makes this feature possible.
            </p>
          </div>
        </motion.article>
      </div>
    </section>
  );
}
