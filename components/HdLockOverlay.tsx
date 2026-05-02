import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import {Lock} from "lucide-react-native";
import {useRouter} from "expo-router";
import {useCallback, useMemo, useRef} from "react";
import {Pressable, StyleSheet, Text, View} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";

import {DS} from "../lib/design-system";
import {usePricingContext, type PricingDuration} from "../lib/dynamic-pricing";
import {triggerHaptic} from "../lib/haptics";
import {fonts} from "../styles/typography";
import {DiamondCreditIcon} from "./diamond-credit-pill";
import {useDiamondStore} from "./diamond-store-context";

type HdLockOverlayProps = {
  visible: boolean;
};

export function HdLockOverlay({ visible }: HdLockOverlayProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pricing = usePricingContext();
  const { openStore } = useDiamondStore();
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["46%"], []);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.36} />
    ),
    [],
  );

  const openSheet = useCallback(() => {
    triggerHaptic();
    sheetRef.current?.present();
  }, []);

  const openPlan = useCallback((plan: PricingDuration) => {
    triggerHaptic();
    sheetRef.current?.dismiss();
    router.push({ pathname: "/paywall", params: { source: "hd-lock", plan } } as any);
  }, [router]);

  const openDiamondPacks = useCallback(() => {
    triggerHaptic();
    sheetRef.current?.dismiss();
    openStore("manual");
  }, [openStore]);

  if (!visible) {
    return null;
  }

  return (
    <>
      <Pressable
        accessibilityLabel="Export in 4K without watermark"
        accessibilityRole="button"
        hitSlop={10}
        onPress={openSheet}
        style={styles.lockButton}
      >
        <Lock color="#FFFFFF" size={15} strokeWidth={2.2} />
      </Pressable>

      <BottomSheetModal
        ref={sheetRef}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handle}
      >
        <BottomSheetView style={[styles.sheetContent, { paddingBottom: Math.max(insets.bottom + 18, 28) }]}>
          <Text style={styles.sheetTitle}>Export in 4K without watermark</Text>

          <View style={styles.planStack}>
            <PlanCard
              badge="BEST VALUE"
              featured
              label="Yearly Pro"
              price={pricing.prices.yearly.formatted}
              subtitle={`${pricing.derived.yearlyPerWeek.formatted}/week`}
              onPress={() => openPlan("yearly")}
            />
            <PlanCard
              label="Weekly Pro"
              price={pricing.prices.weekly.formatted}
              subtitle="Flexible access"
              onPress={() => openPlan("weekly")}
            />
            <Pressable accessibilityRole="button" onPress={openDiamondPacks} style={styles.diamondOption}>
              <View style={styles.diamondIconWrap}>
                <DiamondCreditIcon monochrome primaryColor="#111111" size={18} />
              </View>
              <View style={styles.diamondCopy}>
                <Text style={styles.diamondTitle}>Use a Diamond Pack</Text>
                <Text style={styles.diamondSubtitle}>Premium renders without a subscription</Text>
              </View>
            </Pressable>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    </>
  );
}

type PlanCardProps = {
  badge?: string;
  featured?: boolean;
  label: string;
  price: string;
  subtitle: string;
  onPress: () => void;
};

function PlanCard({ badge, featured = false, label, price, subtitle, onPress }: PlanCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.planCard, featured ? styles.planCardFeatured : styles.planCardSecondary]}
    >
      <View style={styles.planCopy}>
        <View style={styles.planHeader}>
          <Text style={[styles.planLabel, featured ? styles.featuredText : styles.secondaryText]}>{label}</Text>
          {badge ? <Text style={styles.badge}>{badge}</Text> : null}
        </View>
        <Text style={[styles.planSubtitle, featured ? styles.featuredSubText : styles.secondarySubText]}>{subtitle}</Text>
      </View>
      <Text style={[styles.planPrice, featured ? styles.featuredText : styles.secondaryText]}>{price}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  lockButton: {
    position: "absolute",
    right: 14,
    bottom: 14,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.46)",
    zIndex: 20,
  },
  sheetBackground: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handle: {
    backgroundColor: "#D4D4D8",
    width: 42,
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sheetTitle: {
    color: DS.colors.textPrimary,
    fontSize: 24,
    lineHeight: 30,
    textAlign: "center",
    ...fonts.bold,
  },
  planStack: {
    marginTop: 18,
    gap: 10,
  },
  planCard: {
    minHeight: 76,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  planCardFeatured: {
    backgroundColor: "#111111",
  },
  planCardSecondary: {
    backgroundColor: "#F4F4F5",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E4E4E7",
  },
  planCopy: {
    flex: 1,
    minWidth: 0,
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  planLabel: {
    fontSize: 16,
    lineHeight: 21,
    ...fonts.bold,
  },
  planSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 17,
    ...fonts.medium,
  },
  planPrice: {
    fontSize: 18,
    lineHeight: 23,
    ...fonts.bold,
  },
  featuredText: {
    color: "#FFFFFF",
  },
  featuredSubText: {
    color: "rgba(255,255,255,0.72)",
  },
  secondaryText: {
    color: DS.colors.textPrimary,
  },
  secondarySubText: {
    color: DS.colors.textMuted,
  },
  badge: {
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    color: "#111111",
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 10,
    lineHeight: 12,
    ...fonts.bold,
  },
  diamondOption: {
    minHeight: 66,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E4E4E7",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  diamondIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4F4F5",
  },
  diamondCopy: {
    flex: 1,
    minWidth: 0,
  },
  diamondTitle: {
    color: DS.colors.textPrimary,
    fontSize: 15,
    lineHeight: 20,
    ...fonts.bold,
  },
  diamondSubtitle: {
    marginTop: 2,
    color: DS.colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
    ...fonts.medium,
  },
});
