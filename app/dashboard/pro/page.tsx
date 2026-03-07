"use client";

import Image from "next/image";
import { ImagePlus, Lock, Sparkles, UploadCloud } from "lucide-react";
import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";

type WorkspaceState = "empty" | "loading" | "success";
type UserPlan = "pro" | "premium" | "ultra";
type WorkspaceMode = "Redesign" | "Virtual Staging" | "Edit";
type OutputFormat = "image" | "video";

const styles = ["Modern", "Bohemian", "Cyberpunk", "Scandinavian", "Minimalist"];
const modes: WorkspaceMode[] = ["Redesign", "Virtual Staging", "Edit"];

const planImages: Record<UserPlan, string[]> = {
  pro: [
    "https://images.unsplash.com/photo-1616594039964-3f9f4a6cc7f3?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1600210492486-724fe5c67fb3?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1617098900591-3f90928e8c54?auto=format&fit=crop&w=1400&q=80",
  ],
  premium: [
    "https://images.unsplash.com/photo-1616594039964-3f9f4a6cc7f3?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1600210492486-724fe5c67fb3?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1617098900591-3f90928e8c54?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1600573472592-401b489a3cdc?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1600607687644-aac4c3eac7f4?auto=format&fit=crop&w=1400&q=80",
  ],
  ultra: [
    "https://images.unsplash.com/photo-1616594039964-3f9f4a6cc7f3?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1600210492486-724fe5c67fb3?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1617098900591-3f90928e8c54?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1600573472592-401b489a3cdc?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1600607687644-aac4c3eac7f4?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1493666438817-866a91353ca9?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1600210491892-03d54c0aaf87?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1617104551722-3b2d513664c0?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=1400&q=80",
  ],
};

const planConfig = {
  pro: {
    label: "Pro",
    renderCount: 4,
    buttonText: "? Generate 4 Renders",
    buttonClass:
      "bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400 shadow-[0_12px_36px_rgba(217,70,239,0.28)] hover:brightness-110",
  },
  premium: {
    label: "Premium",
    renderCount: 8,
    buttonText: "? Generate 8 Renders",
    buttonClass:
      "bg-[length:200%_200%] bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-400 shadow-[0_14px_40px_rgba(139,92,246,0.35)] animate-[gradientShift_3s_ease_infinite] hover:brightness-110",
  },
  ultra: {
    label: "Ultra",
    renderCount: 16,
    buttonText: "?? Generate 16 Renders",
    buttonClass:
      "animate-pulse bg-gradient-to-r from-amber-300 via-fuchsia-500 to-cyan-300 shadow-[0_18px_52px_rgba(236,72,153,0.48)] hover:brightness-110",
  },
} as const;

export default function ProDashboardPage() {
  const [selectedStyle, setSelectedStyle] = useState(styles[0]);
  const [prompt, setPrompt] = useState("");
  const [workspaceState, setWorkspaceState] = useState<WorkspaceState>("empty");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [userPlan, setUserPlan] = useState<UserPlan>("pro");
  const [activeMode, setActiveMode] = useState<WorkspaceMode>("Redesign");
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("image");
  const [isTurboMode, setIsTurboMode] = useState(false);
  const [upgradeHint, setUpgradeHint] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previousPreviewRef = useRef<string | null>(null);

  const currentPlan = planConfig[userPlan];
  const currentPlanImages = useMemo(() => planImages[userPlan], [userPlan]);
  const featuredImage = useMemo(() => currentPlanImages[0], [currentPlanImages]);
  const restImages = useMemo(() => currentPlanImages.slice(1), [currentPlanImages]);
  const canUseAdvancedModes = userPlan !== "pro";
  const canUseVideo = userPlan !== "pro";
  const canUseTurbo = userPlan === "ultra";

  const handleGenerate = () => {
    setWorkspaceState("loading");
    window.setTimeout(() => {
      setWorkspaceState("success");
    }, 3000);
  };

  const handleFileSelection = (file?: File) => {
    if (!file || !file.type.startsWith("image/")) {
      return;
    }
    const nextPreviewUrl = URL.createObjectURL(file);
    setImagePreview(nextPreviewUrl);
  };

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    handleFileSelection(event.target.files?.[0]);
  };

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsDragging(false);
    handleFileSelection(event.dataTransfer.files?.[0]);
  };

  const clearImagePreview = () => {
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleModeClick = (mode: WorkspaceMode) => {
    if (!canUseAdvancedModes && mode !== "Redesign") {
      setUpgradeHint("Upgrade to Premium");
      return;
    }
    setUpgradeHint(null);
    setActiveMode(mode);
  };

  useEffect(() => {
    if (!canUseAdvancedModes) {
      setActiveMode("Redesign");
    }
    if (!canUseVideo) {
      setOutputFormat("image");
    }
    if (!canUseTurbo) {
      setIsTurboMode(false);
    }
    setWorkspaceState("empty");
  }, [userPlan, canUseAdvancedModes, canUseTurbo, canUseVideo]);

  useEffect(() => {
    if (previousPreviewRef.current && previousPreviewRef.current !== imagePreview) {
      URL.revokeObjectURL(previousPreviewRef.current);
    }
    previousPreviewRef.current = imagePreview;
  }, [imagePreview]);

  useEffect(() => {
    return () => {
      if (previousPreviewRef.current) {
        URL.revokeObjectURL(previousPreviewRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!upgradeHint) {
      return;
    }
    const timer = window.setTimeout(() => setUpgradeHint(null), 1800);
    return () => window.clearTimeout(timer);
  }, [upgradeHint]);

  return (
    <main className="relative h-[calc(100vh-72px)] overflow-hidden bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none absolute left-1/2 top-4 z-50 -translate-x-1/2">
        <div className="pointer-events-auto inline-flex rounded-full border border-white/10 bg-zinc-900/90 p-1 backdrop-blur">
          {(["pro", "premium", "ultra"] as const).map((plan) => (
            <button
              key={plan}
              type="button"
              onClick={() => setUserPlan(plan)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
                userPlan === plan
                  ? "bg-white text-zinc-900"
                  : "text-zinc-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              {plan}
            </button>
          ))}
        </div>
      </div>

      <div className="flex h-full w-full flex-col lg:flex-row">
        <aside className="relative flex w-full shrink-0 flex-col border-r border-white/10 bg-zinc-950 lg:w-[350px]">
          <div className="space-y-7 overflow-y-auto p-6 pb-28">
            <div>
              <h1 className="text-xl font-bold">{currentPlan.label} Workspace</h1>
              <p className="mt-1 text-sm text-zinc-400">Fast interior redesigns with up to {currentPlan.renderCount} parallel renders.</p>
            </div>

            <div className="space-y-2">
              <div className="inline-flex w-full rounded-xl border border-white/10 bg-zinc-900/70 p-1">
                {modes.map((mode) => {
                  const locked = !canUseAdvancedModes && mode !== "Redesign";
                  const active = activeMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => handleModeClick(mode)}
                      title={locked ? "Upgrade to Premium" : mode}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition ${
                        active
                          ? "bg-white text-zinc-900"
                          : locked
                            ? "text-zinc-500 hover:bg-white/5"
                            : "text-zinc-300 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {mode}
                      {locked && <Lock className="h-3 w-3" />}
                    </button>
                  );
                })}
              </div>
              {upgradeHint && <p className="text-xs text-amber-300">{upgradeHint}</p>}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`group relative h-44 w-full overflow-hidden rounded-2xl border-2 border-dashed p-3 text-left transition ${
                isDragging
                  ? "border-fuchsia-500 bg-fuchsia-500/10 shadow-[0_0_30px_rgba(217,70,239,0.25)]"
                  : "border-white/15 bg-zinc-900/40 hover:border-fuchsia-400/60 hover:shadow-[0_0_24px_rgba(217,70,239,0.2)]"
              }`}
            >
              {imagePreview ? (
                <>
                  <img
                    src={imagePreview}
                    alt="Uploaded room preview"
                    className="h-full w-full rounded-xl object-cover"
                  />
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/45 via-black/0 to-transparent px-4 pb-3 pt-10 text-xs text-zinc-300">
                    Click or drop another image to replace
                  </span>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      clearImagePreview();
                    }}
                    className="absolute right-5 top-5 rounded-lg border border-white/30 bg-black/65 px-3 py-1.5 text-xs font-medium text-white backdrop-blur transition hover:border-fuchsia-400/70 hover:text-fuchsia-200"
                  >
                    Change image
                  </button>
                </>
              ) : (
                <div className="flex h-full flex-col justify-center">
                  <UploadCloud className="mb-3 h-7 w-7 text-zinc-300 transition group-hover:text-fuchsia-300" />
                  <p className="text-sm text-zinc-200">Drag &amp; drop your room photo or click to browse</p>
                </div>
              )}
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
                className="min-h-[130px] w-full resize-none rounded-xl border border-white/15 bg-zinc-900 px-3 py-2.5 text-sm outline-none transition placeholder:text-zinc-500 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/30"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Format</label>
              <div className="inline-flex w-full rounded-xl border border-white/10 bg-zinc-900/70 p-1">
                <button
                  type="button"
                  onClick={() => setOutputFormat("image")}
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition ${
                    outputFormat === "image" ? "bg-white text-zinc-900" : "text-zinc-300 hover:bg-white/10"
                  }`}
                >
                  Image
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!canUseVideo) {
                      setUpgradeHint("Upgrade to Premium");
                      return;
                    }
                    setOutputFormat("video");
                  }}
                  title={canUseVideo ? "3D Video Walkthrough" : "Upgrade to Premium"}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
                    outputFormat === "video" && canUseVideo
                      ? "bg-white text-zinc-900"
                      : "text-zinc-300 hover:bg-white/10"
                  } ${!canUseVideo ? "text-zinc-500" : ""}`}
                >
                  3D Video Walkthrough
                  {!canUseVideo && <Lock className="h-3 w-3" />}
                </button>
              </div>
            </div>

            {canUseTurbo && (
              <div className="rounded-xl border border-fuchsia-500/35 bg-fuchsia-500/10 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-fuchsia-100">?? Turbo &amp; Hyper Realism Mode</p>
                  <button
                    type="button"
                    onClick={() => setIsTurboMode((prev) => !prev)}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full border transition ${
                      isTurboMode
                        ? "border-fuchsia-300 bg-gradient-to-r from-fuchsia-500 to-cyan-400"
                        : "border-white/20 bg-zinc-800"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                        isTurboMode ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="absolute inset-x-0 bottom-0 border-t border-white/10 bg-zinc-950/95 p-5 backdrop-blur">
            <button
              onClick={handleGenerate}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 font-semibold text-white transition ${currentPlan.buttonClass}`}
            >
              <Sparkles className="h-4 w-4" />
              {currentPlan.buttonText}
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
              <p className="mt-2 text-zinc-400">Generating {currentPlan.renderCount} photorealistic variations and lighting passes.</p>

              <div className="mt-10 grid w-full max-w-5xl grid-cols-1 gap-4 md:grid-cols-2">
                {Array.from({ length: Math.min(currentPlan.renderCount, 8) }).map((_, item) => (
                  <div key={item} className="h-44 animate-pulse rounded-2xl border border-white/10 bg-zinc-800/70" />
                ))}
              </div>
            </div>
          )}

          {workspaceState === "success" && userPlan === "pro" && (
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
                {restImages.map((image, index) => (
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

          {workspaceState === "success" && userPlan === "premium" && (
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

              <div className="flex snap-x gap-4 overflow-x-auto pb-4 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-600 [&::-webkit-scrollbar-track]:bg-zinc-800/70">
                {restImages.map((image, index) => (
                  <div
                    key={image}
                    className="min-w-[280px] snap-start overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/70 md:min-w-[320px]"
                  >
                    <Image
                      src={image}
                      alt={`Premium variation ${index + 1}`}
                      width={900}
                      height={600}
                      className="h-[200px] w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {workspaceState === "success" && userPlan === "ultra" && (
            <div className="columns-2 gap-4 space-y-4 md:columns-3 lg:columns-4">
              {currentPlanImages.map((image, index) => (
                <div
                  key={`${image}-${index}`}
                  className="group mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/70"
                >
                  <Image
                    src={image}
                    alt={`Ultra render ${index + 1}`}
                    width={800}
                    height={index % 3 === 0 ? 1200 : 900}
                    className="h-auto w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <style jsx global>{`
        @keyframes gradientShift {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
      `}</style>
    </main>
  );
}

