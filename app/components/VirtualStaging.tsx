"use client";

import Image from "next/image";
import { motion } from "framer-motion";

import beforeImage from "@/public/media/before-empty-room.png";
import afterImage from "@/public/media/after-luxury-minimalist.png";

const reveal = {
  initial: { opacity: 0, y: 40, filter: "blur(8px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: false, amount: 0.2 },
  transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
};

export default function VirtualStaging() {
  return (
    <motion.section
      {...reveal}
      className="mx-auto w-full max-w-7xl px-6 py-24"
    >
      <div className="rounded-3xl border border-white/10 bg-zinc-950/70 p-8 md:p-12">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold text-white md:text-5xl">
            Virtual Staging AI: Turn Empty Listings into High-Value Homes
          </h2>
          <p className="mx-auto mt-6 max-w-4xl text-center text-base leading-relaxed text-zinc-400 md:text-lg">
            Data shows that virtually staged properties sell 87% faster and command up to 15% higher offers than vacant ones. For a real estate agent, this means larger commissions and quicker closings-averaging $35,000+ in extra yearly income for top producers. With Darkor.ai&apos;s Pro plan, you can stage up to 1,000 photos every month with our Virtual Staging AI feature for only $390/year. Maximize your ROI without the heavy costs of traditional physical furniture staging.
          </p>
        </div>

        <div className="mt-16 flex flex-col items-center justify-center gap-6 md:flex-row">
          <Image
            src={beforeImage}
            alt="Before virtual staging empty room"
            placeholder="blur"
            className="h-[250px] w-full max-w-[520px] rounded-xl border border-white/10 object-cover md:h-[320px]"
          />

          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="flex items-center justify-center"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 170 90"
              className="h-16 w-24 text-white md:h-20 md:w-32"
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
          </motion.div>

          <Image
            src={afterImage}
            alt="After virtual staging beautifully furnished room"
            placeholder="blur"
            className="h-[250px] w-full max-w-[520px] rounded-xl border border-white/10 object-cover shadow-[0_0_30px_rgba(217,70,239,0.2)] md:h-[320px]"
          />
        </div>
      </div>
    </motion.section>
  );
}
