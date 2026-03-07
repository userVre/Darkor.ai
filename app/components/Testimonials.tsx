"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Sarah Collins",
    role: "Real Estate Broker",
    quote: "Darkor AI saved me over $2,000 in design fees and helped listings close faster.",
  },
  {
    name: "Amir Rahmani",
    role: "Homeowner",
    quote: "I redesigned my entire living room in one evening and finally saw a clear direction.",
  },
  {
    name: "Olivia Grant",
    role: "Interior Stylist",
    quote: "The visual quality is premium enough for client proposals and mood boards.",
  },
  {
    name: "Daniel Pierce",
    role: "Property Investor",
    quote: "Virtual staging previews increased buyer interest before we even finished renovation.",
  },
  {
    name: "Maya Chen",
    role: "Airbnb Host",
    quote: "I used Darkor to test multiple looks and picked the one that booked instantly.",
  },
  {
    name: "Nadia Bell",
    role: "Architect",
    quote: "Sketch2Image let us communicate concepts to non-technical clients in seconds.",
  },
];

const reveal = {
  initial: { opacity: 0, y: 50, filter: "blur(10px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: false, amount: 0.15 },
  transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const },
};

export default function Testimonials() {
  return (
    <motion.section className="mx-auto w-full max-w-7xl px-6 py-24" {...reveal}>
      <div className="mb-12 text-center">
        <h2 className="text-4xl font-black text-white sm:text-5xl">Wall of Love</h2>
        <p className="mx-auto mt-4 max-w-3xl text-zinc-400">
          Real professionals use Darkor.ai daily to sell faster, design smarter, and visualize instantly.
        </p>
      </div>

      <div className="columns-1 gap-5 md:columns-2 lg:columns-3">
        {testimonials.map((item) => (
          <motion.article
            key={item.name}
            whileHover={{ y: -4 }}
            className="mb-5 break-inside-avoid rounded-2xl border border-white/10 bg-zinc-900/60 p-5 shadow-[0_0_24px_rgba(217,70,239,0.08)]"
          >
            <div className="mb-4 flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-amber-300 text-amber-300" />
              ))}
            </div>

            <p className="text-sm leading-relaxed text-zinc-200">"{item.quote}"</p>

            <div className="mt-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-zinc-800 text-sm font-semibold text-zinc-200">
                {item.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{item.name}</p>
                <p className="text-xs text-zinc-400">{item.role}</p>
              </div>
            </div>
          </motion.article>
        ))}
      </div>

      <div className="mt-8 text-center">
        <Link
          href="#auth-flow"
          className="rounded-xl bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(168,85,247,0.35)] transition hover:brightness-110"
        >
          Start for free
        </Link>
      </div>
    </motion.section>
  );
}
