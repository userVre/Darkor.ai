import {useSignIn} from "@clerk/expo/legacy";
import {useRouter} from "expo-router";
import {ChevronLeft} from "lucide-react-native";
import {useState} from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {AuthInput} from "@/components/auth/AuthInput";

const AUTH_COLORS = {
  background: "#0A0A0F",
  surfaceCard: "rgba(255,255,255,0.06)",
  border: "rgba(255,255,255,0.12)",
  textPrimary: "#FFFFFF",
  textSecondary: "rgba(255,255,255,0.60)",
  accent: "#E83A5A",
};

function isValidEmail(value: string) {
  return value.includes("@") && value.includes(".");
}

export default function ForgotPasswordRoute() {
  const router = useRouter();
  const {signIn, isLoaded} = useSignIn();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const sendResetLink = async () => {
    Keyboard.dismiss();
    setError("");
    setSuccess("");
    if (!isValidEmail(email.trim())) {
      setError("Please enter a valid email address");
      return;
    }
    if (!isLoaded) return;

    setLoading(true);
    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email.trim(),
      });
      setSuccess("Check your email for the reset link.");
    } catch (resetError) {
      setError("We could not send a reset email. Please check the address and try again.");
    } finally {
      setLoading(false);
    }
  };

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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <ChevronLeft color={AUTH_COLORS.textPrimary} size={20} strokeWidth={2} />
            </Pressable>
          ) : null}

          <View style={styles.content}>
            <View style={styles.header}>
              <Text selectable style={styles.title}>
                Reset password
              </Text>
              <Text selectable style={styles.subtitle}>
                Enter your email and we will send instructions to reset your password.
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
                  setSuccess("");
                }}
                autoComplete="email"
                textContentType="emailAddress"
                keyboardType="email-address"
                error={error}
              />
              {success ? (
                <Text selectable style={styles.success}>
                  {success}
                </Text>
              ) : null}
              <Pressable
                accessibilityRole="button"
                disabled={loading || !email.trim()}
                onPress={() => void sendResetLink()}
                style={({pressed}) => [
                  styles.button,
                  loading || !email.trim() ? styles.disabled : null,
                  pressed ? styles.pressed : null,
                ]}
              >
                {loading ? (
                  <ActivityIndicator color={AUTH_COLORS.textPrimary} />
                ) : (
                  <Text style={styles.buttonText}>Send Reset Link</Text>
                )}
              </Pressable>
            </View>
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
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
    letterSpacing: -0.5,
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
  success: {
    color: AUTH_COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
  },
  button: {
    height: 54,
    borderRadius: 14,
    backgroundColor: AUTH_COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: AUTH_COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "600",
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.82,
  },
});
