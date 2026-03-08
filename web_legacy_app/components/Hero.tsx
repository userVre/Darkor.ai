"use client";

import { AnimatePresence, motion } from "framer-motion";
import { RefObject, SyntheticEvent } from "react";

type AuthStep = "credentials" | "verification";

type HeroProps = {
  sectionRef: RefObject<HTMLElement | null>;
  authCardRef: RefObject<HTMLDivElement | null>;
  email: string;
  password: string;
  verificationCode: string;
  isLoginMode: boolean;
  step: AuthStep;
  isLoading: boolean;
  authError: string;
  authMessage: string;
  resendSeconds: number;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onVerificationCodeChange: (value: string) => void;
  onSubmitCredentials: () => void;
  onVerifyCode: () => void;
  onGoogle: () => void;
  onResendCode: () => void;
  onToggleMode: () => void;
};

const premiumInputClass =
  "w-full rounded-xl border border-white/20 bg-white px-4 py-3 text-lg text-black placeholder:text-zinc-500 focus:outline-none focus:ring-[3px] focus:ring-fuchsia-500/40 focus:border-fuchsia-500 transition-all";

const masonryImages = [
  "/media/empty-room.jpg",
  "/media/after-luxury.jpg",
  "/media/after-cyberpunk.jpg",
  "/media/after-boho.jpg",
  "/media/render.jpg",
  "/media/garden-after.jpg",
];

const heroRows = [0, 1, 2, 3, 4];

export default function Hero({
  sectionRef,
  authCardRef,
  email,
  password,
  verificationCode,
  isLoginMode,
  step,
  isLoading,
  authError,
  authMessage,
  resendSeconds,
  onEmailChange,
  onPasswordChange,
  onVerificationCodeChange,
  onSubmitCredentials,
  onVerifyCode,
  onGoogle,
  onResendCode,
  onToggleMode,
}: HeroProps) {
  const handleMediaFallback = (event: SyntheticEvent<HTMLImageElement>, fallback: string) => {
    const img = event.currentTarget;
    if (img.dataset.fallbackApplied === "true") {
      return;
    }
    img.dataset.fallbackApplied = "true";
    img.src = fallback;
  };

  return (
    <section ref={sectionRef} className="relative min-h-screen">
      <div className="absolute inset-0 overflow-hidden">
        <div className="hero-tilt-wall">
          {heroRows.map((row) => (
            <div
              key={row}
              className={`hero-row ${row % 2 === 0 ? "hero-row-forward" : "hero-row-reverse"}`}
              style={{ animationDuration: `${90 + row * 10}s` }}
            >
              {masonryImages.concat(masonryImages, masonryImages).map((src, index) => (
                <img
                  key={`${row}-${src}-${index}`}
                  src={src}
                  alt={`AI room ${index + 1}`}
                  onError={(event) => handleMediaFallback(event, "/media/render-after.png")}
                  className="hero-room-card"
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-[#04070d]/96 via-[#04070d]/72 to-[#04070d]/96" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-center gap-10 px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl space-y-7">
          <p className="inline-flex rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.14em] text-cyan-200">
            AI Interior Revolution
          </p>
          <h1 className="text-5xl font-black leading-[1.05] sm:text-7xl">Transform any room with Darkor.ai</h1>
          <p className="max-w-xl text-lg text-zinc-300">
            Upload one photo, keep your construction intact, and get premium redesign options instantly.
          </p>
          <ul className="space-y-2 text-zinc-200">
            <li>Take a photo of your current interior and let AI redesign it in seconds</li>
            <li>Choose an interior style from Modern, Minimalist to Contemporary</li>
            <li>Transform your sketches and SketchUp files into photorealistic renders</li>
            <li>Use Virtual Staging AI to furnish empty homes for real estate</li>
            <li>Turn your renders into 3D flythrough videos</li>
          </ul>
        </div>

        <div id="auth-flow" ref={authCardRef} className="relative w-full max-w-md scroll-mt-32">
          <div className="absolute -top-4 left-9 z-10 rotate-[5deg] rounded-full border border-emerald-200/50 bg-emerald-300 px-4 py-1.5 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/30">
            Get your first redesigns in less than a minute!
          </div>

          <div className="space-y-4 rounded-3xl border border-white/20 bg-black/65 p-6 shadow-2xl shadow-black/50 backdrop-blur-2xl">
            <AnimatePresence mode="wait">
              {step === "credentials" ? (
                <motion.div
                  key="credentials"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="space-y-4"
                >
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => onEmailChange(event.target.value)}
                    placeholder="Type your email..."
                    className={premiumInputClass}
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => onPasswordChange(event.target.value)}
                    placeholder="Type your password..."
                    className={premiumInputClass}
                  />
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={onSubmitCredentials}
                    disabled={isLoading}
                    className="w-full rounded-xl bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400 px-4 py-3 font-semibold text-white shadow-lg shadow-fuchsia-500/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isLoading
                      ? "Please wait..."
                      : isLoginMode
                        ? "Log in to your account ->"
                        : "Create your account ->"}
                  </motion.button>

                  <div className="relative py-1 text-center text-sm text-zinc-400">
                    <span className="relative z-10 bg-black/65 px-2">or</span>
                    <span className="absolute left-0 right-0 top-1/2 h-px bg-white/15" />
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={onGoogle}
                    className="w-full rounded-xl border border-white/25 bg-white px-4 py-3 text-lg font-semibold text-black transition hover:bg-zinc-100"
                  >
                    Continue with Google
                  </motion.button>
                </motion.div>
              ) : (
                <motion.div
                  key="verification"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="space-y-4"
                >
                  <label className="block text-sm text-zinc-300">Enter your 6-digit verification code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(event) => onVerificationCodeChange(event.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    className={`${premiumInputClass} text-center tracking-[0.35em]`}
                  />
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={onVerifyCode}
                    disabled={isLoading}
                    className="w-full rounded-xl bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400 px-4 py-3 font-semibold text-white shadow-lg shadow-fuchsia-500/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isLoading ? "Verifying..." : "Verify & Continue"}
                  </motion.button>

                  <button
                    onClick={onResendCode}
                    disabled={resendSeconds > 0 || isLoading}
                    className="w-full rounded-xl border border-white/20 px-4 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : "Resend Code"}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {(authMessage || authError) && (
              <p className={`text-sm ${authError ? "text-red-300" : "text-emerald-300"}`}>
                {authError || authMessage}
              </p>
            )}

            <p className="pt-1 text-center text-sm text-zinc-400">
              {isLoginMode ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={onToggleMode}
                className="font-semibold text-blue-400 transition hover:text-blue-300"
              >
                {isLoginMode ? "Sign up" : "Log in"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

