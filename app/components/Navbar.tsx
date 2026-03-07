"use client";

import { motion } from "framer-motion";

type NavbarProps = {
  onStartFree: () => void;
};

export default function Navbar({ onStartFree }: NavbarProps) {
  return (
    <header className="fixed top-0 z-40 w-full border-b border-white/10 bg-black/30 backdrop-blur-xl">
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
        <a href="#top" className="text-xl font-semibold tracking-tight">
          Darkor<span className="text-cyan-300">.ai</span>
        </a>

        <div className="hidden items-center gap-7 text-sm text-zinc-300 md:flex">
          <a className="transition hover:text-white" href="#pricing">
            Pricing
          </a>
          <a className="transition hover:text-white" href="#gallery">
            Gallery
          </a>
          <a className="transition hover:text-white" href="#faq">
            FAQ
          </a>
        </div>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onStartFree}
          className="cursor-pointer rounded-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_30px_rgba(168,85,247,0.45)] transition hover:brightness-110"
        >
          Start for free
        </motion.button>
      </nav>
    </header>
  );
}
