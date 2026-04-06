import { useOAuth } from "@clerk/expo";
import { useSignIn } from "@clerk/expo/legacy";
import { Link, type Href, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft } from "@/components/material-icons";
import { fonts } from "../styles/typography";
import { buttonStyles } from "../styles/buttons";

import { LuxPressable } from "../components/lux-pressable";
import { DS, HAIRLINE, SCREEN_SIDE_PADDING, glowShadow, surfaceCard } from "../lib/design-system";
import { triggerHaptic } from "../lib/haptics";

export default function SignInScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { signIn, setActive, isLoaded } = useSignIn();
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_apple" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const nextRoute = typeof returnTo === "string" && returnTo.startsWith("/") ? returnTo : "/(tabs)";

  const handleSignIn = async () => {
    if (!isLoaded) return;
    setLoading(true);
    try {
      const completeSignIn = await signIn.create({ identifier: email.trim(), password });
      if (completeSignIn.status !== "complete") {
        Alert.alert("Sign in", "Additional verification is required for this account.");
        return;
      }
      await setActive({ session: completeSignIn.createdSessionId });
      router.replace(nextRoute as Href);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sign in failed";
      Alert.alert("Sign in failed", message);
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setAppleLoading(true);
    try {
      const { createdSessionId, setActive: setOAuthActive } = await startOAuthFlow();
      if (createdSessionId) {
        await setOAuthActive?.({ session: createdSessionId });
        router.replace(nextRoute as Href);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Apple sign-in failed";
      Alert.alert("Apple sign-in failed", message);
    } finally {
      setAppleLoading(false);
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: SCREEN_SIDE_PADDING,
          paddingTop: DS.spacing[3],
          paddingBottom: Math.max(insets.bottom + DS.spacing[5], DS.spacing[6]),
          gap: DS.spacing[4],
        }}
      >
        <LuxPressable
          onPress={() => {
            triggerHaptic();
            router.back();
          }}
          style={styles.backButton}
          className="cursor-pointer"
          glowColor={DS.colors.accentGlow}
        >
          <ArrowLeft color={DS.colors.textPrimary} size={18} strokeWidth={2.2} />
        </LuxPressable>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Darkor.ai Account</Text>
          <Text style={styles.title}>Sign in</Text>
          <Text style={styles.subtitle}>
            Access your saved boards, credits, purchases, and redesign history with the same calm, high-contrast workspace.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@company.com"
              placeholderTextColor={DS.colors.textTertiary}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor={DS.colors.textTertiary}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <LuxPressable onPress={() => void handleSignIn()} style={styles.fullWidth} disabled={loading} glowColor={DS.colors.accentGlowStrong}>
            <View style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>{loading ? "Signing in..." : "Continue"}</Text>
            </View>
          </LuxPressable>

          <LuxPressable onPress={() => void handleAppleSignIn()} style={styles.fullWidth} disabled={appleLoading}>
            <View style={styles.secondaryButton}>
              <Text style={styles.appleIcon}>{"\uF8FF"}</Text>
              <Text style={styles.secondaryButtonText}>{appleLoading ? "Connecting..." : "Continue with Apple"}</Text>
            </View>
          </LuxPressable>
        </View>

        <Text style={styles.footerText}>
          No account?{" "}
          <Link href={{ pathname: "/sign-up", params: { returnTo: nextRoute } }} style={styles.footerLink}>
            Create one
          </Link>
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: DS.colors.background,
  },
  scroll: {
    flex: 1,
    backgroundColor: DS.colors.background,
  },
  backButton: {
    ...surfaceCard(DS.colors.surface),
    width: 44,
    height: 44,
    borderRadius: DS.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    ...glowShadow(DS.colors.border, 16),
  },
  hero: {
    gap: DS.spacing[1],
  },
  eyebrow: {
    color: DS.colors.textTertiary,
    ...DS.typography.label,
  },
  title: {
    color: DS.colors.textPrimary,
    ...DS.typography.title,
  },
  subtitle: {
    color: DS.colors.textSecondary,
    ...DS.typography.body,
    maxWidth: 480,
  },
  card: {
    ...surfaceCard(),
    ...glowShadow(DS.colors.background, 22),
    padding: DS.spacing[3],
    gap: DS.spacing[3],
  },
  fieldGroup: {
    gap: DS.spacing[1],
  },
  label: {
    color: DS.colors.textSecondary,
    ...DS.typography.bodySm,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "600",
  },
  input: {
    minHeight: 56,
    borderRadius: DS.radius.md,
    borderWidth: HAIRLINE,
    borderColor: DS.colors.borderSubtle,
    backgroundColor: DS.colors.surface,
    color: DS.colors.textPrimary,
    paddingHorizontal: DS.spacing[2],
    paddingVertical: DS.spacing[2],
    fontSize: 15,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "400",
  },
  fullWidth: {
    width: "100%",
  },
  primaryButton: {
    ...buttonStyles.primary,
    paddingHorizontal: DS.spacing[3],
  },
  primaryButtonText: {
    color: DS.colors.textPrimary,
    ...DS.typography.button,
  },
  secondaryButton: {
    ...buttonStyles.secondary,
    minHeight: 56,
    borderRadius: DS.radius.md,
    flexDirection: "row",
    gap: DS.spacing[1],
    paddingHorizontal: DS.spacing[3],
  },
  appleIcon: {
    color: DS.colors.textPrimary,
    fontSize: 18,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "700",
  },
  secondaryButtonText: {
    color: DS.colors.textPrimary,
    ...DS.typography.button,
  },
  footerText: {
    color: DS.colors.textSecondary,
    ...DS.typography.bodySm,
  },
  footerLink: {
    color: DS.colors.accentStrong,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "700",
  },
});



