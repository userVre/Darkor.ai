"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const reveal = {
  initial: { opacity: 0, y: 40, filter: "blur(8px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: false, amount: 0.2 },
  transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
};

export default function VirtualStaging() {
  return (
    <motion.section {...reveal} className="mx-auto w-full max-w-7xl px-6 py-24">
      <div className="rounded-3xl border border-white/10 bg-zinc-950/70 p-8 md:p-12">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold text-white md:text-5xl">
            Virtual Staging AI: Turn Empty Listings into High-Value Homes
          </h2>
          <p className="mx-auto mt-6 max-w-4xl text-center text-base leading-relaxed text-zinc-400 md:text-lg">
            Darkor.ai transforms empty rooms into premium staged interiors in seconds, helping agents and homeowners present
            spaces with confidence and close faster.
          </p>
        </div>

        <div className="mt-16 flex flex-col items-center justify-center gap-6 md:flex-row">
          <img
            src="/media/empty-room.png"
            alt="Empty room before virtual staging"
            className="h-[250px] w-full max-w-[520px] rounded-2xl border border-white/10 object-cover md:h-[320px]"
          />

          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="flex items-center justify-center"
          >
            <svg aria-hidden="true" viewBox="0 0 170 90" className="h-16 w-24 text-white md:h-20 md:w-32" fill="none">
              <path d="M6 45c26 0 34 22 62 22 20 0 34-11 50-24" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
              <path d="M97 23l26 17-30 12" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.div>

          <img
            src="/media/staged-room.png"
            alt="Staged room after virtual staging"
            className="h-[250px] w-full max-w-[520px] rounded-2xl border border-white/10 object-cover shadow-2xl shadow-purple-500/20 md:h-[320px]"
          />
        </div>

        <div className="mt-10 text-center">
          <Link
            href="#auth-flow"
            className="rounded-xl bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(168,85,247,0.35)] transition hover:brightness-110"
          >
            Start for free
          </Link>
        </div>
      </div>
    </motion.section>
  );
}
