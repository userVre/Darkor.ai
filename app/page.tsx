"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useAuth, useClerk } from "@clerk/nextjs";
import { useSignIn, useSignUp } from "@clerk/nextjs/legacy";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import StyleGallery from "@/components/sections/StyleGallery";
import VirtualStaging from "./components/VirtualStaging";
import Hero from "./components/Hero";
import LandingMediaSections from "./components/LandingMediaSections";
import Navbar from "./components/Navbar";
import StickyBottomBar from "./components/StickyBottomBar";

type PlanKey = "monthly" | "yearly";
type AuthStep = "credentials" | "verification";

const sectionReveal = {
  initial: { opacity: 0, y: 50, filter: "blur(10px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: false, amount: 0.15 },
  transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const },
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 30, filter: "blur(10px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const },
  },
};

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

type ClerkErrorShape = {
  errors?: Array<{ longMessage?: string; message?: string }>;
};

function getClerkErrorMessage(error: unknown, fallback: string): string {
  const err = error as ClerkErrorShape;
  const first = err?.errors?.[0];
  return first?.longMessage || first?.message || fallback;
}

export default function Home() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { setActive } = useClerk();
  const { isLoaded: signInReady, signIn } = useSignIn();
  const { isLoaded: signUpReady, signUp } = useSignUp();

  const [plan, setPlan] = useState<PlanKey>("monthly");
  const [openFaq, setOpenFaq] = useState(0);

  const [isLoginMode, setIsLoginMode] = useState(true);
  const [authStep, setAuthStep] = useState<AuthStep>("credentials");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [pendingSignInEmailId, setPendingSignInEmailId] = useState<string | null>(null);

  const [stickyEmail, setStickyEmail] = useState("");
  const [showStickyBar, setShowStickyBar] = useState(false);
  const authCardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (authStep !== "verification" || resendSeconds <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setResendSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [authStep, resendSeconds]);

  useEffect(() => {
    const onScroll = () => {
      const authCard = authCardRef.current;
      if (!authCard) {
        setShowStickyBar(false);
        return;
      }
      const rect = authCard.getBoundingClientRect();
      setShowStickyBar(rect.bottom < 0);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const resetMessages = () => {
    setAuthError("");
    setAuthMessage("");
  };

  const startResendCountdown = () => {
    setResendSeconds(30);
  };

  const scrollToAuthCard = () => {
    authCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleStartForFree = () => {
    scrollToAuthCard();
  };

  const handleModeToggle = () => {
    setIsLoginMode((current) => !current);
    setAuthStep("credentials");
    setVerificationCode("");
    setPendingSignInEmailId(null);
    setResendSeconds(0);
    resetMessages();
  };

  const submitCredentials = async () => {
    const email = authEmail.trim().toLowerCase();
    const password = authPassword.trim();

    if (!email || !password) {
      setAuthError("Please fill in both email and password.");
      return;
    }

    if (!signInReady || !signUpReady) {
      setAuthError("Authentication is still loading. Please try again.");
      return;
    }

    resetMessages();
    setIsAuthLoading(true);

    try {
      if (isLoginMode) {
        const signInResource = signIn as unknown as {
          create: (params: { identifier: string; password: string }) => Promise<{
            status: string;
            createdSessionId?: string;
            supportedFirstFactors?: Array<{ strategy?: string; emailAddressId?: string }>;
          }>;
          prepareFirstFactor: (params: { strategy: "email_code"; emailAddressId: string }) => Promise<void>;
        };

        const attempt = await signInResource.create({ identifier: email, password });

        if (attempt.status === "complete" && attempt.createdSessionId) {
          await setActive?.({ session: attempt.createdSessionId });
          router.push("/studio");
          return;
        }

        if (attempt.status === "needs_first_factor") {
          const emailFactor = attempt.supportedFirstFactors?.find(
            (factor) => factor.strategy === "email_code" && factor.emailAddressId,
          );

          if (!emailFactor?.emailAddressId) {
            setAuthError("This account requires another verification method.");
            return;
          }

          await signInResource.prepareFirstFactor({
            strategy: "email_code",
            emailAddressId: emailFactor.emailAddressId,
          });

          setPendingSignInEmailId(emailFactor.emailAddressId);
          setAuthStep("verification");
          setVerificationCode("");
          startResendCountdown();
          setAuthMessage("Verification code sent to your email.");
          return;
        }

        setAuthError("Unable to continue with this login flow.");
        return;
      }

      const signUpResource = signUp as unknown as {
        create: (params: { emailAddress: string; password: string }) => Promise<unknown>;
        prepareEmailAddressVerification: (params: { strategy: "email_code" }) => Promise<void>;
      };

      await signUpResource.create({ emailAddress: email, password });
      await signUpResource.prepareEmailAddressVerification({ strategy: "email_code" });

      setAuthStep("verification");
      setVerificationCode("");
      startResendCountdown();
      setAuthMessage("Verification code sent to your email.");
    } catch (error) {
      setAuthError(getClerkErrorMessage(error, "Authentication failed. Please try again."));
    } finally {
      setIsAuthLoading(false);
    }
  };

  const verifyCode = async () => {
    const code = verificationCode.trim();

    if (code.length !== 6) {
      setAuthError("Please enter the 6-digit verification code.");
      return;
    }

    if (!signInReady || !signUpReady) {
      setAuthError("Authentication is still loading. Please try again.");
      return;
    }

    resetMessages();
    setIsAuthLoading(true);

    try {
      if (isLoginMode) {
        const signInResource = signIn as unknown as {
          attemptFirstFactor: (params: { strategy: "email_code"; code: string }) => Promise<{
            status: string;
            createdSessionId?: string;
          }>;
        };

        const attempt = await signInResource.attemptFirstFactor({ strategy: "email_code", code });

        if (attempt.status === "complete" && attempt.createdSessionId) {
          await setActive?.({ session: attempt.createdSessionId });
          router.push("/studio");
          return;
        }

        setAuthError("Verification failed. Please try again.");
        return;
      }

      const signUpResource = signUp as unknown as {
        attemptEmailAddressVerification: (params: { code: string }) => Promise<{
          status: string;
          createdSessionId?: string;
        }>;
      };

      const attempt = await signUpResource.attemptEmailAddressVerification({ code });

      if (attempt.status === "complete" && attempt.createdSessionId) {
        await setActive?.({ session: attempt.createdSessionId });
        router.push("/studio");
        return;
      }

      setAuthError("Verification failed. Please try again.");
    } catch (error) {
      setAuthError(getClerkErrorMessage(error, "Invalid or expired code."));
    } finally {
      setIsAuthLoading(false);
    }
  };

  const resendCode = async () => {
    if (resendSeconds > 0 || isAuthLoading) {
      return;
    }

    if (!signInReady || !signUpReady) {
      setAuthError("Authentication is still loading. Please try again.");
      return;
    }

    resetMessages();
    setIsAuthLoading(true);

    try {
      if (isLoginMode) {
        if (!pendingSignInEmailId) {
          setAuthError("Please restart the login flow.");
          return;
        }

        const signInResource = signIn as unknown as {
          prepareFirstFactor: (params: { strategy: "email_code"; emailAddressId: string }) => Promise<void>;
        };

        await signInResource.prepareFirstFactor({
          strategy: "email_code",
          emailAddressId: pendingSignInEmailId,
        });
      } else {
        const signUpResource = signUp as unknown as {
          prepareEmailAddressVerification: (params: { strategy: "email_code" }) => Promise<void>;
        };

        await signUpResource.prepareEmailAddressVerification({ strategy: "email_code" });
      }

      startResendCountdown();
      setAuthMessage("A new verification code has been sent.");
    } catch (error) {
      setAuthError(getClerkErrorMessage(error, "Unable to resend code right now."));
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

  const handleStickyAction = () => {
    if (stickyEmail.trim()) {
      setAuthEmail(stickyEmail.trim().toLowerCase());
    }
    scrollToAuthCard();
  };

  const handleChoosePlan = () => {
    if (isSignedIn) {
      router.push("/studio");
      return;
    }
    scrollToAuthCard();
  };

  return (
    <div className="relative overflow-hidden bg-[#04070d] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-[-25rem] h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-cyan-500/20 blur-[160px]" />
        <div className="absolute bottom-[-18rem] right-[-12rem] h-[30rem] w-[30rem] rounded-full bg-fuchsia-500/20 blur-[140px]" />
      </div>

      <Navbar onStartFree={handleStartForFree} />

      <main id="top" className="pb-32 pt-24">
        <Hero
          authCardRef={authCardRef}
          email={authEmail}
          password={authPassword}
          verificationCode={verificationCode}
          isLoginMode={isLoginMode}
          step={authStep}
          isLoading={isAuthLoading}
          authError={authError}
          authMessage={authMessage}
          resendSeconds={resendSeconds}
          onEmailChange={setAuthEmail}
          onPasswordChange={setAuthPassword}
          onVerificationCodeChange={setVerificationCode}
          onSubmitCredentials={() => void submitCredentials()}
          onVerifyCode={() => void verifyCode()}
          onGoogle={() => void continueWithGoogle()}
          onResendCode={() => void resendCode()}
          onToggleMode={handleModeToggle}
        />

        <LandingMediaSections />

        <StyleGallery />

        <VirtualStaging />

        <motion.section id="pricing" className="mx-auto mt-24 w-full max-w-7xl px-6" {...sectionReveal}>
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

          <motion.div
            className="grid gap-6 lg:grid-cols-3"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.15 }}
          >
            <PriceCard
              name="Pro"
              price={prices[plan].pro}
              featured={false}
              points={["80 renders / month", "Basic staging", "HD exports"]}
              onChoose={handleChoosePlan}
            />
            <PriceCard
              name="Premium"
              price={prices[plan].premium}
              featured
              points={["350 renders / month", "All design styles", "Priority queue", "Commercial license"]}
              onChoose={handleChoosePlan}
            />
            <PriceCard
              name="Ultra"
              price={prices[plan].ultra}
              featured={false}
              points={["Unlimited renders", "API access", "4K exports", "Dedicated support"]}
              onChoose={handleChoosePlan}
            />
          </motion.div>
        </motion.section>

        <motion.section id="faq" className="mx-auto mt-24 w-full max-w-4xl px-6" {...sectionReveal}>
          <h2 className="mb-8 text-center text-4xl font-bold">Frequently asked questions</h2>
          <motion.div
            className="space-y-3"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.15 }}
          >
            {faqs.map((faq, index) => (
              <motion.div
                key={faq.question}
                variants={staggerItem}
                className="rounded-2xl border border-white/10 bg-white/5"
              >
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
              </motion.div>
            ))}
          </motion.div>
        </motion.section>
      </main>

      <StickyBottomBar
        visible={showStickyBar}
        email={stickyEmail}
        onEmailChange={setStickyEmail}
        onAction={handleStickyAction}
      />
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
    <motion.article
      variants={staggerItem}
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
    </motion.article>
  );
}

