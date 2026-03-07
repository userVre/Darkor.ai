"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Lock, Sparkles, UploadCloud, WandSparkles } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";

type TabKey = "redesign" | "virtual-staging" | "edit";
type UserPlan = "free" | "pro" | "premium" | "ultra";
type WorkspaceState = "idle" | "loading" | "success";

type CurrentUser = {
  plan: string;
  credits: number;
};

const tabItems: { id: TabKey; label: string; premiumOnly: boolean }[] = [
  { id: "redesign", label: "Redesign", premiumOnly: false },
  { id: "virtual-staging", label: "Virtual Staging", premiumOnly: true },
  { id: "edit", label: "Edit", premiumOnly: true },
];

const resultActions = ["Upscale", "Google Lens", "VR"] as const;

const styles = ["Modern", "Minimalist", "Scandinavian", "Bohemian", "Cyberpunk"];
const promptChips = [
  { label: "Paint walls", text: "Paint the walls " },
  { label: "Add furniture", text: "Add modern furniture " },
  { label: "Change lighting", text: "Change lighting to warm cinematic mood " },
  { label: "Add people", text: "Add realistic people " },
];

const PLAN_LABEL: Record<UserPlan, string> = {
  free: "Free",
  pro: "Pro",
  premium: "Premium",
  ultra: "Ultra",
};

const PLAN_ALLOWANCE: Record<UserPlan, number> = {
  free: 0,
  pro: 100,
  premium: 500,
  ultra: 2000,
};

const RENDER_CAP: Record<UserPlan, number> = {
  free: 4,
  pro: 4,
  premium: 8,
  ultra: 16,
};

export default function WorkspacePage() {
  const [activeTab, setActiveTab] = useState<TabKey>("redesign");
  const [is3DMode, setIs3DMode] = useState(false);
  const [isTurboMode, setIsTurboMode] = useState(false);
  const [workspaceState, setWorkspaceState] = useState<WorkspaceState>("idle");

  const [style, setStyle] = useState(styles[0]);
  const [customPrompt, setCustomPrompt] = useState("");

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previousPreviewRef = useRef<string | null>(null);

  const me = useQuery("users:me" as any) as CurrentUser | null | undefined;
  const ensureProfile = useMutation("users:getOrCreateCurrentUser" as any);
  const saveGeneration = useMutation("generations:saveGeneration" as any);

  const normalizedPlan = ((me?.plan ?? "free").toLowerCase() as UserPlan) || "free";
  const currentPlan: UserPlan = normalizedPlan in PLAN_LABEL ? normalizedPlan : "free";

  const hasPremium = currentPlan === "premium" || currentPlan === "ultra";
  const hasUltra = currentPlan === "ultra";

  const credits = Number(me?.credits ?? 0);
  const creditsAllowance = PLAN_ALLOWANCE[currentPlan];
  const creditsProgress = creditsAllowance > 0 ? Math.min(100, (credits / creditsAllowance) * 100) : 0;
  const renderCap = RENDER_CAP[currentPlan];

  useEffect(() => {
    void ensureProfile({}).catch(() => {
      // Profile bootstrap is best-effort in UI.
    });
  }, [ensureProfile]);

  useEffect(() => {
    if (!hasPremium && activeTab !== "redesign") {
      setActiveTab("redesign");
    }
    if (!hasPremium) {
      setIs3DMode(false);
    }
    if (!hasUltra) {
      setIsTurboMode(false);
    }
  }, [activeTab, hasPremium, hasUltra]);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  };

  const onLockedPremiumTab = () => {
    showToast("Upgrade to Premium to unlock Virtual Staging and conversational editing.");
  };

  const onLocked3D = () => {
    showToast("Upgrade to Premium to unlock 3D Walkthroughs.");
  };

  const onLockedUltra = () => {
    showToast("Upgrade to Ultra for dedicated server speed and Hyper-Realism™.");
  };

  const onLockedPremiumResultAction = () => {
    showToast("Upgrade to Premium to unlock Upscale, Google Lens, and VR tools.");
  };

  const handleFileSelection = (file?: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    setImagePreview(URL.createObjectURL(file));
    setGeneratedImageUrl(null);
    setWorkspaceState("idle");
  };

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    handleFileSelection(event.target.files?.[0]);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    handleFileSelection(event.dataTransfer.files?.[0]);
  };

  const clearImagePreview = () => {
    setImagePreview(null);
    setGeneratedImageUrl(null);
    setWorkspaceState("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const appendPromptChip = (text: string) => {
    setCustomPrompt((prev) => `${prev}${prev && !prev.endsWith(" ") ? " " : ""}${text}`);
  };

  const toBase64FromObjectUrl = async (objectUrl: string) => {
    const response = await fetch(objectUrl);
    const blob = await response.blob();

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const marker = "base64,";
        const markerIndex = result.indexOf(marker);
        resolve(markerIndex >= 0 ? result.slice(markerIndex + marker.length) : result);
      };
      reader.onerror = () => reject(new Error("Failed to convert image to base64"));
      reader.readAsDataURL(blob);
    });
  };

  const modelPlanForApi = useMemo<"pro" | "premium" | "ultra">(() => {
    if (currentPlan === "ultra") return "ultra";
    if (currentPlan === "premium") return "premium";
    return "pro";
  }, [currentPlan]);

  const handleGenerate = async () => {
    if (!imagePreview) {
      fileInputRef.current?.click();
      return;
    }

    if (credits <= 0) {
      showToast("No credits left. Refill from Billing to continue.");
      return;
    }

    try {
      setWorkspaceState("loading");
      const imageBase64 = await toBase64FromObjectUrl(imagePreview);

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64,
          prompt: customPrompt,
          style,
          planUsed: modelPlanForApi,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data?.imageUrl) {
        throw new Error(data?.error ?? "Generation failed");
      }

      const imageUrl = data.imageUrl as string;
      setGeneratedImageUrl(imageUrl);

      await saveGeneration({
        imageUrl,
        prompt: customPrompt || undefined,
        style: style || undefined,
        planUsed: PLAN_LABEL[currentPlan],
      });

      setWorkspaceState("success");
    } catch (error) {
      setWorkspaceState("idle");
      showToast(error instanceof Error ? error.message : "Could not generate image");
    }
  };

  useEffect(() => {
    if (previousPreviewRef.current && previousPreviewRef.current !== imagePreview) {
      URL.revokeObjectURL(previousPreviewRef.current);
    }
    previousPreviewRef.current = imagePreview;
  }, [imagePreview]);

  useEffect(() => {
    return () => {
      if (previousPreviewRef.current) URL.revokeObjectURL(previousPreviewRef.current);
    };
  }, []);

  return (
    <main className="h-[calc(100vh-72px)] overflow-hidden bg-zinc-950 text-zinc-100">
      <div className="flex h-full w-full">
        <aside className="flex w-[380px] shrink-0 flex-col border-r border-white/10 bg-zinc-950">
          <div className="border-b border-white/10 px-6 py-5">
            <h1 className="text-lg font-semibold tracking-tight">Workspace</h1>
            <p className="mt-1 text-sm text-zinc-400">Premium interior generation with strict plan access.</p>
            <motion.div layout className="mt-4 rounded-2xl border border-fuchsia-400/20 bg-zinc-900/70 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wide text-zinc-400">Current Plan</span>
                <span className="text-xs font-semibold text-fuchsia-200">{PLAN_LABEL[currentPlan]}</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs uppercase tracking-wide text-zinc-400">Credits</span>
                <span className="text-sm font-semibold text-white">{credits}</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${creditsProgress}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-violet-500"
                />
              </div>
            </motion.div>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
            <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-1">
              <div className="relative grid grid-cols-3 gap-1">
                {tabItems.map((tab) => {
                  const locked = tab.premiumOnly && !hasPremium;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        if (locked) {
                          onLockedPremiumTab();
                          return;
                        }
                        setActiveTab(tab.id);
                      }}
                      className={`relative z-10 inline-flex items-center justify-center gap-1 rounded-xl px-2 py-2.5 text-xs font-semibold transition-all duration-200 ${
                        active ? "text-white" : locked ? "text-zinc-500" : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      {tab.label}
                      <AnimatePresence>
                        {locked ? (
                          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <Lock className="h-3 w-3 text-amber-300" />
                          </motion.span>
                        ) : null}
                      </AnimatePresence>
                    </button>
                  );
                })}
                <motion.div
                  layout
                  layoutId="activeTabPill"
                  className="absolute bottom-1 top-1 w-[calc(33.333%-0.333rem)] rounded-xl border border-fuchsia-400/30 bg-gradient-to-r from-fuchsia-500/20 to-purple-500/20 shadow-[0_0_14px_rgba(217,70,239,0.2)]"
                  animate={{ x: activeTab === "redesign" ? "0%" : activeTab === "virtual-staging" ? "102%" : "204%" }}
                  transition={{ type: "spring", stiffness: 340, damping: 28 }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">Style</label>
              <select
                value={style}
                onChange={(event) => setStyle(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm outline-none transition focus:border-fuchsia-500/70 focus:ring-2 focus:ring-fuchsia-500/30"
              >
                {styles.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                {activeTab === "edit" ? "Edit Instructions" : "Custom Prompt"}
              </label>
              <textarea
                value={customPrompt}
                onChange={(event) => setCustomPrompt(event.target.value)}
                placeholder={
                  activeTab === "edit"
                    ? "e.g., Remove the coffee table and add a large olive plant"
                    : "Describe atmosphere, materials, and lighting..."
                }
                className="min-h-[120px] w-full resize-none rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm outline-none transition placeholder:text-zinc-500 focus:border-fuchsia-500/70 focus:ring-2 focus:ring-fuchsia-500/30"
              />
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Quick Actions</p>
              <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-700">
                {promptChips.map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => appendPromptChip(chip.text)}
                    className="shrink-0 rounded-full border border-white/10 bg-zinc-900/80 px-3 py-1.5 text-xs text-zinc-200 transition hover:border-fuchsia-400/60 hover:bg-fuchsia-500/10"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            <motion.div layout className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="inline-flex items-center gap-1 text-sm font-medium text-zinc-200">
                    3D Video Walkthrough
                    {!hasPremium ? <Lock className="h-3.5 w-3.5 text-amber-300" /> : null}
                  </p>
                  <p className="text-xs text-zinc-500">Premium and Ultra only</p>
                </div>
                <button
                  type="button"
                  disabled={!hasPremium}
                  onClick={() => {
                    if (!hasPremium) {
                      onLocked3D();
                      return;
                    }
                    setIs3DMode((prev) => !prev);
                  }}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full border transition-all duration-200 ${
                    is3DMode ? "border-fuchsia-300/70 bg-fuchsia-500/70" : "border-white/20 bg-zinc-800"
                  } ${!hasPremium ? "cursor-not-allowed opacity-55" : ""}`}
                >
                  <span className={`h-5 w-5 rounded-full bg-white transition ${is3DMode ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
            </motion.div>

            <motion.div layout className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="inline-flex items-center gap-1 text-sm font-medium text-zinc-200">
                    Turbo &amp; Hyper Realism Mode
                    {!hasUltra ? <Lock className="h-3.5 w-3.5 text-amber-300" /> : null}
                  </p>
                  <p className="text-xs text-zinc-500">Ultra only</p>
                </div>
                <button
                  type="button"
                  disabled={!hasUltra}
                  onClick={() => {
                    if (!hasUltra) {
                      onLockedUltra();
                      return;
                    }
                    setIsTurboMode((prev) => !prev);
                  }}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full border transition-all duration-200 ${
                    isTurboMode ? "border-violet-300/70 bg-violet-500/70" : "border-white/20 bg-zinc-800"
                  } ${!hasUltra ? "cursor-not-allowed opacity-55" : ""}`}
                >
                  <span className={`h-5 w-5 rounded-full bg-white transition ${isTurboMode ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
            </motion.div>
          </div>

          <div className="border-t border-white/10 p-5">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={workspaceState === "loading"}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold text-white shadow-[0_14px_38px_rgba(168,85,247,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70 ${
                isTurboMode ? "bg-gradient-to-r from-violet-500 to-fuchsia-500" : "bg-gradient-to-r from-fuchsia-600 to-purple-600"
              }`}
            >
              <Sparkles className="h-4 w-4" />
              {workspaceState === "loading" ? "Generating..." : `Generate ${renderCap} Renders`}
            </button>
          </div>
        </aside>

        <section className="relative flex flex-1 flex-col bg-zinc-950 p-7">
          <AnimatePresence>
            {toast && (
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="absolute right-8 top-6 z-50 rounded-xl border border-fuchsia-300/30 bg-zinc-900/95 px-4 py-2 text-sm text-fuchsia-100 shadow-xl"
              >
                {toast}
              </motion.div>
            )}
          </AnimatePresence>

          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

          {workspaceState === "success" && generatedImageUrl ? (
            <div className="h-full overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/70">
              <img src={generatedImageUrl} alt="Generated interior" className="h-full w-full object-cover" />
              <div className="absolute bottom-10 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/20 bg-black/45 px-2 py-1.5 backdrop-blur-xl">
                {resultActions.map((action) => {
                  const locked = !hasPremium;
                  return (
                    <button
                      key={action}
                      type="button"
                      onClick={() => {
                        if (locked) {
                          onLockedPremiumResultAction();
                          return;
                        }
                        showToast(`${action} is enabled for your plan.`);
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                        locked
                          ? "border-amber-400/35 bg-amber-500/10 text-amber-100"
                          : "border-white/20 bg-white/5 text-zinc-100 hover:bg-white/10"
                      }`}
                    >
                      {action}
                      {locked ? <Lock className="h-3 w-3 text-amber-300" /> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : workspaceState === "loading" ? (
            <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-white/10 bg-zinc-900/40">
              <motion.h2
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                className="text-5xl font-semibold tracking-tight text-fuchsia-200 drop-shadow-[0_0_24px_rgba(217,70,239,0.55)]"
              >
                Darkor.ai
              </motion.h2>
              <p className="mt-4 text-zinc-300">AI is redesigning your space...</p>
            </div>
          ) : (
            <label
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`group relative block h-full cursor-pointer overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/40 p-6 transition ${
                isDragging
                  ? "border-fuchsia-500 bg-fuchsia-500/10 shadow-[0_0_0_1px_rgba(217,70,239,0.4),0_0_40px_rgba(217,70,239,0.2)]"
                  : "hover:border-fuchsia-500 hover:bg-fuchsia-500/5"
              }`}
              onClick={() => {
                if (!imagePreview) fileInputRef.current?.click();
              }}
            >
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="Workspace uploaded preview" className="h-full w-full rounded-2xl object-cover" />
                  <div className="pointer-events-none absolute inset-x-6 bottom-6 rounded-xl border border-white/15 bg-black/45 p-3 backdrop-blur">
                    <p className="text-xs text-zinc-200">Drag and drop a new image or use Change Image to replace this one.</p>
                  </div>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="absolute left-10 top-10 z-30 rounded-lg border border-white/30 bg-black/65 px-3 py-1.5 text-xs font-medium text-white transition hover:border-fuchsia-500/70 hover:text-fuchsia-200"
                  >
                    Change Image
                  </button>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      clearImagePreview();
                    }}
                    className="absolute right-10 top-10 z-30 rounded-lg border border-white/30 bg-black/65 px-3 py-1.5 text-xs font-medium text-white transition hover:border-fuchsia-500/70 hover:text-fuchsia-200"
                  >
                    Remove Image
                  </button>
                </>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
                  <motion.div
                    animate={{ y: [0, -6, 0], opacity: [0.8, 1, 0.8] }}
                    transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                    className="rounded-3xl border border-fuchsia-500/30 bg-fuchsia-500/10 p-5 shadow-[0_0_30px_rgba(217,70,239,0.3)]"
                  >
                    <WandSparkles className="h-10 w-10 text-fuchsia-300" />
                  </motion.div>

                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-white">Your Canvas is Empty</h2>
                    <p className="mt-2 max-w-xl text-zinc-400">Upload a room photo to generate your next design.</p>
                  </div>

                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-zinc-900/70 px-4 py-2 text-sm text-zinc-300">
                    <UploadCloud className="h-4 w-4" />
                    Drag &amp; Drop or Click to Upload
                  </div>
                </div>
              )}
            </label>
          )}
        </section>
      </div>
    </main>
  );
}

