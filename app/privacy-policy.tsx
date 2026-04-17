import { useRouter } from "expo-router";
import { ArrowLeft } from "@/components/material-icons";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { LuxPressable } from "../components/lux-pressable";
import { DS, SCREEN_SECTION_GAP, SCREEN_SIDE_PADDING, glowShadow, surfaceCard } from "../lib/design-system";
import { triggerHaptic } from "../lib/haptics";

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const privacySections = [
    "overview",
    "informationWeCollect",
    "howWeUseYourData",
    "imageProcessing",
    "sharingAndDisclosure",
    "dataSecurity",
    "yourRights",
    "contactUs",
  ].map((sectionId) => ({
    title: t(`privacy.sections.${sectionId}.title`),
    body: t(`privacy.sections.${sectionId}.body`),
  }));

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
            <Text style={styles.eyebrow}>{t("privacy.eyebrow")}</Text>
            <Text style={styles.title}>{t("privacy.title")}</Text>
            <Text style={styles.description}>{t("privacy.description")}</Text>
          </View>
        </View>

        <View style={styles.metaCard}>
          <Text style={styles.metaLabel}>{t("common.labels.lastUpdated")}</Text>
          <Text style={styles.metaValue}>{t("privacy.date")}</Text>
        </View>

        <View style={styles.sectionStack}>
          {privacySections.map((section) => (
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

