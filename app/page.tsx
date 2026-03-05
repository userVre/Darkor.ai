"use client";
/* eslint-disable @next/next/no-img-element */

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useAuth, useClerk } from "@clerk/nextjs";
import { useSignIn, useSignUp } from "@clerk/nextjs/legacy";
import { useRouter } from "next/navigation";
import LandingMediaSections from "./components/LandingMediaSections";
import AuthNavActions from "./components/AuthNavActions";
import StyleGallery from "@/components/sections/StyleGallery";

type PlanKey = "monthly" | "yearly";
type AuthMode = "idle" | "pending_verification_sign_in" | "pending_verification_sign_up";

const masonryImages = [
  "https://images.unsplash.com/photo-1493666438817-866a91353ca9?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1616593969747-4797dc75033e?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1616594039964-3f9f4a6cc7f3?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1600210492486-724fe5c67fb3?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1617104551722-3b2d51366497?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1617103996702-96ff29b1c467?auto=format&fit=crop&w=900&q=80",
];

const heroRows = [0, 1, 2, 3, 4];

const prices: Record<PlanKey, { pro: number; premium: number; ultra: number }> = {
  monthly: { pro: 29, premium: 69, ultra: 149 },
  yearly: { pro: 24, premium: 57, ultra: 124 },
};

const faqs = [
  {
    question: "How realistic are the generated designs?",
    answer:
      "Darkor.ai uses lighting-aware scene synthesis and material-aware rendering to produce portfolio-quality previews.",
  },
  {
    question: "Can I upload low-quality room photos?",
    answer:
      "Yes. We auto-enhance contrast, perspective, and exposure before generating your styled interior outputs.",
  },
  {
    question: "Do I keep commercial usage rights?",
    answer:
      "All paid plans include commercial rights, so agencies and real-estate teams can use results in listings and ads.",
  },
  {
    question: "How fast is generation?",
    answer:
      "Most rooms render in 12 to 25 seconds depending on output resolution and style complexity.",
  },
];

export default function Home() {
  const [plan, setPlan] = useState<PlanKey>("monthly");
  const [openFaq, setOpenFaq] = useState(0);
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { setActive } = useClerk();
  const { isLoaded: signInReady, signIn } = useSignIn();
  const { isLoaded: signUpReady, signUp } = useSignUp();

  const [authEmail, setAuthEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [authMode, setAuthMode] = useState<AuthMode>("idle");
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const startEmailFlow = async (emailValue?: string) => {
    const normalizedEmail = (emailValue ?? authEmail).trim().toLowerCase();

    if (!normalizedEmail) {
      setAuthError("Please enter your email address first.");
      return;
    }

    if (!signInReady || !signUpReady) {
      setAuthError("Authentication is still loading. Please try again.");
      return;
    }

    setAuthError("");
    setAuthMessage("");
    setIsAuthLoading(true);

    try {
      const signInResource = signIn as unknown as {
        create: (params: { identifier: string }) => Promise<{
          status: string;
          supportedFirstFactors?: Array<{ strategy?: string; emailAddressId?: string }>;
          createdSessionId?: string;
        }>;
        prepareFirstFactor: (params: { strategy: "email_code"; emailAddressId: string }) => Promise<void>;
      };

      const signInAttempt = await signInResource.create({ identifier: normalizedEmail });

      if (signInAttempt.status === "complete" && signInAttempt.createdSessionId) {
        await setActive?.({ session: signInAttempt.createdSessionId });
        router.push("/studio");
        return;
      }

      if (signInAttempt.status === "needs_first_factor") {
        const emailFactor = signInAttempt.supportedFirstFactors?.find(
          (factor) => factor.strategy === "email_code" && factor.emailAddressId,
        );

        if (emailFactor?.emailAddressId) {
          await signInResource.prepareFirstFactor({
            strategy: "email_code",
            emailAddressId: emailFactor.emailAddressId,
          });
          setAuthEmail(normalizedEmail);
          setAuthMode("pending_verification_sign_in");
          setAuthMessage("We sent a verification code to your email.");
          return;
        }
      }
    } catch {
      // If sign-in is not available for this email yet, continue with sign-up flow.
    }

    try {
      const signUpResource = signUp as unknown as {
        create: (params: { emailAddress: string }) => Promise<unknown>;
        prepareEmailAddressVerification: (params: { strategy: "email_code" }) => Promise<void>;
      };

      await signUpResource.create({ emailAddress: normalizedEmail });
      await signUpResource.prepareEmailAddressVerification({ strategy: "email_code" });

      setAuthEmail(normalizedEmail);
      setAuthMode("pending_verification_sign_up");
      setAuthMessage("Check your inbox for the verification code.");
    } catch {
      setAuthError("Unable to start email verification. Please try Google or try again.");
    } finally {
      setIsAuthLoading(false);
    }
  };

  const verifyCodeAndContinue = async () => {
    const code = verificationCode.trim();

    if (!code) {
      setAuthError("Please enter the verification code.");
      return;
    }

    if (!signInReady || !signUpReady) {
      setAuthError("Authentication is still loading. Please try again.");
      return;
    }

    setAuthError("");
    setIsAuthLoading(true);

    try {
      if (authMode === "pending_verification_sign_in") {
        const signInResource = signIn as unknown as {
          attemptFirstFactor: (params: { strategy: "email_code"; code: string }) => Promise<{
            status: string;
            createdSessionId?: string;
          }>;
        };

        const result = await signInResource.attemptFirstFactor({ strategy: "email_code", code });

        if (result.status === "complete" && result.createdSessionId) {
          await setActive?.({ session: result.createdSessionId });
          router.push("/studio");
          return;
        }
      }

      if (authMode === "pending_verification_sign_up") {
        const signUpResource = signUp as unknown as {
          attemptEmailAddressVerification: (params: { code: string }) => Promise<{
            status: string;
            createdSessionId?: string;
          }>;
        };

        const result = await signUpResource.attemptEmailAddressVerification({ code });

        if (result.status === "complete" && result.createdSessionId) {
          await setActive?.({ session: result.createdSessionId });
          router.push("/studio");
          return;
        }
      }

      setAuthError("Verification failed. Please check the code and try again.");
    } catch {
      setAuthError("Invalid or expired code. Please request a new one.");
    } finally {
      setIsAuthLoading(false);
    }
  };

  const continueWithGoogle = async () => {
    if (!signInReady) {
      setAuthError("Google sign-in is not ready yet. Please try again.");
      return;
    }

    const signInResource = signIn as unknown as {
      authenticateWithRedirect: (params: {
        strategy: "oauth_google";
        redirectUrl: string;
        redirectUrlComplete: string;
      }) => Promise<void>;
    };

    await signInResource.authenticateWithRedirect({
      strategy: "oauth_google",
      redirectUrl: "/sso-callback",
      redirectUrlComplete: "/studio",
    });
  };

  const triggerPrimaryCta = () => {
    if (isSignedIn) {
      router.push("/studio");
      return;
    }

    if (authMode === "pending_verification_sign_in" || authMode === "pending_verification_sign_up") {
      void verifyCodeAndContinue();
      return;
    }

    void startEmailFlow();
  };

  return (
    <div className="relative overflow-hidden bg-[#04070d] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-[-25rem] h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-cyan-500/20 blur-[160px]" />
        <div className="absolute bottom-[-18rem] right-[-12rem] h-[30rem] w-[30rem] rounded-full bg-fuchsia-500/20 blur-[140px]" />
      </div>

      <header className="fixed top-0 z-40 w-full border-b border-white/10 bg-black/30 backdrop-blur-xl">
        <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
          <a href="#top" className="text-xl font-semibold tracking-tight">
            Darkor<span className="text-cyan-300">.ai</span>
          </a>
          <div className="hidden items-center gap-7 text-sm text-zinc-300 md:flex">
            <a className="transition hover:text-white" href="#pricing">
              Pricing
            </a>
            <a className="transition hover:text-white" href="#gallery">
              Gallery
            </a>
            <a className="transition hover:text-white" href="#faq">
              FAQ
            </a>
          </div>
          <AuthNavActions />
        </nav>
      </header>

      <main id="top" className="pb-32 pt-24">
        <section className="relative min-h-screen">
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
              <p className="inline-flex rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1 text-xs tracking-[0.14em] text-cyan-200 uppercase">
                AI Interior Revolution
              </p>
              <h1 className="text-5xl leading-[1.05] font-black sm:text-7xl">
                <span className="text-cyan-300">?? Fire your</span> interior designer
              </h1>
              <p className="max-w-xl text-lg text-zinc-300">
                Upload a photo of your interior and transform it completely. Instantly redesign, furnish, reimagine
                any home interior, exterior or garden. Interior AI brings the expertise of an interior designer right
                into your pocket!
              </p>
              <ul className="space-y-2 text-zinc-200">
                <li>?? Take a photo of your current interior and let AI redesign it in seconds</li>
                <li>?? Choose an interior style from Modern, Minimalist to Contemporary</li>
                <li>? Transform your sketches and SketchUp files into photorealistic renders</li>
                <li>?? Use Virtual Staging AI to furnish empty homes for real estate</li>
                <li>?? Turn your renders into 3d flythrough videos</li>
              </ul>
            </div>

            <div className="relative w-full max-w-md">
              <div className="absolute -top-4 left-9 z-10 rotate-[5deg] rounded-full border border-emerald-200/50 bg-emerald-300 px-4 py-1.5 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/30">
                ? Get your first redesigns in less than a minute!
              </div>
              <div className="space-y-4 rounded-3xl border border-white/20 bg-black/65 p-6 shadow-2xl shadow-black/50 backdrop-blur-2xl">
                {authMode === "pending_verification_sign_in" || authMode === "pending_verification_sign_up" ? (
                  <>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      placeholder="Enter verification code"
                      className="w-full rounded-xl border border-white/20 bg-white px-4 py-3 text-lg text-black outline-none ring-cyan-300 transition focus:ring"
                    />
                    <button
                      onClick={verifyCodeAndContinue}
                      disabled={isAuthLoading}
                      className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 px-4 py-3 font-semibold text-white shadow-lg shadow-cyan-500/30 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isAuthLoading ? "Verifying..." : "Verify & Continue"}
                    </button>
                    <button
                      onClick={() => {
                        setAuthMode("idle");
                        setVerificationCode("");
                        setAuthError("");
                        setAuthMessage("");
                      }}
                      className="w-full rounded-xl border border-white/25 bg-white px-4 py-3 text-lg font-semibold text-black transition hover:bg-zinc-100"
                    >
                      Use another email
                    </button>
                  </>
                ) : (
                  <>
                    <input
                      type="email"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="Type your email..."
                      className="w-full rounded-xl border border-white/20 bg-white px-4 py-3 text-lg text-black outline-none ring-cyan-300 transition focus:ring"
                    />
                    <button
                      onClick={() => void startEmailFlow()}
                      disabled={isAuthLoading}
                      className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 px-4 py-3 font-semibold text-white shadow-lg shadow-cyan-500/30 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isAuthLoading ? "Sending code..." : "Redesign your interior now ?"}
                    </button>
                    <div className="relative py-1 text-center text-sm text-zinc-400">
                      <span className="relative z-10 bg-black/65 px-2">or</span>
                      <span className="absolute left-0 right-0 top-1/2 h-px bg-white/15" />
                    </div>
                    <button
                      onClick={() => void continueWithGoogle()}
                      className="w-full rounded-xl border border-white/25 bg-white px-4 py-3 text-lg font-semibold text-black transition hover:bg-zinc-100"
                    >
                      Continue with Google
                    </button>
                  </>
                )}
                {(authMessage || authError) && (
                  <p className={`text-sm ${authError ? "text-red-300" : "text-emerald-300"}`}>
                    {authError || authMessage}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        <LandingMediaSections />

        <StyleGallery />

        <section id="pricing" className="mx-auto mt-24 w-full max-w-7xl px-6">
          <div className="mb-8 flex flex-col items-center gap-5 text-center">
            <h2 className="text-4xl font-bold">Pricing that scales with your studio</h2>
            <div className="inline-flex rounded-full border border-white/15 bg-white/5 p-1">
              <button
                onClick={() => setPlan("monthly")}
                className={`rounded-full px-4 py-2 text-sm transition ${
                  plan === "monthly" ? "bg-cyan-300 text-[#031118]" : "text-zinc-300"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setPlan("yearly")}
                className={`rounded-full px-4 py-2 text-sm transition ${
                  plan === "yearly" ? "bg-cyan-300 text-[#031118]" : "text-zinc-300"
                }`}
              >
                Yearly (Get 2 months free)
              </button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <PriceCard
              name="Pro"
              price={prices[plan].pro}
              featured={false}
              points={["80 renders / month", "Basic staging", "HD exports"]}
              onChoose={triggerPrimaryCta}
            />
            <PriceCard
              name="Premium"
              price={prices[plan].premium}
              featured
              points={["350 renders / month", "All design styles", "Priority queue", "Commercial license"]}
              onChoose={triggerPrimaryCta}
            />
            <PriceCard
              name="Ultra"
              price={prices[plan].ultra}
              featured={false}
              points={["Unlimited renders", "API access", "4K exports", "Dedicated support"]}
              onChoose={triggerPrimaryCta}
            />
          </div>
        </section>

        <section id="faq" className="mx-auto mt-24 w-full max-w-4xl px-6">
          <h2 className="mb-8 text-center text-4xl font-bold">Frequently asked questions</h2>
          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <div key={faq.question} className="rounded-2xl border border-white/10 bg-white/5">
                <button
                  onClick={() => setOpenFaq(openFaq === index ? -1 : index)}
                  className="flex w-full items-center justify-between px-6 py-5 text-left"
                >
                  <span className="font-medium">{faq.question}</span>
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
              </div>
            ))}
          </div>
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/15 bg-black/65 p-3 backdrop-blur-2xl">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 sm:flex-row">
          <input
            type={authMode === "pending_verification_sign_in" || authMode === "pending_verification_sign_up" ? "text" : "email"}
            inputMode={authMode === "pending_verification_sign_in" || authMode === "pending_verification_sign_up" ? "numeric" : "email"}
            value={authMode === "pending_verification_sign_in" || authMode === "pending_verification_sign_up" ? verificationCode : authEmail}
            onChange={(e) =>
              authMode === "pending_verification_sign_in" || authMode === "pending_verification_sign_up"
                ? setVerificationCode(e.target.value)
                : setAuthEmail(e.target.value)
            }
            placeholder={
              authMode === "pending_verification_sign_in" || authMode === "pending_verification_sign_up"
                ? "Enter verification code"
                : "Enter your email"
            }
            className="flex-1 rounded-xl border border-white/25 bg-white/5 px-4 py-3 text-sm outline-none ring-cyan-300 focus:ring"
          />
          <button
            onClick={triggerPrimaryCta}
            disabled={isAuthLoading}
            className="rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-6 py-3 font-semibold text-[#041018] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isAuthLoading
              ? "Please wait..."
              : authMode === "pending_verification_sign_in" || authMode === "pending_verification_sign_up"
                ? "Verify & Continue"
                : "Start redesigning now"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PriceCard({
  name,
  price,
  points,
  featured,
  onChoose,
}: {
  name: string;
  price: number;
  points: string[];
  featured: boolean;
  onChoose: () => void;
}) {
  return (
    <article
      className={`relative rounded-3xl border p-7 ${
        featured
          ? "scale-[1.03] border-cyan-300/60 bg-cyan-300/10 shadow-[0_0_80px_-20px_rgba(56,189,248,0.5)]"
          : "border-white/10 bg-white/5"
      }`}
    >
      {featured && (
        <span className="absolute -top-3 left-6 rounded-full bg-cyan-300 px-3 py-1 text-xs font-semibold text-[#021018]">
          Most popular
        </span>
      )}
      <h3 className="text-2xl font-bold">{name}</h3>
      <p className="mt-3 text-4xl font-black">
        ${price}
        <span className="text-sm font-medium text-zinc-400"> / month</span>
      </p>
      <ul className="mt-5 space-y-2 text-zinc-300">
        {points.map((point) => (
          <li key={point}>- {point}</li>
        ))}
      </ul>
      <button
        onClick={onChoose}
        className={`mt-6 w-full rounded-xl px-4 py-3 font-semibold transition ${
          featured
            ? "bg-cyan-300 text-[#031118] hover:brightness-105"
            : "border border-white/20 hover:border-cyan-300 hover:text-cyan-100"
        }`}
      >
        Choose {name}
      </button>
    </article>
  );
}






















