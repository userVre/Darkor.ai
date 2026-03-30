import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ChevronLeft, CircleHelp } from "lucide-react-native";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { LuxPressable } from "../components/lux-pressable";
import { DS, SCREEN_SECTION_GAP, SCREEN_SIDE_PADDING, glowShadow, surfaceCard } from "../lib/design-system";
import { triggerHaptic } from "../lib/haptics";

const FAQ_ITEMS = [
  {
    question: "How do credits work in Darkor.ai?",
    answer:
      "Each redesign uses credits based on the workflow and export quality you choose. Your remaining balance updates automatically after every generation.",
  },
  {
    question: "What do I unlock with PRO?",
    answer:
      "PRO unlocks premium generation tools, faster processing, and higher-end output quality through the paywall flow in the app.",
  },
  {
    question: "Why is my result taking longer than expected?",
    answer:
      "Generation times depend on queue load, source image quality, and the workflow you selected. Keeping the app open on a stable connection helps avoid interruptions.",
  },
  {
    question: "How do I delete my account?",
    answer:
      "Open Settings and choose Delete Information. This removes your account data and signs you out after confirmation.",
  },
];

export default function FaqScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingHorizontal: SCREEN_SIDE_PADDING,
          paddingTop: DS.spacing[2],
          paddingBottom: Math.max(insets.bottom + DS.spacing[5], DS.spacing[6]),
          gap: SCREEN_SECTION_GAP,
        }}
      >
        <View style={styles.header}>
          <LuxPressable
            onPress={() => {
              triggerHaptic();
              router.back();
            }}
            style={styles.backButton}
            className="cursor-pointer"
            glowColor={DS.colors.accentGlow}
          >
            <ChevronLeft color={DS.colors.textPrimary} size={18} strokeWidth={2.2} />
          </LuxPressable>

          <View style={styles.heroCard}>
            <Text style={styles.eyebrow}>Support</Text>
            <Text style={styles.title}>FAQ</Text>
            <Text style={styles.description}>Quick answers to the most common Darkor.ai questions.</Text>
          </View>
        </View>

        <View style={styles.stack}>
          {FAQ_ITEMS.map((item) => (
            <View key={item.question} style={styles.itemCard}>
              <View style={styles.itemRow}>
                <View style={styles.iconShell}>
                  <CircleHelp color={DS.colors.accentStrong} size={18} />
                </View>
                <View style={styles.itemCopy}>
                  <Text style={styles.question}>{item.question}</Text>
                  <Text style={styles.answer}>{item.answer}</Text>
                </View>
              </View>
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
    ...glowShadow("rgba(0,0,0,0.32)", 22),
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
    maxWidth: 520,
  },
  stack: {
    gap: DS.spacing[2],
  },
  itemCard: {
    ...surfaceCard(),
    ...glowShadow("rgba(255,255,255,0.02)", 18),
    padding: DS.spacing[3],
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: DS.spacing[2],
  },
  iconShell: {
    width: 44,
    height: 44,
    borderRadius: DS.radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DS.colors.accentSurface,
  },
  itemCopy: {
    flex: 1,
    gap: DS.spacing[1],
  },
  question: {
    color: DS.colors.textPrimary,
    ...DS.typography.cardTitle,
  },
  answer: {
    color: DS.colors.textSecondary,
    ...DS.typography.body,
  },
});
