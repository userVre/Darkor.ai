"use client";

import Image from "next/image";
import { ImagePlus, Sparkles, UploadCloud } from "lucide-react";
import { useMemo, useState } from "react";

type WorkspaceState = "empty" | "loading" | "success";

const styles = ["Modern", "Bohemian", "Cyberpunk", "Scandinavian", "Minimalist"];

const resultImages = [
  "https://images.unsplash.com/photo-1616594039964-3f9f4a6cc7f3?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1600210492486-724fe5c67fb3?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1617098900591-3f90928e8c54?auto=format&fit=crop&w=1400&q=80",
];

export default function ProDashboardPage() {
  const [selectedStyle, setSelectedStyle] = useState(styles[0]);
  const [prompt, setPrompt] = useState("");
  const [workspaceState, setWorkspaceState] = useState<WorkspaceState>("empty");

  const featuredImage = useMemo(() => resultImages[0], []);
  const variations = useMemo(() => resultImages.slice(1), []);

  const handleGenerate = () => {
    setWorkspaceState("loading");
    window.setTimeout(() => {
      setWorkspaceState("success");
    }, 3000);
  };

  return (
    <main className="h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <div className="flex h-full w-full flex-col lg:flex-row">
        <aside className="relative flex w-full shrink-0 flex-col border-r border-white/10 bg-zinc-950 lg:w-[350px]">
          <div className="space-y-7 overflow-y-auto p-6 pb-28">
            <div>
              <h1 className="text-xl font-bold">Pro Workspace</h1>
              <p className="mt-1 text-sm text-zinc-400">Fast interior redesigns with up to 4 parallel renders.</p>
            </div>

            <button className="group w-full rounded-2xl border-2 border-dashed border-white/15 bg-zinc-900/40 p-6 text-left transition hover:border-fuchsia-400/60 hover:shadow-[0_0_24px_rgba(217,70,239,0.2)]">
              <UploadCloud className="mb-3 h-7 w-7 text-zinc-300 transition group-hover:text-fuchsia-300" />
              <p className="text-sm text-zinc-200">Drag &amp; drop your room photo or click to browse</p>
            </button>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Style picker</label>
              <select
                value={selectedStyle}
                onChange={(event) => setSelectedStyle(event.target.value)}
                className="w-full rounded-xl border border-white/15 bg-zinc-900 px-3 py-2.5 text-sm outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/30"
              >
                {styles.map((style) => (
                  <option key={style} value={style}>
                    {style}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Custom prompt</label>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Add custom instructions (e.g., Make the sofa green velvet...)"
                className="min-h-[150px] w-full resize-none rounded-xl border border-white/15 bg-zinc-900 px-3 py-2.5 text-sm outline-none transition placeholder:text-zinc-500 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/30"
              />
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 border-t border-white/10 bg-zinc-950/95 p-5 backdrop-blur">
            <button
              onClick={handleGenerate}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400 px-4 py-3.5 font-semibold text-white shadow-[0_12px_36px_rgba(217,70,239,0.28)] transition hover:brightness-110"
            >
              <Sparkles className="h-4 w-4" />
              Generate 4 Renders
            </button>
          </div>
        </aside>

        <section className="flex-1 overflow-y-auto bg-zinc-900 p-6 lg:p-8">
          {workspaceState === "empty" && (
            <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-white/10 bg-zinc-900/60 text-center">
              <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
                <ImagePlus className="h-9 w-9 text-zinc-300" />
              </div>
              <h2 className="mt-5 text-2xl font-semibold text-white">Ready to create your first render?</h2>
              <p className="mt-2 max-w-md text-zinc-400">
                Upload a photo and tweak settings to generate magic.
              </p>
            </div>
          )}

          {workspaceState === "loading" && (
            <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-white/10 bg-zinc-900/60 text-center">
              <div className="relative h-16 w-16">
                <div className="absolute inset-0 rounded-full border-2 border-fuchsia-400/35" />
                <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-fuchsia-400 border-r-cyan-400" />
              </div>
              <h2 className="mt-6 text-2xl font-semibold text-white">AI is redesigning your space...</h2>
              <p className="mt-2 text-zinc-400">Generating photorealistic variations and lighting passes.</p>

              <div className="mt-10 grid w-full max-w-5xl grid-cols-1 gap-4 md:grid-cols-2">
                {[0, 1, 2, 3].map((item) => (
                  <div key={item} className="h-44 animate-pulse rounded-2xl border border-white/10 bg-zinc-800/70" />
                ))}
              </div>
            </div>
          )}

          {workspaceState === "success" && (
            <div className="space-y-5">
              <div className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/70 shadow-2xl">
                <Image
                  src={featuredImage}
                  alt="Featured generated interior result"
                  width={1600}
                  height={1000}
                  className="h-[420px] w-full object-cover"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {variations.map((image, index) => (
                  <div key={image} className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/70">
                    <Image
                      src={image}
                      alt={`Variation ${index + 1}`}
                      width={1200}
                      height={800}
                      className="h-[190px] w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
