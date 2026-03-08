"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";

const faqItems = [
  {
    q: "How does Darkor.ai work?",
    a: "Upload a room photo, choose a style, and generate premium redesigns in seconds using AI tuned for realistic interiors.",
  },
  {
    q: "Which plan is right for me?",
    a: "Pro is best to start quickly, Premium is ideal for advanced creative control, and Ultra is designed for teams needing maximum speed and quality.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. You can manage or cancel your subscription from the billing portal whenever you want.",
  },
  {
    q: "Do I keep commercial rights to generated designs?",
    a: "Yes. Paid plans include commercial usage so you can use outputs in client decks, listings, and marketing.",
  },
  {
    q: "How many credits are used per generation?",
    a: "Each successful generation consumes one credit. Credits and remaining balance are always visible in your dashboard.",
  },
  {
    q: "What happens when my credits run out?",
    a: "Generation is paused until you refill credits or upgrade to a higher plan.",
  },
  {
    q: "Does Darkor.ai support Virtual Staging?",
    a: "Yes. Virtual Staging is available on Premium and Ultra plans.",
  },
  {
    q: "Are 3D walkthroughs available on all plans?",
    a: "3D walkthrough generation is unlocked on Premium and Ultra plans.",
  },
  {
    q: "What is Turbo & Hyper Realism mode?",
    a: "Turbo mode is an Ultra feature that prioritizes dedicated performance and high-fidelity visual output.",
  },
  {
    q: "Can I use Darkor.ai with my team?",
    a: "Yes. Ultra is the best fit for teams who need higher throughput and predictable rendering speed.",
  },
  {
    q: "How secure is my uploaded data?",
    a: "Uploads are processed securely and tied to your authenticated account context.",
  },
];

export default function FaqPage() {
  const [open, setOpen] = useState(0);

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-zinc-100 md:px-10">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-10">
          <Link href="/" className="text-sm text-cyan-200 transition hover:text-cyan-100">
            ← Back to Home
          </Link>
          <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">Frequently Asked Questions</h1>
          <p className="mt-3 text-zinc-400">Everything you need to know about plans, credits, and workflow.</p>
        </div>

        <div className="space-y-3">
          {faqItems.map((item, index) => (
            <motion.div
              key={item.q}
              layout
              className="rounded-2xl border border-white/10 bg-zinc-900/50 backdrop-blur"
            >
              <button
                type="button"
                onClick={() => setOpen(open === index ? -1 : index)}
                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
              >
                <span className="font-medium text-zinc-100">{item.q}</span>
                <span className="text-lg text-fuchsia-200">{open === index ? "−" : "+"}</span>
              </button>
              <AnimatePresence initial={false}>
                {open === index && (
                  <motion.div
                    key="answer"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    <p className="px-6 pb-5 text-zinc-300">{item.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </main>
  );
}
