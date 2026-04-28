import {ArrowLeft} from "@/components/material-icons";
import {useLocalSearchParams, useRouter} from "expo-router";
import {useTranslation} from "react-i18next";
import {Pressable, ScrollView, StyleSheet, Text, View} from "react-native";
import {SafeAreaView, useSafeAreaInsets} from "react-native-safe-area-context";

import {DS, SCREEN_SECTION_GAP, SCREEN_SIDE_PADDING, glowShadow, surfaceCard} from "../lib/design-system";
import {triggerHaptic} from "../lib/haptics";
import {SETTINGS_ROUTE} from "../lib/routes";

type LegalDocumentKey = "privacy" | "terms";

function readDocumentParam(value: string | string[] | undefined): LegalDocumentKey {
  if (Array.isArray(value)) {
    return value[0] === "privacy" ? "privacy" : "terms";
  }

  return value === "privacy" ? "privacy" : "terms";
}

export default function LegalViewerScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ document?: string | string[] }>();
  const documentKey = readDocumentParam(params.document);
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
  const termsSections = [
    "acceptanceOfTerms",
    "serviceDescription",
    "accountAndEligibility",
    "userContent",
    "subscriptionsAndCredits",
    "prohibitedUse",
    "disclaimer",
    "limitationOfLiability",
    "contact",
  ].map((sectionId) => ({
    title: t(`terms.sections.${sectionId}.title`),
    body: t(`terms.sections.${sectionId}.body`),
  }));
  const legalDocuments = {
    privacy: {
      eyebrow: t("privacy.eyebrow"),
      title: t("privacy.title"),
      description: t("privacy.description"),
      date: t("privacy.date"),
      sections: privacySections,
    },
    terms: {
      eyebrow: t("terms.eyebrow"),
      title: t("terms.title"),
      description: t("terms.description"),
      date: t("terms.date"),
      sections: termsSections,
    },
  } as const;
  const legalPriorityNotices = [
    {
      title: t("terms.sections.subscriptionsAndCredits.title"),
      body: t("terms.sections.subscriptionsAndCredits.body"),
    },
    {
      title: t("terms.sections.disclaimer.title"),
      body: t("terms.sections.disclaimer.body"),
    },
  ];
  const document = legalDocuments[documentKey as LegalDocumentKey];

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
              if (router.canGoBack()) {
                router.back();
                return;
              }

              router.replace(SETTINGS_ROUTE as any);
            }}
            style={styles.backButton}
          >
            <ArrowLeft color="#000000" size={18} strokeWidth={2.2} />
          </Pressable>

          <View style={styles.heroCard}>
            <Text style={styles.eyebrow}>{document.eyebrow}</Text>
            <Text style={styles.title}>{document.title}</Text>
            <Text style={styles.description}>{document.description}</Text>
          </View>
        </View>

        <View style={styles.priorityStack}>
          {legalPriorityNotices.map((notice) => (
            <View key={notice.title} style={styles.priorityCard}>
              <Text style={styles.priorityTitle}>{notice.title}</Text>
              <Text style={styles.priorityBody}>{notice.body}</Text>
            </View>
          ))}
        </View>

        <View style={styles.metaCard}>
          <Text style={styles.metaLabel}>{t("common.labels.lastUpdated")}</Text>
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
              {t("terms.title")}
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
              {t("privacy.title")}
            </Text>
          </Pressable>
        </View>

        <View style={styles.sectionStack}>
          {document.sections.map((section: { title: string; body: string }) => (
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
  priorityStack: {
    gap: DS.spacing[1.5],
  },
  priorityCard: {
    ...surfaceCard(DS.colors.accentSurface),
    borderColor: DS.colors.accentStrong,
    padding: DS.spacing[3],
    gap: DS.spacing[1],
  },
  priorityTitle: {
    color: DS.colors.accentStrong,
    ...DS.typography.label,
  },
  priorityBody: {
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
