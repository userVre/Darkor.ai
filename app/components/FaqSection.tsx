"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

const reveal = {
  initial: { opacity: 0, y: 46, filter: "blur(10px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: false, amount: 0.2 },
  transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const },
};

const faqs = [
  {
    question: "How does Darkor.ai work?",
    answer:
      "Upload a room photo, choose a style, and Darkor.ai generates premium redesigns while preserving the original structure.",
  },
  {
    question: "Which plan is right for me?",
    answer:
      "Pro is ideal to start fast, Premium unlocks advanced workflows, and Ultra is best for high-volume professional teams.",
  },
  {
    question: "Can I cancel anytime?",
    answer: "Yes. You can manage or cancel your subscription from billing at any time.",
  },
];

type FaqSectionProps = {
  onStartFree: () => void;
};

export default function FaqSection({ onStartFree }: FaqSectionProps) {
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <motion.section id="faq" className="mx-auto w-full max-w-4xl px-6 py-24" {...reveal}>
      <h2 className="mb-8 text-center text-4xl font-bold text-white">Frequently asked questions</h2>
      <div className="space-y-3">
        {faqs.map((faq, index) => (
          <motion.div key={faq.question} className="rounded-2xl border border-white/10 bg-zinc-900/50">
            <button
              onClick={() => setOpenFaq(openFaq === index ? -1 : index)}
              className="flex w-full items-center justify-between px-6 py-5 text-left"
            >
              <span className="font-medium text-white">{faq.question}</span>
              <span className="text-xl text-cyan-200">{openFaq === index ? "-" : "+"}</span>
            </button>
            <AnimatePresence initial={false}>
              {openFaq === index && (
                <motion.div
                  key="answer"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <p className="px-6 pb-5 text-zinc-300">{faq.answer}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      <div className="mt-12 text-center">
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onStartFree}
          className="cursor-pointer rounded-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400 px-7 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(168,85,247,0.45)] transition hover:brightness-110"
        >
          Start for free
        </motion.button>
      </div>
    </motion.section>
  );
}
