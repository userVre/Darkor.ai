"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useAuth, useClerk } from "@clerk/nextjs";
import { useSignIn, useSignUp } from "@clerk/nextjs/legacy";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import StyleGallery from "@/components/sections/StyleGallery";
import CompetitorComparisonGrid from "./components/CompetitorComparisonGrid";
import Hero from "./components/Hero";
import LandingMediaSections from "./components/LandingMediaSections";
import Navbar from "./components/Navbar";
import PricingSection from "./components/PricingSection";
import StickyBottomBar from "./components/StickyBottomBar";
import VirtualStaging from "./components/VirtualStaging";

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

const faqs = [
  {
    question: "How does Darkor.ai work?",
    answer:
      "Upload a room photo, choose your style, and Darkor.ai generates premium redesigns in seconds with realistic lighting and materials.",
  },
  {
    question: "Which plan is right for me?",
    answer:
      "Pro is ideal to start quickly, Premium unlocks advanced creation workflows, and Ultra is built for teams needing speed and maximum quality.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. You can manage or cancel your subscription from your billing portal at any time.",
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
  const heroSectionRef = useRef<HTMLElement | null>(null);

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
      const hero = heroSectionRef.current;
      if (!hero) {
        setShowStickyBar(false);
        return;
      }
      const rect = hero.getBoundingClientRect();
      setShowStickyBar(rect.bottom <= 0);
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
          router.push("/dashboard/workspace");
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
          router.push("/dashboard/workspace");
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
        router.push("/dashboard/workspace");
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

  
  return (
    <div className="relative overflow-hidden bg-[#04070d] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-[-25rem] h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-cyan-500/20 blur-[160px]" />
        <div className="absolute bottom-[-18rem] right-[-12rem] h-[30rem] w-[30rem] rounded-full bg-fuchsia-500/20 blur-[140px]" />
      </div>

      <Navbar onStartFree={handleStartForFree} />

      <main id="top" className="pb-32 pt-24">
        <Hero
          sectionRef={heroSectionRef}
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

        <CompetitorComparisonGrid />

        <PricingSection />

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











