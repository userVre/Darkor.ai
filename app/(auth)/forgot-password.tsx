import {useSignIn} from "@clerk/expo/legacy";
import {useRouter} from "expo-router";
import {ChevronLeft} from "lucide-react-native";
import {useRef, useState} from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
} from "react-native";
import {Button, IconButton, Text, TextInput as PaperTextInput, useTheme as usePaperTheme} from "react-native-paper";

import {AuthInput} from "@/components/auth/AuthInput";
import {clearAuthSkipped} from "@/components/auth/auth-skip";
import {md3Shapes, md3Spacing} from "@/constants/md3Theme";

const AUTH_COLORS = {
  background: "#0A0A0F",
  surfaceCard: "rgba(255,255,255,0.06)",
  border: "rgba(255,255,255,0.12)",
  textPrimary: "#FFFFFF",
  textSecondary: "rgba(255,255,255,0.60)",
  accent: "#111111",
};

type ResetStep = "email" | "code" | "password";
type LoadingState = "email" | "code" | "resend" | "password" | null;

function isValidEmail(value: string) {
  return value.includes("@") && value.includes(".");
}

type ClerkError = {
  errors?: Array<{code?: string; message?: string; longMessage?: string}>;
};

function getClerkErrorDetails(error: unknown) {
  const clerkError = error as ClerkError;
  const firstError = clerkError?.errors?.[0];
  const code = firstError?.code?.toLowerCase() ?? "";
  const message = `${firstError?.message ?? ""} ${firstError?.longMessage ?? ""}`.toLowerCase();

  return {code, message};
}

function friendlySendError(error: unknown) {
  const {code, message} = getClerkErrorDetails(error);

  if (code.includes("identifier") || message.includes("not found") || message.includes("couldn't find")) {
    return "Aucun compte n'est associ\u00e9 \u00e0 cette adresse e-mail.";
  }
  return "Impossible d'envoyer le code. V\u00e9rifiez l'adresse et r\u00e9essayez.";
}

function friendlyCodeError(error: unknown) {
  const {code, message} = getClerkErrorDetails(error);

  if (code.includes("verification") || message.includes("code") || message.includes("invalid")) {
    return "Ce code n'est pas valide. R\u00e9essayez.";
  }
  if (message.includes("expired")) {
    return "Ce code a expir\u00e9. Renvoyez un nouveau code.";
  }
  return "Impossible de v\u00e9rifier le code. R\u00e9essayez.";
}

function friendlyPasswordError(error: unknown) {
  const {code, message} = getClerkErrorDetails(error);

  if (code.includes("password") || message.includes("password")) {
    return "Ce mot de passe ne peut pas \u00eatre utilis\u00e9. Essayez-en un autre.";
  }
  return "Impossible de r\u00e9initialiser le mot de passe. R\u00e9essayez.";
}

export default function ForgotPasswordRoute() {
  const router = useRouter();
  const {signIn, setActive, isLoaded} = useSignIn();
  const [step, setStep] = useState<ResetStep>("email");
  const [email, setEmail] = useState("");
  const [codeDigits, setCodeDigits] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState<LoadingState>(null);
  const [error, setError] = useState("");
  const codeRefs = useRef<Array<any | null>>([]);
  const paperTheme = usePaperTheme();

  const trimmedEmail = email.trim();
  const code = codeDigits.join("");
  const emailReady = isValidEmail(trimmedEmail);
  const codeReady = code.length === 6;
  const passwordReady = newPassword.length > 0 && confirmPassword.length > 0;

  const focusFirstCodeInput = () => {
    requestAnimationFrame(() => codeRefs.current[0]?.focus());
  };

  const sendResetCode = async () => {
    Keyboard.dismiss();
    setError("");
    if (!emailReady) {
      setError("Entrez une adresse e-mail valide.");
      return;
    }
    if (!isLoaded) return;

    setLoading("email");
    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: trimmedEmail,
      });
      setCodeDigits(["", "", "", "", "", ""]);
      setStep("code");
      focusFirstCodeInput();
    } catch (resetError) {
      setError(friendlySendError(resetError));
    } finally {
      setLoading(null);
    }
  };

  const resendResetCode = async () => {
    setError("");
    if (!isLoaded) {
      setError("La r\u00e9initialisation n'est pas encore pr\u00eate. R\u00e9essayez.");
      return;
    }

    setLoading("resend");
    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: trimmedEmail,
      });
      setCodeDigits(["", "", "", "", "", ""]);
      focusFirstCodeInput();
    } catch (resetError) {
      setError(friendlySendError(resetError));
    } finally {
      setLoading(null);
    }
  };

  const verifyCode = async (digits = codeDigits) => {
    const submittedCode = digits.join("");
    if (!isLoaded) {
      setError("La v\u00e9rification n'est pas encore pr\u00eate. R\u00e9essayez.");
      return;
    }
    if (submittedCode.length !== 6) {
      setError("Entrez le code \u00e0 6 chiffres re\u00e7u par e-mail.");
      return;
    }

    Keyboard.dismiss();
    setError("");
    setLoading("code");
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: submittedCode,
      });
      if (result.status === "needs_new_password") {
        setStep("password");
        setNewPassword("");
        setConfirmPassword("");
        return;
      }
      if (result.status === "complete" && result.createdSessionId) {
        await clearAuthSkipped();
        await setActive({session: result.createdSessionId});
        router.replace("/(tabs)" as never);
        return;
      }
      setError("Code v\u00e9rifi\u00e9, mais une \u00e9tape suppl\u00e9mentaire est n\u00e9cessaire.");
    } catch (resetError) {
      setError(friendlyCodeError(resetError));
    } finally {
      setLoading(null);
    }
  };

  const resetPassword = async () => {
    Keyboard.dismiss();
    setError("");
    if (!isLoaded) {
      setError("La r\u00e9initialisation n'est pas encore pr\u00eate. R\u00e9essayez.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caract\u00e8res.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading("password");
    try {
      const result = await signIn.resetPassword({password: newPassword});
      if (result.status === "complete" && result.createdSessionId) {
        await clearAuthSkipped();
        await setActive({session: result.createdSessionId});
        router.replace("/(tabs)" as never);
        return;
      }
      setError("Impossible d'ouvrir la session apr\u00e8s la r\u00e9initialisation. Connectez-vous avec votre nouveau mot de passe.");
    } catch (resetError) {
      setError(friendlyPasswordError(resetError));
    } finally {
      setLoading(null);
    }
  };

  const handleCodeChange = (value: string, index: number) => {
    const cleanValue = value.replace(/\D/g, "");
    const nextDigits = [...codeDigits];

    if (cleanValue.length > 1) {
      const pastedDigits = cleanValue.slice(0, 6).split("");
      for (let i = 0; i < 6; i += 1) {
        nextDigits[i] = pastedDigits[i] ?? "";
      }
      setCodeDigits(nextDigits);
      setError("");
      const nextIndex = Math.min(pastedDigits.length, 5);
      codeRefs.current[nextIndex]?.focus();
      if (pastedDigits.length === 6) {
        void verifyCode(nextDigits);
      }
      return;
    }

    nextDigits[index] = cleanValue;
    setCodeDigits(nextDigits);
    setError("");
    if (cleanValue && index < 5) {
      codeRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyPress = (
    event: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number,
  ) => {
    if (event.nativeEvent.key === "Backspace" && !codeDigits[index] && index > 0) {
      codeRefs.current[index - 1]?.focus();
    }
  };

  const renderEmailStep = () => (
    <>
      <View style={styles.header}>
        <Text selectable style={styles.title}>
          Mot de passe oubli\u00e9
        </Text>
        <Text selectable style={styles.subtitle}>
          Entrez votre e-mail et nous vous enverrons un code de r\u00e9initialisation.
        </Text>
      </View>

      <View style={styles.panel}>
        <AuthInput
          label="Email"
          placeholder="you@example.com"
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            setError("");
          }}
          autoComplete="email"
          textContentType="emailAddress"
          keyboardType="email-address"
          error={step === "email" ? error : undefined}
        />
        <Button
          mode="contained"
          disabled={loading !== null || !trimmedEmail}
          onPress={() => void sendResetCode()}
          loading={loading === "email"}
          style={styles.button}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonText}
        >
          Envoyer le code
        </Button>
      </View>
    </>
  );

  const renderCodeStep = () => (
    <>
      <View style={styles.header}>
        <Text selectable style={styles.title}>
          V\u00e9rifiez votre email
        </Text>
        <Text selectable style={styles.subtitle}>
          Entrez le code \u00e0 6 chiffres envoy\u00e9 \u00e0 {trimmedEmail}
        </Text>
      </View>

      <View style={styles.panel}>
        <View style={styles.codeRow}>
          {codeDigits.map((digit, index) => (
            <PaperTextInput
              key={`reset-code-${index}`}
              ref={(ref: any | null) => {
                codeRefs.current[index] = ref;
              }}
              value={digit}
              onChangeText={(value) => handleCodeChange(value, index)}
              onKeyPress={(event) => handleCodeKeyPress(event, index)}
              contentStyle={styles.codeInputContent}
              keyboardType="number-pad"
              mode="outlined"
              outlineStyle={styles.codeInputOutline}
              style={styles.codeInput}
              textContentType="oneTimeCode"
              maxLength={index === 0 ? 6 : 1}
              selectionColor={AUTH_COLORS.accent}
              returnKeyType="done"
            />
          ))}
        </View>
        {error ? (
          <Text selectable style={styles.formError}>
            {error}
          </Text>
        ) : null}
        <Button
          mode="contained"
          disabled={loading !== null || !codeReady}
          onPress={() => void verifyCode()}
          loading={loading === "code"}
          style={styles.button}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonText}
        >
          V\u00e9rifier le code
        </Button>
        <Button
          compact
          mode="text"
          disabled={loading !== null}
          onPress={() => void resendResetCode()}
          style={styles.linkButton}
          labelStyle={styles.linkText}
        >
          {loading === "resend" ? "Envoi en cours..." : "Renvoyer le code"}
        </Button>
      </View>
    </>
  );

  const renderPasswordStep = () => (
    <>
      <View style={styles.header}>
        <Text selectable style={styles.title}>
          Nouveau mot de passe
        </Text>
        <Text selectable style={styles.subtitle}>
          Choisissez un nouveau mot de passe pour {trimmedEmail}.
        </Text>
      </View>

      <View style={styles.panel}>
        <AuthInput
          label="Nouveau mot de passe"
          placeholder="Entrez votre nouveau mot de passe"
          value={newPassword}
          onChangeText={(value) => {
            setNewPassword(value);
            setError("");
          }}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <AuthInput
          label="Confirmer le mot de passe"
          placeholder="Confirmez votre mot de passe"
          value={confirmPassword}
          onChangeText={(value) => {
            setConfirmPassword(value);
            setError("");
          }}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
        />
        {error ? (
          <Text selectable style={styles.formError}>
            {error}
          </Text>
        ) : null}
        <Button
          mode="contained"
          disabled={loading !== null || !passwordReady}
          onPress={() => void resetPassword()}
          loading={loading === "password"}
          style={styles.button}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonText}
        >
          R\u00e9initialiser le mot de passe
        </Button>
      </View>
    </>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.screen}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <Pressable onPress={Keyboard.dismiss} style={styles.dismissArea}>
          {router.canGoBack() ? (
            <IconButton
              accessibilityLabel="Retour"
              icon={({size}) => <ChevronLeft color={paperTheme.colors.onSurface} size={size} strokeWidth={2} />}
              mode="contained-tonal"
              onPress={() => router.back()}
              style={styles.backButton}
            />
          ) : null}

          <View style={styles.content}>
            {step === "email" ? renderEmailStep() : null}
            {step === "code" ? renderCodeStep() : null}
            {step === "password" ? renderPasswordStep() : null}
          </View>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: AUTH_COLORS.background,
  },
  scroll: {
    flex: 1,
    backgroundColor: AUTH_COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  dismissArea: {
    flex: 1,
    backgroundColor: AUTH_COLORS.background,
  },
  backButton: {
    position: "absolute",
    top: 14,
    left: 18,
    zIndex: 2,
    margin: 0,
  },
  content: {
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 28,
    gap: 24,
  },
  header: {
    gap: 10,
  },
  title: {
    color: AUTH_COLORS.textPrimary,
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 0,
  },
  subtitle: {
    color: AUTH_COLORS.textSecondary,
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 20,
    letterSpacing: 0,
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
  codeRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  codeInput: {
    width: 40,
    height: 56,
    backgroundColor: "transparent",
  },
  codeInputContent: {
    textAlign: "center",
    letterSpacing: 0,
  },
  codeInputOutline: {
    borderRadius: md3Shapes.small,
    borderColor: AUTH_COLORS.border,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  codeInputText: {
    textAlign: "center",
    letterSpacing: 0,
  },
  formError: {
    color: AUTH_COLORS.accent,
    fontSize: 12,
    lineHeight: 17,
    letterSpacing: 0,
    textAlign: "center",
  },
  button: {
    borderRadius: md3Shapes.extraLarge,
    backgroundColor: AUTH_COLORS.accent,
  },
  buttonContent: {
    minHeight: 56,
    paddingHorizontal: md3Spacing.extraLarge,
  },
  buttonText: {
    letterSpacing: 0,
  },
  linkButton: {
    alignSelf: "center",
    paddingVertical: 2,
  },
  linkText: {
    letterSpacing: 0,
  },
});
