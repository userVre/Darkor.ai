import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft } from "@/components/material-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { DS, SCREEN_SECTION_GAP, SCREEN_SIDE_PADDING, glowShadow, surfaceCard } from "../lib/design-system";
import { triggerHaptic } from "../lib/haptics";

const PRIVACY_SECTIONS = [
  {
    title: "Overview",
    body:
      'HomeDecor AI ("HomeDecor", "we", "our", "us") provides AI-powered interior and exterior redesign services. This Privacy Policy explains what data we collect, how we use it, and the choices you have.',
  },
  {
    title: "Information We Collect",
    body:
      "We collect information you provide, such as account details and uploaded images, usage data such as feature interactions and device information, and payment status data from RevenueCat to manage subscriptions.",
  },
  {
    title: "How We Use Your Data",
    body:
      "We use your data to deliver redesigns, personalize your experience, manage credits and billing, improve model quality, and secure the app. We do not sell your personal data.",
  },
  {
    title: "Image Processing",
    body:
      "Images you upload are processed to generate redesigns. We store generated images and related metadata so you can revisit your results, and you can remove your data by deleting your account.",
  },
  {
    title: "Sharing and Disclosure",
    body:
      "We share data only with providers required to operate HomeDecor AI, such as authentication, analytics, and payment processing partners, or when disclosure is required by law.",
  },
  {
    title: "Data Security",
    body:
      "We use encryption and access controls to protect your data. No system is perfectly secure, so we also recommend strong passwords and a protected device.",
  },
  {
    title: "Your Rights",
    body:
      "You can access, update, or delete your account data at any time. Account deletion removes your stored generations and profile information from our systems.",
  },
  {
    title: "Contact Us",
    body: "For privacy questions or requests, contact us at support@homedecor.ai.",
  },
] as const;

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
] as const;

const LEGAL_DOCUMENTS = {
  privacy: {
    eyebrow: "Legal Viewer",
    title: "Privacy Policy",
    description: "The information we collect, how it is used, and the controls you have inside HomeDecor AI.",
    date: "March 14, 2026",
    sections: PRIVACY_SECTIONS,
  },
  terms: {
    eyebrow: "Legal Viewer",
    title: "Terms of Service",
    description: "The rules, expectations, and service boundaries for using HomeDecor AI.",
    date: "March 14, 2026",
    sections: TERMS_SECTIONS,
  },
} as const;

type LegalDocumentKey = keyof typeof LEGAL_DOCUMENTS;

function readDocumentParam(value: string | string[] | undefined): LegalDocumentKey {
  if (Array.isArray(value)) {
    return value[0] === "privacy" ? "privacy" : "terms";
  }

  return value === "privacy" ? "privacy" : "terms";
}

export default function LegalViewerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ document?: string | string[] }>();
  const documentKey = readDocumentParam(params.document);
  const document = LEGAL_DOCUMENTS[documentKey];

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
          <Pressable
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => {
              triggerHaptic();
              router.back();
            }}
            style={styles.backButton}
          >
            <ArrowLeft color={DS.colors.textPrimary} size={18} strokeWidth={2.2} />
          </Pressable>

          <View style={styles.heroCard}>
            <Text style={styles.eyebrow}>{document.eyebrow}</Text>
            <Text style={styles.title}>{document.title}</Text>
            <Text style={styles.description}>{document.description}</Text>
          </View>
        </View>

        <View style={styles.metaCard}>
          <Text style={styles.metaLabel}>Last updated</Text>
          <Text style={styles.metaValue}>{document.date}</Text>
        </View>

        <View style={styles.switchRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              if (documentKey === "terms") {
                return;
              }

              triggerHaptic();
              router.replace({ pathname: "/legal-viewer", params: { document: "terms" } } as never);
            }}
            style={[styles.switchButton, documentKey === "terms" ? styles.switchButtonActive : null]}
          >
            <Text style={[styles.switchLabel, documentKey === "terms" ? styles.switchLabelActive : null]}>
              Terms of Service
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              if (documentKey === "privacy") {
                return;
              }

              triggerHaptic();
              router.replace({ pathname: "/legal-viewer", params: { document: "privacy" } } as never);
            }}
            style={[styles.switchButton, documentKey === "privacy" ? styles.switchButtonActive : null]}
          >
            <Text style={[styles.switchLabel, documentKey === "privacy" ? styles.switchLabelActive : null]}>
              Privacy Policy
            </Text>
          </Pressable>
        </View>

        <View style={styles.sectionStack}>
          {document.sections.map((section) => (
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
  switchRow: {
    flexDirection: "row",
    gap: DS.spacing[1],
  },
  switchButton: {
    ...surfaceCard(DS.colors.surface),
    flex: 1,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: DS.spacing[2],
  },
  switchButtonActive: {
    backgroundColor: DS.colors.textPrimary,
  },
  switchLabel: {
    color: DS.colors.textSecondary,
    textAlign: "center",
    ...DS.typography.label,
  },
  switchLabelActive: {
    color: DS.colors.background,
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
