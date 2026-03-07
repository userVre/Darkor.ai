"use client";

import { motion } from "framer-motion";

type StickyBottomBarProps = {
  visible: boolean;
  email: string;
  onEmailChange: (value: string) => void;
  onAction: () => void;
};

const premiumInputClass =
  "flex-1 rounded-xl border border-white/25 bg-white/5 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-[3px] focus:ring-fuchsia-500/40 focus:border-fuchsia-500 transition-all";

export default function StickyBottomBar({
  visible,
  email,
  onEmailChange,
  onAction,
}: StickyBottomBarProps) {
  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-50 border-t border-white/15 bg-black/65 p-3 backdrop-blur-2xl transition-transform duration-500 ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
          placeholder="Type your email..."
          className={premiumInputClass}
        />
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onAction}
          className="rounded-xl bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400 px-6 py-3 font-semibold text-white transition hover:brightness-110"
        >
          Log in to your account -&gt;
        </motion.button>
      </div>
    </div>
  );
}
