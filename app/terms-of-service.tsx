import { useRouter } from "expo-router";
import { ArrowLeft } from "@/components/material-icons";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { LuxPressable } from "../components/lux-pressable";
import { DS, SCREEN_SECTION_GAP, SCREEN_SIDE_PADDING, glowShadow, surfaceCard } from "../lib/design-system";
import { triggerHaptic } from "../lib/haptics";

const TERMS_SECTIONS = [
  {
    title: "Acceptance of Terms",
    body:
      "By accessing or using HomeDecor AI, you agree to these Terms of Service. If you do not agree, do not use the app.",
  },
  {
    title: "Service Description",
    body:
      "HomeDecor AI provides AI-generated redesigns for interior and exterior spaces. Outputs are visual concepts and may not account for structural, engineering, or code constraints.",
  },
  {
    title: "Account and Eligibility",
    body:
      "You must be at least 13 years old to use HomeDecor AI. You are responsible for maintaining account security and for activity that happens under your credentials.",
  },
  {
    title: "User Content",
    body:
      "You retain ownership of images you upload. By using the service, you grant HomeDecor AI a limited license to process and store them so we can generate and return your results.",
  },
  {
    title: "Subscriptions and Credits",
    body:
      "Paid plans unlock enhanced features and higher-quality exports. Credits are consumed per generation, and subscription billing and renewals are handled by your app store and RevenueCat.",
  },
  {
    title: "Prohibited Use",
    body:
      "You agree not to misuse the service, reverse engineer the app, or upload unlawful, harmful, or infringing content.",
  },
  {
    title: "Disclaimer",
    body:
      'The service is provided "as is" without warranties of any kind. We do not guarantee specific design results or the accuracy of AI-generated outputs.',
  },
  {
    title: "Limitation of Liability",
    body:
      "To the maximum extent permitted by law, HomeDecor AI is not liable for indirect or consequential damages arising from your use of the service.",
  },
  {
    title: "Contact",
    body: "Questions about these terms can be sent to support@homedecor.ai.",
  },
];

export default function TermsOfServiceScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingHorizontal: SCREEN_SIDE_PADDING,
          paddingTop: DS.spacing[3],
          paddingBottom: Math.max(insets.bottom + DS.spacing[6], 120),
          gap: SCREEN_SECTION_GAP,
        }}
      >
        <View style={styles.header}>
          <LuxPressable
            onPress={() => {
              triggerHaptic();
              router.back();
            }}
            className="cursor-pointer"
            style={styles.backButton}
            glowColor={DS.colors.accentGlow}
          >
            <ArrowLeft color={DS.colors.textPrimary} size={18} strokeWidth={2.2} />
          </LuxPressable>

          <View style={styles.heroCard}>
            <Text style={styles.eyebrow}>{t("terms.eyebrow")}</Text>
            <Text style={styles.title}>{t("terms.title")}</Text>
            <Text style={styles.description}>{t("terms.description")}</Text>
          </View>
        </View>

        <View style={styles.metaCard}>
          <Text style={styles.metaLabel}>{t("common.labels.lastUpdated")}</Text>
          <Text style={styles.metaValue}>{t("terms.date")}</Text>
        </View>

        <View style={styles.sectionStack}>
          {TERMS_SECTIONS.map((section) => (
            <View key={section.title} style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionBody}>{section.body}</Text>
            </View>
          ))}
        </View>
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
  header: {
    gap: DS.spacing[3],
  },
  backButton: {
    ...surfaceCard(DS.colors.surface),
    ...glowShadow("rgba(255,255,255,0.03)", 16),
    width: 44,
    height: 44,
    borderRadius: DS.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCard: {
    ...surfaceCard(),
    ...glowShadow("rgba(0,0,0,0.34)", 22),
    padding: DS.spacing[3],
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
  description: {
    color: DS.colors.textSecondary,
    ...DS.typography.body,
    maxWidth: 560,
  },
  metaCard: {
    ...surfaceCard(DS.colors.surface),
    padding: DS.spacing[3],
    gap: DS.spacing[0],
  },
  metaLabel: {
    color: DS.colors.textTertiary,
    ...DS.typography.label,
  },
  metaValue: {
    color: DS.colors.textPrimary,
    ...DS.typography.body,
  },
  sectionStack: {
    gap: DS.spacing[2],
  },
  sectionCard: {
    ...surfaceCard(),
    padding: DS.spacing[3],
    gap: DS.spacing[1],
  },
  sectionTitle: {
    color: DS.colors.textPrimary,
    ...DS.typography.cardTitle,
  },
  sectionBody: {
    color: DS.colors.textSecondary,
    ...DS.typography.body,
  },
});

