import {useClerk, useSSO} from "@clerk/expo";
import {useSignIn, useSignUp} from "@clerk/expo/legacy";
import * as AuthSession from "expo-auth-session";
import {LinearGradient} from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import {ChevronLeft, Gem, LockKeyhole, Mail, UserRound, X} from "lucide-react-native";
import {useLocalSearchParams, useRouter} from "expo-router";
import {useEffect, useMemo, useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import {
  Keyboard,
  Modal,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
} from "react-native";
import {Button, IconButton, Text, TextInput as PaperTextInput} from "react-native-paper";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import Svg, {Path} from "react-native-svg";

import {useTheme, type Theme} from "../../styles/theme";
import {AuthInput} from "./AuthInput";
import {clearAuthSkipped, markAuthSkipped} from "./auth-skip";
import {resolveSafeRoute} from "../../lib/routes";
import {md3Shapes, md3Spacing} from "../../constants/md3Theme";

void WebBrowser.maybeCompleteAuthSession();

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
    socialBackground: theme.surfaceMuted,
    socialBorder: theme.borderLight,
    divider: theme.border,
    otpSheet: theme.surface,
    modalOverlay: theme.isDark ? "rgba(0,0,0,0.55)" : "rgba(17,24,39,0.28)",
    controlSurface: theme.surfaceMuted,
    heroTint: theme.isDark ? "rgba(255,255,255,0.07)" : "rgba(17,24,39,0.045)",
    panelShadow: theme.isDark ? "rgba(0, 0, 0, 0.36)" : "rgba(17, 24, 39, 0.10)",
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

function getClerkErrorDetails(error: unknown) {
  const clerkError = error as ClerkError;
  const firstError = clerkError?.errors?.[0];
  const code = firstError?.code?.toLowerCase() ?? "";
  const message = `${firstError?.message ?? ""} ${firstError?.longMessage ?? ""}`.toLowerCase();

  return {code, message};
}

function friendlySignInError(error: unknown, t: ReturnType<typeof useTranslation>["t"]) {
  const {code, message} = getClerkErrorDetails(error);

  if (code.includes("identifier") || message.includes("not found") || message.includes("couldn't find")) {
    return t("auth.screen.errors.signInInvalid");
  }
  if (
    code.includes("password") ||
    code.includes("credentials") ||
    message.includes("password") ||
    message.includes("incorrect")
  ) {
    return t("auth.screen.errors.signInInvalid");
  }
  return t("auth.screen.errors.signInFallback");
}

function friendlySignUpError(error: unknown, t: ReturnType<typeof useTranslation>["t"]) {
  const {code, message} = getClerkErrorDetails(error);

  if (code.includes("exists") || message.includes("already")) {
    return t("auth.screen.errors.signUpExists");
  }
  if (code.includes("password") || message.includes("password")) {
    return t("auth.screen.errors.signUpPassword");
  }
  return t("auth.screen.errors.signUpFallback");
}

function friendlyVerificationError(error: unknown, t: ReturnType<typeof useTranslation>["t"]) {
  const {code, message} = getClerkErrorDetails(error);

  if (code.includes("verification") || message.includes("code") || message.includes("invalid")) {
    return t("auth.screen.errors.verificationInvalid");
  }
  return t("auth.screen.errors.verificationFallback");
}

function isValidEmail(value: string) {
  return value.includes("@") && value.includes(".");
}

function createAuthRedirectUrl() {
  return AuthSession.makeRedirectUri({
    scheme: "homedecorai",
    path: "sso-callback",
  });
}

function authNotReadyMessage(t: ReturnType<typeof useTranslation>["t"]) {
  return t("auth.screen.errors.notReady", {
    defaultValue: t("auth.screen.otp.notReady", {
      defaultValue: "Authentication is still loading. Try again.",
    }),
  });
}

function friendlySocialError(
  error: unknown,
  t: ReturnType<typeof useTranslation>["t"],
) {
  const {code, message} = getClerkErrorDetails(error);
  if (
    code.includes("native_api_disabled") ||
    code.includes("environment") ||
    code.includes("client") ||
    message.includes("native api") ||
    message.includes("environment") ||
    message.includes("client")
  ) {
    return t("auth.screen.errors.notReady", {
      defaultValue: "Authentication is not ready. Check the Clerk mobile configuration and try again.",
    });
  }

  return t("auth.screen.errors.googleUnavailable");
}

export function AuthScreen({mode}: AuthScreenProps) {
  const theme = useTheme();
  const AUTH_COLORS = useMemo(() => getAuthColors(theme), [theme]);
  const styles = useMemo(() => createStyles(AUTH_COLORS), [AUTH_COLORS]);
  const router = useRouter();
  const params = useLocalSearchParams<{returnTo?: string | string[]}>();
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();
  const {height, width} = useWindowDimensions();
  const clerk = useClerk();
  const {signIn, setActive: setSignInActive, isLoaded: signInLoaded} = useSignIn();
  const {signUp, setActive: setSignUpActive, isLoaded: signUpLoaded} = useSignUp();
  const {startSSOFlow} = useSSO();

  const [currentMode, setCurrentMode] = useState<AuthMode>(mode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState<"email" | "google" | "otp" | "resend" | null>(null);
  const [errors, setErrors] = useState<ErrorMap>({});
  const [authServiceSlow, setAuthServiceSlow] = useState(false);
  const [otpVisible, setOtpVisible] = useState(false);
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<Array<any | null>>([]);
  const compact = height < 760;
  const sidePadding = width < 360 ? 18 : 24;
  const contentTop = Math.max(insets.top + (compact ? 32 : 48), compact ? 58 : 78);
  const contentBottom = Math.max(insets.bottom + 22, 34);
  const topButtonOffset = insets.top + 12;

  const isSignIn = currentMode === "sign-in";
  const clerkLoaded = signInLoaded && signUpLoaded;
  const activeAuthLoaded = isSignIn ? signInLoaded : signUpLoaded;
  const copy = useMemo(
    () => ({
      title: isSignIn ? t("auth.screen.signIn.title") : t("auth.screen.signUp.title"),
      subtitle: isSignIn
        ? t("auth.screen.signIn.subtitle")
        : t("auth.screen.signUp.subtitle"),
      cta: isSignIn ? t("auth.screen.signIn.cta") : t("auth.screen.signUp.cta"),
      reassurance: isSignIn
        ? t("auth.screen.signIn.reassurance")
        : t("auth.screen.signUp.reassurance"),
      togglePrefix: isSignIn ? t("auth.screen.signIn.togglePrefix") : t("auth.screen.signUp.togglePrefix"),
      toggleLink: isSignIn ? t("auth.screen.signIn.toggleLink") : t("auth.screen.signUp.toggleLink"),
    }),
    [isSignIn, t],
  );

  const emailReady = email.trim().length > 0;
  const passwordReady = password.length > 0;
  const nameReady = isSignIn || name.trim().length > 0;
  const confirmReady = isSignIn || confirmPassword.length > 0;
  const disabled = !emailReady || !passwordReady || !nameReady || !confirmReady || loading !== null;
  const postAuthRoute = useMemo(() => {
    const returnTo = Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo;
    return resolveSafeRoute(returnTo, "/(tabs)");
  }, [params.returnTo]);

  const resetFormErrors = () => setErrors({});

  useEffect(() => {
    if (activeAuthLoaded) {
      setAuthServiceSlow(false);
      return;
    }

    const timeout = setTimeout(() => {
      setAuthServiceSlow(true);
    }, 8000);

    return () => clearTimeout(timeout);
  }, [activeAuthLoaded]);

  const validateEmailAndPassword = () => {
    const nextErrors: ErrorMap = {};
    if (!isSignIn && !name.trim()) {
      nextErrors.name = t("auth.screen.validation.nameRequired");
    }
    if (!isValidEmail(email.trim())) {
      nextErrors.email = t("auth.screen.validation.invalidEmail");
    }
    if (password.length < 8) {
      nextErrors.password = t("auth.screen.validation.passwordLength");
    }
    if (!isSignIn && confirmPassword !== password) {
      nextErrors.confirmPassword = t("auth.screen.validation.passwordMismatch");
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSocialAuth = async (strategy: "oauth_google") => {
    if (!clerkLoaded || !signInLoaded || !signUpLoaded) {
      setErrors({form: authNotReadyMessage(t)});
      return;
    }

    setLoading("google");
    setErrors({});
    try {
      const result = await startSSOFlow({
        strategy,
        redirectUrl: createAuthRedirectUrl(),
        authSessionOptions: {showInRecents: true},
      });
      const createdSessionId =
        result.createdSessionId ??
        result.signIn?.createdSessionId ??
        result.signUp?.createdSessionId;

      if (createdSessionId && result.setActive) {
        await clearAuthSkipped();
        await result.setActive({session: createdSessionId});
        router.replace(postAuthRoute as never);
        return;
      }

      if (result.authSessionResult?.type !== "cancel" && result.authSessionResult?.type !== "dismiss") {
        setErrors({
          form: t("auth.screen.errors.googleUnavailable"),
        });
      }
    } catch (error) {
      setErrors({
        form: friendlySocialError(error, t),
      });
    } finally {
      setLoading(null);
    }
  };

  const handleGoogle = async () => {
    await handleSocialAuth("oauth_google");
  };

  const handleSignIn = async () => {
    if (!clerkLoaded || !signInLoaded) {
      setErrors({form: authNotReadyMessage(t)});
      return;
    }
    if (!validateEmailAndPassword()) return;
    setLoading("email");
    try {
      const result = await signIn.create({identifier: email.trim(), password});
      if (result.status === "complete") {
        await clearAuthSkipped();
        await setSignInActive({session: result.createdSessionId});
        router.replace(postAuthRoute as never);
        return;
      }
      setErrors({form: t("auth.screen.errors.additionalVerificationRequired")});
    } catch (error) {
      setErrors({form: friendlySignInError(error, t)});
    } finally {
      setLoading(null);
    }
  };

  const handleSignUp = async () => {
    if (!clerkLoaded || !signUpLoaded) {
      setErrors({form: authNotReadyMessage(t)});
      return;
    }
    if (!validateEmailAndPassword()) return;
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
      setErrors({form: friendlySignUpError(error, t)});
    } finally {
      setLoading(null);
    }
  };

  const submitOtp = async (digits = otpDigits) => {
    if (!signUpLoaded || !signUp || !setSignUpActive) {
      setErrors((current) => ({...current, otp: t("auth.screen.otp.notReady")}));
      return;
    }
    const code = digits.join("");
    if (code.length !== 6) {
      setErrors((current) => ({...current, otp: t("auth.screen.otp.incomplete")}));
      return;
    }
    setLoading("otp");
    try {
      const result = await signUp.attemptEmailAddressVerification({code});
      if (result.status === "complete" && result.createdSessionId) {
        await clearAuthSkipped();
        await setSignUpActive({session: result.createdSessionId});
        setOtpVisible(false);
        router.replace(postAuthRoute as never);
        return;
      }
      setErrors((current) => ({...current, otp: t("auth.screen.errors.verificationFallback")}));
    } catch (error) {
      setErrors((current) => ({
        ...current,
        otp: friendlyVerificationError(error, t),
      }));
    } finally {
      setLoading(null);
    }
  };

  const resendOtp = async () => {
    if (!signUpLoaded || !signUp) {
      setErrors((current) => ({...current, otp: t("auth.screen.otp.notReady")}));
      return;
    }
    setLoading("resend");
    try {
      await signUp.prepareEmailAddressVerification({strategy: "email_code"});
      setErrors((current) => ({...current, otp: undefined}));
    } catch (error) {
      setErrors((current) => ({
        ...current,
        otp: t("auth.screen.otp.resendError"),
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
      setErrors({form: t("auth.screen.errors.guestUnavailable")});
    }
  };

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={
          theme.isDark
            ? ["rgba(255,255,255,0.08)", "rgba(255,255,255,0.02)", "rgba(255,255,255,0)"]
            : ["rgba(17,24,39,0.06)", "rgba(17,24,39,0.025)", "rgba(255,255,255,0)"]
        }
        pointerEvents="none"
        style={styles.topGlow}
      />
      {router.canGoBack() ? (
        <IconButton
          accessibilityLabel={t("auth.screen.backA11y")}
          icon={({color, size}) => <ChevronLeft color={color} size={size} strokeWidth={2} />}
          mode="contained-tonal"
          onPress={() => router.back()}
          style={[styles.navButton, styles.backButton, {top: topButtonOffset}]}
        />
      ) : null}
      <IconButton
        accessibilityLabel={t("auth.screen.skipA11y")}
        icon={({color, size}) => <X color={color} size={size} strokeWidth={2} />}
        mode="contained-tonal"
        onPress={() => void handleSkip()}
        style={[styles.navButton, styles.skipButton, {top: topButtonOffset}]}
      />

      <View style={styles.keyboardAvoider}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        <View
          style={[
            styles.contentInner,
            {
              paddingHorizontal: sidePadding,
              paddingTop: contentTop,
              paddingBottom: contentBottom,
              gap: compact ? 16 : 20,
            },
          ]}
        >
        <View style={[styles.header, {gap: compact ? 8 : 10}]}>
          <View style={[styles.logoWrap, compact ? styles.logoWrapCompact : null]}>
            <View style={styles.logoGlow} />
            <View style={styles.logoPlate}>
              <Gem color={AUTH_COLORS.textPrimary} size={compact ? 28 : 32} strokeWidth={1.8} />
            </View>
          </View>
          <Text selectable style={[styles.title, compact ? styles.titleCompact : null]}>
            {copy.title}
          </Text>
          <Text selectable style={styles.subtitle}>
            {copy.subtitle}
          </Text>
        </View>

        <View style={styles.panel}>
          <View style={styles.panelBody}>
          <View style={styles.socialStack}>
            <Button
              mode="outlined"
              icon={() => <GoogleIcon />}
              onPress={() => void handleGoogle()}
              disabled={loading !== null}
              loading={loading === "google"}
              style={styles.socialButton}
              contentStyle={styles.socialButtonContent}
              labelStyle={styles.socialButtonLabel}
            >
              {t("auth.screen.googleCta")}
            </Button>
          </View>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text selectable style={styles.dividerText}>
              {t("auth.screen.divider")}
            </Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.form}>
            {!isSignIn ? (
              <AuthInput
                label={t("auth.screen.fields.fullName")}
                placeholder={t("auth.screen.fields.fullNamePlaceholder")}
                value={name}
                icon={UserRound}
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
              label={t("common.labels.email")}
              placeholder={t("auth.screen.fields.emailPlaceholder")}
              value={email}
              icon={Mail}
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
              label={t("common.labels.password")}
              placeholder={isSignIn ? t("auth.screen.fields.passwordPlaceholderSignIn") : t("auth.screen.fields.passwordPlaceholderSignUp")}
              value={password}
              icon={LockKeyhole}
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
                label={t("auth.screen.fields.confirmPassword")}
                placeholder={t("auth.screen.fields.confirmPasswordPlaceholder")}
                value={confirmPassword}
                icon={LockKeyhole}
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
            <Button
              compact
              mode="text"
              onPress={() => router.push("/(auth)/forgot-password" as never)}
              style={styles.forgotButton}
              labelStyle={styles.forgotText}
            >
              {t("auth.screen.forgotPassword")}
            </Button>
          ) : null}

          {errors.form ? (
            <Text selectable style={styles.formError}>
              {errors.form}
            </Text>
          ) : authServiceSlow ? (
            <Text selectable style={styles.formError}>
              Le service de connexion prend plus de temps que prévu. Vous pouvez patienter ou continuer sans compte avec le bouton en haut.
            </Text>
          ) : null}

          <Button
            mode="contained"
            disabled={disabled}
            onPress={() => void (isSignIn ? handleSignIn() : handleSignUp())}
            loading={loading === "email"}
            style={styles.primaryButton}
            contentStyle={styles.primaryButtonContent}
            labelStyle={styles.primaryButtonText}
          >
            {copy.cta}
          </Button>
          <Text selectable style={styles.reassurance}>
            {copy.reassurance}
          </Text>
          </View>
        </View>

        <View style={styles.toggleRow}>
          <Text selectable style={styles.toggleText}>
            {copy.togglePrefix}
          </Text>
          <Button compact mode="text" onPress={toggleMode} labelStyle={styles.toggleLink}>
            {copy.toggleLink}
          </Button>
        </View>
        </View>
        </ScrollView>
      </View>

      <Modal
        animationType="slide"
        transparent
        visible={otpVisible}
        onRequestClose={() => setOtpVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.otpSheet}>
            <View style={styles.sheetHandle} />
            <Text selectable style={styles.otpTitle}>
              {t("auth.screen.otp.title")}
            </Text>
            <Text selectable style={styles.otpSubtitle}>
              {t("auth.screen.otp.subtitle", {email: email.trim()})}
            </Text>
            <View style={styles.otpRow}>
              {otpDigits.map((digit, index) => (
                <PaperTextInput
                  key={`otp-${index}`}
                  ref={(ref: any | null) => {
                    otpRefs.current[index] = ref;
                  }}
                  value={digit}
                  onChangeText={(value) => handleOtpChange(value, index)}
                  onKeyPress={(event) => handleOtpKeyPress(event, index)}
                  contentStyle={styles.otpInputContent}
                  keyboardType="number-pad"
                  mode="outlined"
                  style={styles.otpInput}
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
            <Button
              mode="contained"
              onPress={() => void submitOtp()}
              disabled={loading === "otp"}
              style={styles.verifyButton}
              contentStyle={styles.primaryButtonContent}
              labelStyle={styles.primaryButtonText}
              loading={loading === "otp"}
            >
              {t("auth.screen.otp.verifyCta")}
            </Button>
            <Button
              compact
              mode="text"
              onPress={() => void resendOtp()}
              disabled={loading === "resend"}
              style={styles.resendButton}
              labelStyle={styles.resendText}
            >
              {loading === "resend" ? t("auth.screen.otp.sending") : t("auth.screen.otp.resend")}
            </Button>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function createStyles(AUTH_COLORS: AuthColors) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: AUTH_COLORS.background,
  },
  topGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 230,
  },
  keyboardAvoider: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    width: "100%",
  },
  contentInner: {
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
  },
  navButton: {
    position: "absolute",
    zIndex: 2,
    margin: 0,
  },
  backButton: {
    left: 18,
  },
  skipButton: {
    right: 18,
  },
  header: {
    alignItems: "center",
  },
  logoWrap: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  logoWrapCompact: {
    width: 58,
    height: 58,
  },
  logoGlow: {
    position: "absolute",
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: DARK_ACTION_SURFACE,
    shadowColor: AUTH_COLORS.accent,
    shadowRadius: 22,
    shadowOpacity: 0.22,
    shadowOffset: {width: 0, height: 0},
    elevation: 10,
  },
  logoPlate: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: AUTH_COLORS.border,
    backgroundColor: AUTH_COLORS.heroTint,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: AUTH_COLORS.textPrimary,
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 0,
    textAlign: "center",
  },
  titleCompact: {
    fontSize: 26,
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
    alignSelf: "stretch",
    position: "relative",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AUTH_COLORS.border,
    backgroundColor: AUTH_COLORS.surfaceCard,
    gap: 16,
    shadowColor: "#111827",
    shadowOpacity: 0.05,
    shadowRadius: 18,
    shadowOffset: {width: 0, height: 8},
    elevation: 2,
  },
  panelBody: {
    gap: 16,
  },
  socialStack: {
    gap: 10,
    alignSelf: "stretch",
    flexGrow: 0,
    flexShrink: 0,
  },
  socialButton: {
    alignSelf: "stretch",
    flexGrow: 0,
    flexShrink: 0,
    borderRadius: md3Shapes.extraLarge,
  },
  socialButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    flexGrow: 0,
    flexShrink: 0,
    paddingHorizontal: md3Spacing.large,
  },
  socialButtonLabel: {
    letterSpacing: 0,
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
    borderColor: AUTH_COLORS.socialBorder,
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
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    flexGrow: 0,
    flexShrink: 0,
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
    flexGrow: 0,
    flexShrink: 0,
  },
  forgotButton: {
    alignSelf: "flex-end",
  },
  forgotText: {
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
    flexGrow: 0,
    flexShrink: 0,
    borderRadius: md3Shapes.extraLarge,
  },
  verifyButton: {
    width: "100%",
    borderRadius: md3Shapes.extraLarge,
  },
  primaryButtonContent: {
    minHeight: 56,
    paddingHorizontal: md3Spacing.extraLarge,
  },
  primaryButtonText: {
    letterSpacing: 0,
    textAlign: "center",
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
    height: 56,
    backgroundColor: "transparent",
  },
  otpInputContent: {
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
    alignSelf: "center",
  },
  resendText: {
    letterSpacing: 0,
  },
  });
}
