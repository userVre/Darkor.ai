"use client";

import Link from "next/link";
import { Download, Sparkles, Trash2 } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";

type GenerationDoc = {
  _id: string;
  imageUrl: string;
  prompt?: string;
  style?: string;
  planUsed: string;
};

export default function GalleryPage() {
  const [toast, setToast] = useState<string | null>(null);

  const archive = useQuery("generations:getUserArchive" as any) as GenerationDoc[] | undefined;
  const deleteGeneration = useMutation("generations:deleteGeneration" as any);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 1800);
  };

  const getPlanBadgeClass = (plan: string) => {
    const normalized = plan.toLowerCase();
    if (normalized === "ultra") {
      return "border-amber-300/40 bg-amber-400/20 text-amber-100 shadow-[0_0_18px_rgba(251,191,36,0.35)]";
    }
    if (normalized === "premium") {
      return "border-emerald-300/40 bg-emerald-400/20 text-emerald-100 shadow-[0_0_18px_rgba(16,185,129,0.35)]";
    }
    return "border-sky-300/30 bg-sky-400/20 text-sky-100";
  };

  const onDelete = async (id: string) => {
    const ok = window.confirm("Delete this generation permanently?");
    if (!ok) return;

    try {
      await deleteGeneration({ id });
      showToast("Generation deleted");
    } catch {
      showToast("Could not delete generation");
    }
  };

  return (
    <main className="min-h-[calc(100vh-72px)] bg-zinc-950 px-6 py-10 text-zinc-100 md:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Gallery</h1>
          <p className="mt-2 text-zinc-400">Your generated interiors are saved here.</p>
        </div>

        {toast && (
          <div className="fixed right-6 top-24 z-50 rounded-xl border border-white/15 bg-zinc-900/95 px-4 py-2 text-sm shadow-xl backdrop-blur">
            {toast}
          </div>
        )}

        {archive === undefined && (
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60"
              >
                <div className="h-56 animate-pulse bg-zinc-800/80" />
                <div className="space-y-2 p-4">
                  <div className="h-3 w-3/4 animate-pulse rounded bg-zinc-800" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-800" />
                </div>
              </div>
            ))}
          </div>
        )}

        {archive !== undefined && archive.length === 0 && (
          <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-3xl border border-white/10 bg-zinc-900/40 text-center">
            <p className="text-xl font-medium text-zinc-200">No generations yet</p>
            <p className="mt-2 max-w-md text-zinc-400">
              Generate your first design in the workspace.
            </p>
            <Link
              href="/dashboard/workspace"
              className="mt-5 inline-flex items-center gap-2 rounded-xl border border-fuchsia-300/35 bg-fuchsia-500/15 px-4 py-2.5 text-sm font-semibold text-fuchsia-100 transition hover:bg-fuchsia-500/25"
            >
              <Sparkles className="h-4 w-4" />
              Generate your first design
            </Link>
          </div>
        )}

        {archive !== undefined && archive.length > 0 && (
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
            {archive.map((item) => (
              <article
                key={item._id}
                className="group relative mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/50"
              >
                <img src={item.imageUrl} alt={item.prompt || "Generated interior"} className="w-full object-cover" />

                <div
                  className={`absolute left-3 top-3 rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide backdrop-blur-md ${getPlanBadgeClass(item.planUsed)}`}
                >
                  {item.planUsed}
                </div>

                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/0 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

                <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/20 bg-black/45 p-1.5 opacity-0 backdrop-blur-xl transition-opacity duration-200 group-hover:opacity-100">
                  <a
                    href={item.imageUrl}
                    download
                    className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-white hover:bg-white/10"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </a>
                  <button
                    type="button"
                    onClick={() => onDelete(item._id)}
                    className="inline-flex items-center gap-1 rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-200 hover:bg-rose-500/20"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>

                <div className="space-y-1 p-4">
                  <p className="line-clamp-2 text-sm text-zinc-200">{item.prompt || "No prompt provided"}</p>
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    {item.style ? <span>{item.style}</span> : null}
                    {item.style ? <span>•</span> : null}
                    <span>Archive</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
