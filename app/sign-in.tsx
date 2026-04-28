import {ArrowLeft} from "@/components/material-icons";
import {useOAuth} from "@clerk/expo";
import {useSignIn} from "@clerk/expo/legacy";
import {Link, useLocalSearchParams, useRouter, type Href} from "expo-router";
import {useState} from "react";
import {useTranslation} from "react-i18next";
import {Alert, ScrollView, StyleSheet, Text, TextInput, View} from "react-native";
import {SafeAreaView, useSafeAreaInsets} from "react-native-safe-area-context";
import {buttonStyles} from "../styles/buttons";
import {fonts} from "../styles/typography";

import {LuxPressable} from "../components/lux-pressable";
import {DS, HAIRLINE, SCREEN_SIDE_PADDING, glowShadow, surfaceCard} from "../lib/design-system";
import {triggerHaptic} from "../lib/haptics";
import {resolveSafeRoute, TOOLS_ROUTE} from "../lib/routes";

export default function SignInScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { signIn, setActive, isLoaded } = useSignIn();
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_apple" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const nextRoute = resolveSafeRoute(typeof returnTo === "string" ? returnTo : null, TOOLS_ROUTE);

  const handleSignIn = async () => {
    if (!isLoaded) return;
    setLoading(true);
    try {
      const completeSignIn = await signIn.create({ identifier: email.trim(), password });
      if (completeSignIn.status !== "complete") {
        Alert.alert(t("auth.signIn.additionalVerificationTitle"), t("auth.signIn.additionalVerificationBody"));
        return;
      }
      await setActive({ session: completeSignIn.createdSessionId });
      router.replace(nextRoute as Href);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("auth.signIn.errorFallback");
      Alert.alert(t("auth.signIn.errorTitle"), message);
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
      const message = error instanceof Error ? error.message : t("auth.signIn.appleErrorFallback");
      Alert.alert(t("auth.signIn.errorTitle"), message);
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
            if (router.canGoBack()) {
              router.back();
              return;
            }

            router.replace(nextRoute as Href);
          }}
          style={styles.backButton}
          className="cursor-pointer"
          glowColor={DS.colors.accentGlow}
        >
          <ArrowLeft color={DS.colors.textPrimary} size={18} strokeWidth={2.2} />
        </LuxPressable>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>{t("auth.accountEyebrow")}</Text>
          <Text style={styles.title}>{t("auth.signIn.title")}</Text>
          <Text style={styles.subtitle}>{t("auth.signIn.subtitle")}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{t("common.labels.email")}</Text>
            <TextInput
              style={styles.input}
              placeholder={t("auth.emailPlaceholder")}
              placeholderTextColor={DS.colors.textTertiary}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{t("common.labels.password")}</Text>
            <TextInput
              style={styles.input}
              placeholder={t("auth.signIn.passwordPlaceholder")}
              placeholderTextColor={DS.colors.textTertiary}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <LuxPressable onPress={() => void handleSignIn()} style={styles.fullWidth} disabled={loading} glowColor={DS.colors.accentGlowStrong}>
            <View style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>{loading ? t("auth.signIn.loading") : t("auth.signIn.cta")}</Text>
            </View>
          </LuxPressable>

          <LuxPressable onPress={() => void handleAppleSignIn()} style={styles.fullWidth} disabled={appleLoading}>
            <View style={styles.secondaryButton}>
              <Text style={styles.appleIcon}>{"\uF8FF"}</Text>
              <Text style={styles.secondaryButtonText}>{appleLoading ? t("common.actions.connect") : t("auth.signIn.appleCta")}</Text>
            </View>
          </LuxPressable>
        </View>

        <Text style={styles.footerText}>
          {t("auth.signIn.noAccount")}{" "}
          <Link href={{ pathname: "/sign-up", params: { returnTo: nextRoute } }} style={styles.footerLink}>
            {t("auth.signIn.createOne")}
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



