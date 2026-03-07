"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Brush, ScanSearch, Sofa, Sparkles, UploadCloud, WandSparkles } from "lucide-react";
import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";

type TabKey = "redesign" | "virtual-staging" | "edit";
type UserPlan = "pro" | "premium" | "ultra";
type CameraMotion = "Zoom In" | "Pan Left" | "Pan Right" | "Orbit";

const tabItems: { id: TabKey; label: string }[] = [
  { id: "redesign", label: "Redesign" },
  { id: "virtual-staging", label: "Virtual Staging" },
  { id: "edit", label: "Edit" },
];

const styles = ["Modern", "Minimalist", "Scandinavian", "Bohemian", "Cyberpunk"];
const roomTypes = ["Living Room", "Bedroom", "Kitchen"];
const furnitureStyles = ["Contemporary", "Japandi", "Luxury Minimal", "Warm Modern"];
const cameraMotions: CameraMotion[] = ["Zoom In", "Pan Left", "Pan Right", "Orbit"];

export default function WorkspacePage() {
  const [activeTab, setActiveTab] = useState<TabKey>("redesign");
  const [userPlan, setUserPlan] = useState<UserPlan>("pro");
  const [is3DMode, setIs3DMode] = useState(false);
  const [isTurbo, setIsTurbo] = useState(false);

  const [style, setStyle] = useState(styles[0]);
  const [customPrompt, setCustomPrompt] = useState("");

  const [roomType, setRoomType] = useState(roomTypes[0]);
  const [furnitureStyle, setFurnitureStyle] = useState(furnitureStyles[0]);
  const [isAutoDeclutter, setIsAutoDeclutter] = useState(true);
  const [preserveArchitecture, setPreserveArchitecture] = useState(true);

  const [cameraMotion, setCameraMotion] = useState<CameraMotion>("Zoom In");
  const [cameraSpeed, setCameraSpeed] = useState(50);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previousPreviewRef = useRef<string | null>(null);

  const isProPlan = userPlan === "pro";

  const handleFileSelection = (file?: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    setImagePreview(URL.createObjectURL(file));
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
    if (fileInputRef.current) fileInputRef.current.value = "";
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

  const renderLockedToggle = (
    label: string,
    value: boolean,
    onToggle: () => void,
    emoji: string,
  ) => (
    <div className="rounded-xl border border-white/10 bg-zinc-900/70 p-3">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm text-zinc-200">{emoji} {label}</p>
          {isProPlan && (
            <span className="inline-flex rounded-full border border-amber-400/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
              Premium
            </span>
          )}
        </div>
        <button
          type="button"
          disabled={isProPlan}
          onClick={onToggle}
          className={`relative inline-flex h-7 w-12 items-center rounded-full border transition ${
            value
              ? "border-fuchsia-400/80 bg-fuchsia-500/70"
              : "border-white/20 bg-zinc-800"
          } ${isProPlan ? "cursor-not-allowed opacity-45" : ""}`}
        >
          <span
            className={`h-5 w-5 rounded-full bg-white transition ${value ? "translate-x-6" : "translate-x-1"}`}
          />
        </button>
      </div>
    </div>
  );

  const renderDynamicSettings = () => {
    if (activeTab === "redesign") {
      return (
        <motion.div
          key="redesign"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.2 }}
          className="space-y-5"
        >
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">Style Picker</label>
            <select
              value={style}
              onChange={(event) => setStyle(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-fuchsia-500/70 focus:ring-2 focus:ring-fuchsia-500/30"
            >
              {styles.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">Custom Prompt</label>
            <textarea
              value={customPrompt}
              onChange={(event) => setCustomPrompt(event.target.value)}
              placeholder="Describe your dream atmosphere, materials, colors, and lighting..."
              className="min-h-[120px] w-full resize-none rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-fuchsia-500/70 focus:ring-2 focus:ring-fuchsia-500/30"
            />
          </div>
        </motion.div>
      );
    }

    if (activeTab === "virtual-staging") {
      return (
        <motion.div
          key="virtual-staging"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.2 }}
          className="space-y-5"
        >
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">Style Picker</label>
            <select
              value={style}
              onChange={(event) => setStyle(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-fuchsia-500/70 focus:ring-2 focus:ring-fuchsia-500/30"
            >
              {styles.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">Room Type</label>
            <select
              value={roomType}
              onChange={(event) => setRoomType(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-fuchsia-500/70 focus:ring-2 focus:ring-fuchsia-500/30"
            >
              {roomTypes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">Furniture Type</label>
            <select
              value={furnitureStyle}
              onChange={(event) => setFurnitureStyle(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-fuchsia-500/70 focus:ring-2 focus:ring-fuchsia-500/30"
            >
              {furnitureStyles.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          {renderLockedToggle(
            "Auto-Declutter (Remove debris/clutter first)",
            isAutoDeclutter,
            () => setIsAutoDeclutter((prev) => !prev),
            "🧹",
          )}

          {renderLockedToggle(
            "Preserve Architecture (Keep exact walls/floors)",
            preserveArchitecture,
            () => setPreserveArchitecture((prev) => !prev),
            "🧱",
          )}
        </motion.div>
      );
    }

    return (
      <motion.div
        key="edit"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.2 }}
        className="space-y-5"
      >
        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">Style Picker</label>
          <select
            value={style}
            onChange={(event) => setStyle(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-fuchsia-500/70 focus:ring-2 focus:ring-fuchsia-500/30"
          >
            {styles.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-200">What would you like to edit?</label>
          <textarea
            value={customPrompt}
            onChange={(event) => setCustomPrompt(event.target.value)}
            placeholder="e.g., Remove the coffee table or Change the sofa to green leather"
            className="min-h-[130px] w-full resize-none rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-fuchsia-500/70 focus:ring-2 focus:ring-fuchsia-500/30"
          />
          <p className="text-xs text-fuchsia-200/80">Powered by Nano Banana conversational editing.</p>
        </div>
      </motion.div>
    );
  };

  return (
    <main className="h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <div className="flex h-full w-full">
        <aside className="flex w-[380px] shrink-0 flex-col border-r border-white/5 bg-zinc-950">
          <div className="border-b border-white/5 px-6 py-5">
            <h1 className="text-lg font-semibold tracking-tight">Darkor Workspace</h1>
            <p className="mt-1 text-sm text-zinc-400">Professional interior redesign controls</p>

            <div className="mt-4 inline-flex rounded-full border border-white/10 bg-zinc-900/80 p-1">
              {(["pro", "premium", "ultra"] as const).map((plan) => (
                <button
                  key={plan}
                  type="button"
                  onClick={() => setUserPlan(plan)}
                  className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wide transition ${
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

          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
            <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-1 backdrop-blur-xl">
              <div className="relative grid grid-cols-3 gap-1">
                {tabItems.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative z-10 rounded-xl px-2 py-2.5 text-xs font-semibold transition ${
                      activeTab === tab.id ? "text-white" : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
                <motion.div
                  layout
                  layoutId="activeTabPill"
                  className="absolute bottom-1 top-1 w-[calc(33.333%-0.333rem)] rounded-xl border border-fuchsia-400/30 bg-gradient-to-r from-fuchsia-500/20 to-cyan-500/20 shadow-[0_0_20px_rgba(217,70,239,0.24)]"
                  animate={{
                    x:
                      activeTab === "redesign"
                        ? "0%"
                        : activeTab === "virtual-staging"
                          ? "102%"
                          : "204%",
                  }}
                  transition={{ type: "spring", stiffness: 340, damping: 28 }}
                />
              </div>
            </div>

            <AnimatePresence mode="wait">{renderDynamicSettings()}</AnimatePresence>
          </div>

          {is3DMode && (
            <div className="border-t border-white/5 px-6 py-4">
              <div className="space-y-3 rounded-2xl border border-white/10 bg-zinc-900/70 p-4 backdrop-blur">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">3D Walkthrough Settings</p>
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">Camera Motion</label>
                  <select
                    value={cameraMotion}
                    onChange={(event) => setCameraMotion(event.target.value as CameraMotion)}
                    className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/25"
                  >
                    {cameraMotions.map((motionType) => (
                      <option key={motionType} value={motionType}>
                        {motionType}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">Speed</label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={cameraSpeed}
                    onChange={(event) => setCameraSpeed(Number(event.target.value))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-zinc-800 accent-cyan-400"
                  />
                  <div className="flex justify-between text-[10px] uppercase tracking-wide text-zinc-500">
                    <span>Slow</span>
                    <span>Fast</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="border-t border-white/5 p-5">
            <div className="mb-3 space-y-3 rounded-2xl border border-white/10 bg-zinc-900/70 p-4 backdrop-blur">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-zinc-200">3D Video Walkthrough</p>
                  <p className="text-xs text-zinc-500">Generate cinematic room flythrough</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIs3DMode((prev) => !prev)}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full border transition ${
                    is3DMode ? "border-cyan-300/70 bg-cyan-500/70" : "border-white/20 bg-zinc-800"
                  }`}
                >
                  <span
                    className={`h-5 w-5 rounded-full bg-white transition ${
                      is3DMode ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-zinc-200">Turbo &amp; Hyper Realism Mode</p>
                  <p className="text-xs text-zinc-500">Maximum quality and speed rendering</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsTurbo((prev) => !prev)}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full border transition ${
                    isTurbo ? "border-fuchsia-300/70 bg-fuchsia-500/70" : "border-white/20 bg-zinc-800"
                  }`}
                >
                  <span
                    className={`h-5 w-5 rounded-full bg-white transition ${
                      isTurbo ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            <button
              type="button"
              className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold text-white transition hover:brightness-110 ${
                isTurbo
                  ? "animate-pulse bg-gradient-to-r from-fuchsia-600 to-purple-600 shadow-[0_14px_38px_rgba(168,85,247,0.4)]"
                  : "bg-gradient-to-r from-zinc-800 to-zinc-700 shadow-[0_12px_26px_rgba(0,0,0,0.35)]"
              }`}
            >
              {is3DMode ? <ScanSearch className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
              {is3DMode ? "Generate 3D Walkthrough" : "Generate Interior Renders"}
            </button>
          </div>
        </aside>

        <section className="flex flex-1 flex-col bg-[#0a0a0a] p-7">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />

          <label
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`group relative block h-full cursor-pointer overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/70 p-6 transition ${
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
                <img
                  src={imagePreview}
                  alt="Workspace uploaded preview"
                  className="h-full w-full rounded-2xl object-cover"
                />

                <div className="pointer-events-none absolute inset-x-6 bottom-6 rounded-xl border border-white/15 bg-black/40 p-3 backdrop-blur">
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
                  <p className="mt-2 max-w-xl text-zinc-400">Upload a photo to start the magic.</p>
                </div>

                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-zinc-900/70 px-4 py-2 text-sm text-zinc-300">
                  <UploadCloud className="h-4 w-4" />
                  Drag &amp; Drop or Click to Upload
                </div>
              </div>
            )}

            <div className="pointer-events-none absolute left-8 top-8 hidden items-center gap-2 rounded-full border border-white/10 bg-zinc-900/70 px-3 py-1.5 text-xs text-zinc-300 backdrop-blur md:inline-flex">
              {activeTab === "redesign" ? <Sparkles className="h-3.5 w-3.5" /> : null}
              {activeTab === "virtual-staging" ? <Sofa className="h-3.5 w-3.5" /> : null}
              {activeTab === "edit" ? <Brush className="h-3.5 w-3.5" /> : null}
              {activeTab === "redesign"
                ? "Redesign Mode"
                : activeTab === "virtual-staging"
                  ? "Virtual Staging Mode"
                  : "Edit Mode"}
            </div>
          </label>
        </section>
      </div>
    </main>
  );
}
