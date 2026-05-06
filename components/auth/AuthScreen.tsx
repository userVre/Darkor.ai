import {useOAuth} from "@clerk/expo";
import {useSignIn, useSignUp} from "@clerk/expo/legacy";
import {ChevronLeft, Gem, X} from "lucide-react-native";
import {useRouter} from "expo-router";
import {useMemo, useRef, useState} from "react";
import {
  ActivityIndicator,
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
} from "react-native";
import Svg, {Path} from "react-native-svg";

import {useTheme, type Theme} from "../../styles/theme";
import {AuthInput} from "./AuthInput";
import {clearAuthSkipped, markAuthSkipped} from "./auth-skip";

const DARK_ACTION = "#111111";
const DARK_ACTION_SURFACE = "rgba(17,24,39,0.10)";

type AuthMode = "sign-in" | "sign-up";
type ErrorMap = Partial<Record<"name" | "email" | "password" | "confirmPassword" | "form" | "otp", string>>;
type ClerkError = {
  errors?: Array<{code?: string; message?: string; longMessage?: string}>;
};

type AuthScreenProps = {
  mode: AuthMode;
};

function getAuthColors(theme: Theme) {
  return {
    background: theme.bg,
    surfaceCard: theme.surfaceCard,
    border: theme.border,
    textPrimary: theme.textPrimary,
    textSecondary: theme.textSecondary,
    accent: DARK_ACTION,
    accentText: "#FFFFFF",
    googleText: "#1A1A1A",
    appleBackground: theme.surfaceMuted,
    appleBorder: theme.borderLight,
    divider: theme.border,
    otpSheet: theme.surface,
    modalOverlay: theme.isDark ? "rgba(0,0,0,0.55)" : "rgba(17,24,39,0.28)",
    controlSurface: theme.surfaceMuted,
  };
}

type AuthColors = ReturnType<typeof getAuthColors>;

function GoogleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 48 48">
      <Path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <Path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <Path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <Path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
      <Path fill="none" d="M0 0h48v48H0z" />
    </Svg>
  );
}

function AppleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path
        fill="#FFFFFF"
        d="M17.05 12.54c-.03-3.03 2.47-4.49 2.58-4.56-1.42-2.07-3.62-2.35-4.39-2.38-1.85-.19-3.65 1.11-4.58 1.11-.95 0-2.38-1.09-3.93-1.06-1.99.03-3.86 1.18-4.88 3-2.11 3.65-.54 9.02 1.49 11.97 1.01 1.45 2.19 3.06 3.74 3 1.51-.06 2.07-.96 3.89-.96 1.8 0 2.33.96 3.91.93 1.63-.03 2.65-1.45 3.62-2.91 1.17-1.66 1.64-3.3 1.66-3.39-.04-.01-3.08-1.17-3.11-4.75zM14.03 3.64c.81-.99 1.37-2.33 1.21-3.68-1.17.05-2.63.81-3.47 1.78-.74.85-1.4 2.25-1.22 3.55 1.32.1 2.64-.66 3.48-1.65z"
      />
    </Svg>
  );
}

function getClerkErrorDetails(error: unknown) {
  const clerkError = error as ClerkError;
  const firstError = clerkError?.errors?.[0];
  const code = firstError?.code?.toLowerCase() ?? "";
  const message = `${firstError?.message ?? ""} ${firstError?.longMessage ?? ""}`.toLowerCase();

  return {code, message};
}

function friendlySignInError(error: unknown) {
  const {code, message} = getClerkErrorDetails(error);

  if (code.includes("identifier") || message.includes("not found") || message.includes("couldn't find")) {
    return "Adresse e-mail ou mot de passe incorrect. Réessayez.";
  }
  if (
    code.includes("password") ||
    code.includes("credentials") ||
    message.includes("password") ||
    message.includes("incorrect")
  ) {
    return "Adresse e-mail ou mot de passe incorrect. Réessayez.";
  }
  return "Connexion impossible. Vérifiez vos informations et réessayez.";
}

function friendlySignUpError(error: unknown) {
  const {code, message} = getClerkErrorDetails(error);

  if (code.includes("exists") || message.includes("already")) {
    return "Un compte existe déjà avec cette adresse e-mail. Connectez-vous plutôt.";
  }
  if (code.includes("password") || message.includes("password")) {
    return "Ce mot de passe ne peut pas être utilisé. Essayez-en un autre.";
  }
  return "Impossible de créer votre compte. Réessayez.";
}

function friendlyVerificationError(error: unknown) {
  const {code, message} = getClerkErrorDetails(error);

  if (code.includes("verification") || message.includes("code") || message.includes("invalid")) {
    return "Ce code n'est pas valide. Réessayez.";
  }
  return "Vérification impossible. Réessayez.";
}

function isValidEmail(value: string) {
  return value.includes("@") && value.includes(".");
}

export function AuthScreen({mode}: AuthScreenProps) {
  const theme = useTheme();
  const AUTH_COLORS = useMemo(() => getAuthColors(theme), [theme]);
  const styles = useMemo(() => createStyles(AUTH_COLORS), [AUTH_COLORS]);
  const router = useRouter();
  const {signIn, setActive: setSignInActive, isLoaded: signInLoaded} = useSignIn();
  const {signUp, setActive: setSignUpActive, isLoaded: signUpLoaded} = useSignUp();
  const {startOAuthFlow: googleOAuth} = useOAuth({strategy: "oauth_google"});
  const {startOAuthFlow: appleOAuth} = useOAuth({strategy: "oauth_apple"});

  const [currentMode, setCurrentMode] = useState<AuthMode>(mode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState<"email" | "google" | "apple" | "otp" | "resend" | null>(null);
  const [errors, setErrors] = useState<ErrorMap>({});
  const [otpVisible, setOtpVisible] = useState(false);
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<Array<TextInput | null>>([]);

  const isSignIn = currentMode === "sign-in";
  const copy = useMemo(
    () => ({
      title: isSignIn ? "Welcome back." : "Start designing.",
      subtitle: isSignIn
        ? "Sign in to access your designs, credits, and project history."
        : "Create your account and get your first free AI render today.",
      cta: isSignIn ? "Sign In" : "Create Account",
      reassurance: isSignIn
        ? "Your data is encrypted and never shared."
        : "Free to start - no credit card required.",
      togglePrefix: isSignIn ? "Don't have an account? " : "Already have an account? ",
      toggleLink: isSignIn ? "Sign up" : "Sign in",
    }),
    [isSignIn],
  );

  const emailReady = email.trim().length > 0;
  const passwordReady = password.length > 0;
  const nameReady = isSignIn || name.trim().length > 0;
  const confirmReady = isSignIn || confirmPassword.length > 0;
  const disabled = !emailReady || !passwordReady || !nameReady || !confirmReady || loading !== null;

  const resetFormErrors = () => setErrors({});

  const validateEmailAndPassword = () => {
    const nextErrors: ErrorMap = {};
    if (!isSignIn && !name.trim()) {
      nextErrors.name = "Entrez votre nom complet.";
    }
    if (!isValidEmail(email.trim())) {
      nextErrors.email = "Entrez une adresse e-mail valide.";
    }
    if (password.length < 8) {
      nextErrors.password = "Le mot de passe doit contenir au moins 8 caractères.";
    }
    if (!isSignIn && confirmPassword !== password) {
      nextErrors.confirmPassword = "Les mots de passe ne correspondent pas.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleGoogle = async () => {
    setLoading("google");
    setErrors({});
    try {
      const {createdSessionId, setActive} = await googleOAuth();
      if (createdSessionId) {
        await clearAuthSkipped();
        await setActive!({session: createdSessionId});
        router.replace("/(tabs)" as never);
      }
    } catch (error) {
      setErrors({form: "Connexion Google impossible. Réessayez."});
    } finally {
      setLoading(null);
    }
  };

  const handleApple = async () => {
    setLoading("apple");
    setErrors({});
    try {
      const {createdSessionId, setActive} = await appleOAuth();
      if (createdSessionId) {
        await clearAuthSkipped();
        await setActive!({session: createdSessionId});
        router.replace("/(tabs)" as never);
      }
    } catch (error) {
      setErrors({form: "Connexion Apple impossible. Réessayez."});
    } finally {
      setLoading(null);
    }
  };

  const handleSignIn = async () => {
    if (!signInLoaded || !validateEmailAndPassword()) return;
    setLoading("email");
    try {
      const result = await signIn.create({identifier: email.trim(), password});
      if (result.status === "complete") {
        await clearAuthSkipped();
        await setSignInActive({session: result.createdSessionId});
        router.replace("/(tabs)" as never);
        return;
      }
      setErrors({form: "Une étape de vérification supplémentaire est nécessaire."});
    } catch (error) {
      setErrors({form: friendlySignInError(error)});
    } finally {
      setLoading(null);
    }
  };

  const handleSignUp = async () => {
    if (!signUpLoaded || !validateEmailAndPassword()) return;
    const parts = name.trim().split(/\s+/);
    setLoading("email");
    try {
      await signUp.create({
        emailAddress: email.trim(),
        password,
        firstName: parts[0],
        lastName: parts[1] ?? "",
      });
      await signUp.prepareEmailAddressVerification({strategy: "email_code"});
      setOtpDigits(["", "", "", "", "", ""]);
      setErrors({});
      setOtpVisible(true);
      requestAnimationFrame(() => otpRefs.current[0]?.focus());
    } catch (error) {
      setErrors({form: friendlySignUpError(error)});
    } finally {
      setLoading(null);
    }
  };

  const submitOtp = async (digits = otpDigits) => {
    if (!signUpLoaded || !signUp || !setSignUpActive) {
      setErrors((current) => ({...current, otp: "La vérification n'est pas encore prête. Réessayez."}));
      return;
    }
    const code = digits.join("");
    if (code.length !== 6) {
      setErrors((current) => ({...current, otp: "Entrez le code à 6 chiffres reçu par e-mail."}));
      return;
    }
    setLoading("otp");
    try {
      const result = await signUp.attemptEmailAddressVerification({code});
      if (result.status === "complete" && result.createdSessionId) {
        await clearAuthSkipped();
        await setSignUpActive({session: result.createdSessionId});
        setOtpVisible(false);
        router.replace("/(tabs)" as never);
        return;
      }
      setErrors((current) => ({...current, otp: "Impossible de vérifier ce code. Réessayez."}));
    } catch (error) {
      setErrors((current) => ({
        ...current,
        otp: friendlyVerificationError(error),
      }));
    } finally {
      setLoading(null);
    }
  };

  const resendOtp = async () => {
    if (!signUpLoaded || !signUp) {
      setErrors((current) => ({...current, otp: "La vérification n'est pas encore prête. Réessayez."}));
      return;
    }
    setLoading("resend");
    try {
      await signUp.prepareEmailAddressVerification({strategy: "email_code"});
      setErrors((current) => ({...current, otp: undefined}));
    } catch (error) {
      setErrors((current) => ({
        ...current,
        otp: "Impossible de renvoyer le code. Réessayez.",
      }));
    } finally {
      setLoading(null);
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    const cleanValue = value.replace(/\D/g, "");
    const nextDigits = [...otpDigits];

    if (cleanValue.length > 1) {
      const pastedDigits = cleanValue.slice(0, 6).split("");
      for (let i = 0; i < 6; i += 1) {
        nextDigits[i] = pastedDigits[i] ?? "";
      }
      setOtpDigits(nextDigits);
      setErrors((current) => ({...current, otp: undefined}));
      const nextIndex = Math.min(pastedDigits.length, 5);
      otpRefs.current[nextIndex]?.focus();
      if (pastedDigits.length === 6) {
        void submitOtp(nextDigits);
      }
      return;
    }

    nextDigits[index] = cleanValue;
    setOtpDigits(nextDigits);
    setErrors((current) => ({...current, otp: undefined}));
    if (cleanValue && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
    if (nextDigits.every(Boolean)) {
      void submitOtp(nextDigits);
    }
  };

  const handleOtpKeyPress = (
    event: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number,
  ) => {
    if (event.nativeEvent.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const toggleMode = () => {
    Keyboard.dismiss();
    setCurrentMode((current) => (current === "sign-in" ? "sign-up" : "sign-in"));
    setErrors({});
    setLoading(null);
  };

  const handleSkip = async () => {
    Keyboard.dismiss();
    setLoading(null);
    setErrors({});
    try {
      await markAuthSkipped();
      router.replace("/(tabs)" as never);
    } catch (error) {
      setErrors({form: "Impossible de continuer en invité. Réessayez."});
    }
  };

  return (
    <Pressable onPress={Keyboard.dismiss} style={styles.screen}>
      {router.canGoBack() ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ChevronLeft color={AUTH_COLORS.textPrimary} size={20} strokeWidth={2} />
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Skip sign in"
        onPress={() => void handleSkip()}
        style={styles.skipButton}
      >
        <X color={AUTH_COLORS.textPrimary} size={18} strokeWidth={2} />
      </Pressable>

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.logoWrap}>
            <View style={styles.logoGlow} />
            <Gem color={AUTH_COLORS.textPrimary} size={34} strokeWidth={1.8} />
          </View>
          <Text selectable style={styles.title}>
            {copy.title}
          </Text>
          <Text selectable style={styles.subtitle}>
            {copy.subtitle}
          </Text>
        </View>

        <View style={styles.panel}>
          <View style={styles.socialStack}>
            <Pressable
              accessibilityRole="button"
              onPress={() => void handleGoogle()}
              disabled={loading !== null}
              style={({pressed}) => [styles.socialButton, styles.googleButton, pressed ? styles.pressed : null]}
            >
              {loading === "google" ? (
                <ActivityIndicator color={AUTH_COLORS.googleText} />
              ) : (
                <View style={styles.socialButtonContent}>
                  <View style={styles.socialIconSlot}>
                    <GoogleIcon />
                  </View>
                  <Text style={styles.googleText}>Continuer avec Google</Text>
                </View>
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => void handleApple()}
              disabled={loading !== null}
              style={({pressed}) => [styles.socialButton, styles.appleButton, pressed ? styles.pressed : null]}
            >
              {loading === "apple" ? (
                <ActivityIndicator color={AUTH_COLORS.accentText} />
              ) : (
                <View style={styles.socialButtonContent}>
                  <View style={styles.socialIconSlot}>
                    <AppleIcon />
                  </View>
                  <Text style={styles.appleText}>Continuer avec Apple</Text>
                </View>
              )}
            </Pressable>
          </View>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text selectable style={styles.dividerText}>
              or
            </Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.form}>
            {!isSignIn ? (
              <AuthInput
                label="Full name"
                placeholder="Jane Designer"
                value={name}
                onChangeText={(value) => {
                  setName(value);
                  resetFormErrors();
                }}
                autoComplete="name"
                textContentType="name"
                autoCapitalize="words"
                error={errors.name}
              />
            ) : null}
            <AuthInput
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                resetFormErrors();
              }}
              autoComplete="email"
              textContentType="emailAddress"
              keyboardType="email-address"
              error={errors.email}
            />
            <AuthInput
              label="Password"
              placeholder={isSignIn ? "Enter your password" : "Create a password"}
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                resetFormErrors();
              }}
              secureTextEntry
              autoComplete={isSignIn ? "current-password" : "new-password"}
              textContentType={isSignIn ? "password" : "newPassword"}
              error={errors.password}
            />
            {!isSignIn ? (
              <AuthInput
                label="Confirm password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChangeText={(value) => {
                  setConfirmPassword(value);
                  resetFormErrors();
                }}
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
                error={errors.confirmPassword}
              />
            ) : null}
          </View>

          {isSignIn ? (
            <Pressable
              accessibilityRole="link"
              onPress={() => router.push("/(auth)/forgot-password" as never)}
              style={styles.forgotButton}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </Pressable>
          ) : null}

          {errors.form ? (
            <Text selectable style={styles.formError}>
              {errors.form}
            </Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            disabled={disabled}
            onPress={() => void (isSignIn ? handleSignIn() : handleSignUp())}
            style={({pressed}) => [
              styles.primaryButton,
              disabled ? styles.disabled : null,
              pressed ? styles.pressed : null,
            ]}
          >
            {loading === "email" ? (
              <ActivityIndicator color={AUTH_COLORS.textPrimary} />
            ) : (
              <Text style={styles.primaryButtonText}>{copy.cta}</Text>
            )}
          </Pressable>
          <Text selectable style={styles.reassurance}>
            {copy.reassurance}
          </Text>
        </View>

        <View style={styles.toggleRow}>
          <Text selectable style={styles.toggleText}>
            {copy.togglePrefix}
          </Text>
          <Pressable accessibilityRole="button" onPress={toggleMode}>
            <Text style={styles.toggleLink}>{copy.toggleLink}</Text>
          </Pressable>
        </View>
      </View>

      <Modal
        animationType="slide"
        transparent
        visible={otpVisible}
        onRequestClose={() => setOtpVisible(false)}
      >
        <Pressable onPress={Keyboard.dismiss} style={styles.modalOverlay}>
          <View style={styles.otpSheet}>
            <View style={styles.sheetHandle} />
            <Text selectable style={styles.otpTitle}>
              Check your email
            </Text>
            <Text selectable style={styles.otpSubtitle}>
              We sent a 6-digit code to {email.trim()}
            </Text>
            <View style={styles.otpRow}>
              {otpDigits.map((digit, index) => (
                <TextInput
                  key={`otp-${index}`}
                  ref={(ref) => {
                    otpRefs.current[index] = ref;
                  }}
                  value={digit}
                  onChangeText={(value) => handleOtpChange(value, index)}
                  onKeyPress={(event) => handleOtpKeyPress(event, index)}
                  style={styles.otpInput}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  maxLength={index === 0 ? 6 : 1}
                  selectionColor={AUTH_COLORS.accent}
                  returnKeyType="done"
                />
              ))}
            </View>
            {errors.otp ? (
              <Text selectable style={styles.otpError}>
                {errors.otp}
              </Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={() => void submitOtp()}
              disabled={loading === "otp"}
              style={({pressed}) => [styles.verifyButton, pressed ? styles.pressed : null]}
            >
              {loading === "otp" ? (
                <ActivityIndicator color={AUTH_COLORS.accentText} />
              ) : (
                <Text style={styles.primaryButtonText}>Verify Email</Text>
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => void resendOtp()}
              disabled={loading === "resend"}
              style={styles.resendButton}
            >
              <Text style={styles.resendText}>
                {loading === "resend" ? "Sending..." : "Resend code"}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </Pressable>
  );
}

function createStyles(AUTH_COLORS: AuthColors) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: AUTH_COLORS.background,
  },
  content: {
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 28,
    gap: 24,
  },
  backButton: {
    position: "absolute",
    top: 14,
    left: 18,
    zIndex: 2,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: AUTH_COLORS.controlSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  skipButton: {
    position: "absolute",
    top: 14,
    right: 18,
    zIndex: 2,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: AUTH_COLORS.controlSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    gap: 10,
    paddingTop: 24,
  },
  logoWrap: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  logoGlow: {
    position: "absolute",
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: DARK_ACTION_SURFACE,
    shadowColor: AUTH_COLORS.accent,
    shadowRadius: 20,
    shadowOpacity: 0.4,
    shadowOffset: {width: 0, height: 0},
    elevation: 10,
  },
  title: {
    color: AUTH_COLORS.accentText,
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  subtitle: {
    maxWidth: 340,
    color: AUTH_COLORS.textSecondary,
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 20,
    letterSpacing: 0,
    textAlign: "center",
  },
  panel: {
    width: "100%",
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: AUTH_COLORS.border,
    backgroundColor: AUTH_COLORS.surfaceCard,
    gap: 18,
  },
  socialStack: {
    gap: 10,
    alignItems: "center",
  },
  socialButton: {
    width: "100%",
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    overflow: "hidden",
  },
  socialButtonContent: {
    width: "100%",
    height: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  socialIconSlot: {
    width: 24,
    height: 24,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  googleButton: {
    backgroundColor: "#FFFFFF",
    borderColor: "#FFFFFF",
  },
  appleButton: {
    backgroundColor: AUTH_COLORS.appleBackground,
    borderColor: AUTH_COLORS.appleBorder,
  },
  googleText: {
    color: AUTH_COLORS.googleText,
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0,
    flexShrink: 1,
    textAlign: "center",
    includeFontPadding: false,
  },
  appleText: {
    color: AUTH_COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0,
    flexShrink: 1,
    textAlign: "center",
    includeFontPadding: false,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: AUTH_COLORS.divider,
  },
  dividerText: {
    paddingHorizontal: 12,
    color: AUTH_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "400",
    letterSpacing: 0,
  },
  form: {
    gap: 14,
  },
  forgotButton: {
    alignSelf: "flex-end",
    paddingVertical: 2,
  },
  forgotText: {
    color: AUTH_COLORS.accent,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0,
  },
  formError: {
    color: AUTH_COLORS.accent,
    fontSize: 12,
    lineHeight: 17,
    letterSpacing: 0,
    textAlign: "center",
  },
  primaryButton: {
    width: "100%",
    height: 52,
    borderRadius: 14,
    backgroundColor: AUTH_COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  verifyButton: {
    width: "100%",
    height: 52,
    borderRadius: 14,
    backgroundColor: AUTH_COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: AUTH_COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0,
    textAlign: "center",
    includeFontPadding: false,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.82,
  },
  reassurance: {
    marginTop: -6,
    color: AUTH_COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
    letterSpacing: 0,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
    paddingBottom: 6,
  },
  toggleText: {
    color: AUTH_COLORS.textSecondary,
    fontSize: 13,
    letterSpacing: 0,
  },
  toggleLink: {
    color: AUTH_COLORS.accent,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: AUTH_COLORS.modalOverlay,
  },
  otpSheet: {
    width: "100%",
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 34,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: AUTH_COLORS.border,
    backgroundColor: AUTH_COLORS.otpSheet,
    alignItems: "center",
    gap: 16,
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: AUTH_COLORS.border,
    marginBottom: 6,
  },
  otpTitle: {
    color: AUTH_COLORS.textPrimary,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 0,
    textAlign: "center",
  },
  otpSubtitle: {
    maxWidth: 320,
    color: AUTH_COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0,
    textAlign: "center",
  },
  otpRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  otpInput: {
    width: 40,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AUTH_COLORS.border,
    backgroundColor: AUTH_COLORS.controlSurface,
    color: AUTH_COLORS.textPrimary,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0,
  },
  otpError: {
    color: AUTH_COLORS.accent,
    fontSize: 12,
    lineHeight: 17,
    letterSpacing: 0,
    textAlign: "center",
  },
  resendButton: {
    paddingVertical: 2,
  },
  resendText: {
    color: AUTH_COLORS.accent,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0,
  },
  });
}
