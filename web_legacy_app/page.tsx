"use client";

import { useClerk } from "@clerk/nextjs";
import { useSignIn, useSignUp } from "@clerk/nextjs/legacy";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import StyleGallery from "@/components/sections/StyleGallery";
import CompetitorComparisonGrid from "./components/CompetitorComparisonGrid";
import FaqSection from "./components/FaqSection";
import FeaturesSection from "./components/FeaturesSection";
import Hero from "./components/Hero";
import Navbar from "./components/Navbar";
import PricingSection from "./components/PricingSection";
import StickyBottomBar from "./components/StickyBottomBar";
import Testimonials from "./components/Testimonials";
import TransformationSection from "./components/TransformationSection";
import VirtualStaging from "./components/VirtualStaging";

type AuthStep = "credentials" | "verification";

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
  const { setActive, openSignUp } = useClerk();
  const { isLoaded: signInReady, signIn } = useSignIn();
  const { isLoaded: signUpReady, signUp } = useSignUp();

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
    const hero = heroSectionRef.current;
    if (!hero) {
      setShowStickyBar(false);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowStickyBar(!entry.isIntersecting);
      },
      {
        threshold: 0.05,
      },
    );

    observer.observe(hero);

    return () => {
      observer.disconnect();
    };
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

  const handleStartForFree = async () => {
    try {
      await openSignUp?.();
    } catch {
      scrollToAuthCard();
    }
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
      redirectUrlComplete: "/dashboard/workspace",
    });
  };

  const handleStickyAction = () => {
    if (stickyEmail.trim()) {
      setAuthEmail(stickyEmail.trim().toLowerCase());
    }
    scrollToAuthCard();
  };

  return (
    <div className="relative overflow-hidden bg-zinc-950 text-zinc-100">
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

        <TransformationSection />
        <FeaturesSection />
        <StyleGallery />
        <VirtualStaging />
        <Testimonials />
        <CompetitorComparisonGrid />
        <PricingSection />
        <FaqSection onStartFree={handleStartForFree} />
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



