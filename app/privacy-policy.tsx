import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { LuxPressable } from "../components/lux-pressable";
import { DS, SCREEN_SECTION_GAP, SCREEN_SIDE_PADDING, glowShadow, surfaceCard } from "../lib/design-system";
import { triggerHaptic } from "../lib/haptics";

const PRIVACY_SECTIONS = [
  {
    title: "Overview",
    body:
      'Darkor.ai ("Darkor", "we", "our", "us") provides AI-powered interior and exterior redesign services. This Privacy Policy explains what data we collect, how we use it, and the choices you have.',
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
      "We share data only with providers required to operate Darkor.ai, such as authentication, analytics, and payment processing partners, or when disclosure is required by law.",
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
    body: "For privacy questions or requests, contact us at support@darkor.ai.",
  },
];

export default function PrivacyPolicyScreen() {
  const router = useRouter();
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
            <Text style={styles.eyebrow}>Policy</Text>
            <Text style={styles.title}>Privacy Policy</Text>
            <Text style={styles.description}>
              The information we collect, how it is used, and the controls you have inside Darkor.ai.
            </Text>
          </View>
        </View>

        <View style={styles.metaCard}>
          <Text style={styles.metaLabel}>Last updated</Text>
          <Text style={styles.metaValue}>March 14, 2026</Text>
        </View>

        <View style={styles.sectionStack}>
          {PRIVACY_SECTIONS.map((section) => (
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
