import {useAuth, useUser} from "@clerk/expo";
import {useMutation} from "convex/react";
import {ArrowRight} from "lucide-react-native";
import {useEffect, useMemo, useState} from "react";
import {ActivityIndicator, Modal, Pressable, StyleSheet, Text, View} from "react-native";

import {usePricingContext, type DiamondPackId} from "../lib/dynamic-pricing";
import {DS, organicRadii, surfaceCard} from "../lib/design-system";
import {triggerHaptic} from "../lib/haptics";
import {
  configureRevenueCat,
  fetchRevenueCatPackages,
  findRevenueCatDiamondPackage,
  getLatestRevenueCatTransaction,
  getRevenueCatClient,
  type RevenueCatPackage,
} from "../lib/revenuecat";
import {fonts} from "../styles/typography";
import {useProSuccess} from "./pro-success-context";
import {DiamondCreditIcon, DIAMOND_PILL_BLUE} from "./diamond-credit-pill";
import {useViewerCredits} from "./viewer-credits-context";
import {useViewerSession} from "./viewer-session-context";

type CreditsBalanceSheetProps = {
  visible: boolean;
  onClose: () => void;
};

type CreditPack = {
  badge?: string;
  pile: "small" | "medium" | "large";
};

const BUY_NOW_RUBY = "#E53935";

const CREDIT_PACK_UI: Record<DiamondPackId, CreditPack> = {
  starter: {
    pile: "small",
  },
  designer: {
    badge: "MOST POPULAR",
    pile: "medium",
  },
  architect: {
    pile: "large",
  },
  estate: {
    badge: "BEST VALUE",
    pile: "large",
  },
};

export function CreditsBalanceSheet({ visible, onClose }: CreditsBalanceSheetProps) {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const pricingContext = usePricingContext();
  const { credits, hasPaidAccess, setOptimisticCredits } = useViewerCredits();
  const { anonymousId } = useViewerSession();
  const { showCelebration, showToast } = useProSuccess();
  const fulfillDiamondPurchase = useMutation("users:fulfillDiamondPurchase" as any);
  const [selectedPackId, setSelectedPackId] = useState<DiamondPackId>("designer");
  const [packages, setPackages] = useState<RevenueCatPackage[]>([]);
  const [isLoadingPackages, setIsLoadingPackages] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setErrorMessage(null);
      setIsPurchasing(false);
      return;
    }

    let active = true;

    void (async () => {
      setIsLoadingPackages(true);
      try {
        const purchases = getRevenueCatClient() ?? await configureRevenueCat(isSignedIn ? user?.id ?? null : null);
        if (!purchases) {
          throw new Error("Purchases are unavailable right now.");
        }

        const nextPackages = await fetchRevenueCatPackages(purchases, pricingContext.revenueCat);
        if (active) {
          setPackages(nextPackages);
        }
      } catch (error) {
        if (active) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load Diamond packs right now.");
        }
      } finally {
        if (active) {
          setIsLoadingPackages(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [
    isSignedIn,
    pricingContext.revenueCat.countryCode,
    pricingContext.revenueCat.currencyCode,
    pricingContext.revenueCat.offeringHint,
    pricingContext.revenueCat.tierId,
    user?.id,
    visible,
  ]);

  const selectedPack = useMemo(
    () => pricingContext.diamondPacks[selectedPackId],
    [pricingContext.diamondPacks, selectedPackId],
  );
  const selectedRevenueCatPackage = useMemo(
    () => findRevenueCatDiamondPackage(packages, selectedPackId, pricingContext.revenueCat),
    [packages, pricingContext.revenueCat, selectedPackId],
  );

  useEffect(() => {
    if (!visible || selectedPack) {
      return;
    }

    const fallbackPackId = pricingContext.visibleDiamondPacks[0]?.id;
    if (fallbackPackId) {
      setSelectedPackId(fallbackPackId);
    }
  }, [pricingContext.visibleDiamondPacks, selectedPack, visible]);

  const handlePurchase = async () => {
    triggerHaptic();
    setErrorMessage(null);

    if (!selectedPack) {
      const message = "This Diamond pack is not available in your region.";
      setErrorMessage(message);
      showToast(message);
      return;
    }

    if (!selectedRevenueCatPackage) {
      const message = "This Diamond pack is not available in RevenueCat yet.";
      setErrorMessage(message);
      showToast(message);
      return;
    }

    const purchases = getRevenueCatClient() ?? await configureRevenueCat(isSignedIn ? user?.id ?? null : null);
    if (!purchases) {
      const message = "Purchases are unavailable right now.";
      setErrorMessage(message);
      showToast(message);
      return;
    }

    try {
      setIsPurchasing(true);
      const result = await purchases.purchasePackage(selectedRevenueCatPackage);
      const productIdentifier = result.productIdentifier || selectedRevenueCatPackage.product.identifier;
      const transaction = getLatestRevenueCatTransaction(result.customerInfo, productIdentifier);
      const purchasedAt = transaction ? Date.parse(transaction.purchaseDate) : Date.now();
      const transactionId =
        transaction?.transactionIdentifier
        ?? `${productIdentifier}:${purchasedAt}:${selectedPack.id}`;

      const fulfillment = await fulfillDiamondPurchase({
        anonymousId: anonymousId ?? undefined,
        transactionId,
        productIdentifier,
        packageIdentifier: selectedRevenueCatPackage.identifier,
        packId: selectedPack.id,
        purchasedAt,
        amount: selectedPack.price.amount,
        currencyCode: selectedPack.price.currencyCode,
        pricingTier: pricingContext.tierId,
        countryCode: pricingContext.countryCode,
      }) as { credits: number; diamondsAdded: number };

      setOptimisticCredits(fulfillment.credits);
      showCelebration(`Success! ${selectedPack.diamonds} Diamonds added to your account.`);
      onClose();
    } catch (error: any) {
      const wasCancelled = Boolean(error?.userCancelled);
      if (wasCancelled) {
        return;
      }

      const message = error instanceof Error ? error.message : "Purchase failed. Please try again.";
      setErrorMessage(message);
      showToast(message);
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <Pressable onPress={onClose} style={styles.overlay}>
        <Pressable onPress={() => undefined} style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.balanceCard}>
            <Text style={styles.eyebrow}>Credits</Text>
            <Text style={styles.title}>Current balance</Text>
            <View style={styles.balanceRow}>
              <View style={styles.balanceIconWrap}>
                <DiamondCreditIcon primaryColor={DIAMOND_PILL_BLUE} size={24} />
              </View>
              <View style={styles.balanceTextWrap}>
                <Text style={styles.balanceText}>{credits} Diamonds</Text>
                <Text style={styles.balanceHint}>
                  {hasPaidAccess
                    ? "PRO is active. Diamonds stay available for store purchases and future balance-based flows."
                    : "Every successful image generation uses 1 Diamond. Refill below anytime."}
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Get More Credits</Text>

          <View style={styles.cardsStack}>
            {pricingContext.visibleDiamondPacks.map((packPricing) => {
              const pack = CREDIT_PACK_UI[packPricing.id];
              const isSelected = packPricing.id === selectedPackId;

              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  key={packPricing.id}
                  onPress={() => {
                    triggerHaptic();
                    setSelectedPackId(packPricing.id);
                  }}
                  style={[styles.offerCard, isSelected ? styles.offerCardSelected : null]}
                >
                  <DiamondPile pile={pack.pile} />

                  <View style={styles.offerCopy}>
                    <View style={styles.offerTopRow}>
                      <Text style={styles.offerTitle}>{packPricing.title}</Text>
                      {pack.badge ? (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{pack.badge}</Text>
                        </View>
                      ) : null}
                    </View>

                    <Text style={styles.offerCount}>{packPricing.diamonds} Diamonds</Text>
                    <Text style={styles.offerPrice}>{packPricing.price.formatted}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <Pressable
            accessibilityRole="button"
            disabled={isLoadingPackages || isPurchasing}
            onPress={() => void handlePurchase()}
            style={[styles.primaryButton, isLoadingPackages || isPurchasing ? styles.primaryButtonDisabled : null]}
          >
            {isPurchasing ? (
              <>
                <ActivityIndicator color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Processing...</Text>
              </>
            ) : (
              <>
                <Text style={styles.primaryButtonText}>
                  {isLoadingPackages ? "Loading..." : `Buy Now${selectedPack ? ` - ${selectedPack.price.formatted}` : ""}`}
                </Text>
                <ArrowRight color="#FFFFFF" size={18} strokeWidth={2.4} />
              </>
            )}
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function DiamondPile({ pile }: { pile: CreditPack["pile"] }) {
  const config = {
    small: {
      width: 44,
      height: 34,
      items: [
        { size: 16, top: 10, left: 0, opacity: 0.9 },
        { size: 20, top: 4, left: 12, opacity: 1 },
        { size: 16, top: 12, left: 24, opacity: 0.82 },
      ],
    },
    medium: {
      width: 52,
      height: 38,
      items: [
        { size: 16, top: 14, left: 2, opacity: 0.82 },
        { size: 18, top: 4, left: 14, opacity: 0.92 },
        { size: 22, top: 10, left: 24, opacity: 1 },
        { size: 16, top: 18, left: 18, opacity: 0.72 },
      ],
    },
    large: {
      width: 62,
      height: 44,
      items: [
        { size: 18, top: 18, left: 2, opacity: 0.75 },
        { size: 22, top: 4, left: 12, opacity: 0.9 },
        { size: 24, top: 12, left: 24, opacity: 1 },
        { size: 20, top: 20, left: 38, opacity: 0.82 },
        { size: 16, top: 0, left: 34, opacity: 0.62 },
      ],
    },
  }[pile];

  return (
    <View style={[styles.diamondPile, { width: config.width, height: config.height }]}>
      {config.items.map((item, index) => (
        <View
          key={`${pile}-${index}`}
          style={{
            position: "absolute",
            top: item.top,
            left: item.left,
            opacity: item.opacity,
          }}
        >
          <DiamondCreditIcon primaryColor={DIAMOND_PILL_BLUE} size={item.size} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(2, 6, 23, 0.42)",
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  sheet: {
    ...surfaceCard("#FFFFFF"),
    ...organicRadii(28, 18),
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 18,
  },
  handle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(15, 23, 42, 0.12)",
    marginBottom: 4,
  },
  eyebrow: {
    color: DS.colors.textTertiary,
    ...DS.typography.label,
  },
  title: {
    color: DS.colors.textPrimary,
    ...DS.typography.cardTitle,
  },
  balanceCard: {
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    backgroundColor: DS.colors.surfaceHigh,
    ...organicRadii(24, 16),
    padding: 16,
    gap: 12,
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  balanceIconWrap: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    borderCurve: "continuous",
    backgroundColor: "rgba(29, 78, 216, 0.08)",
  },
  balanceTextWrap: {
    flex: 1,
    gap: 4,
  },
  balanceText: {
    color: DS.colors.textPrimary,
    ...fonts.bold,
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.5,
    fontVariant: ["tabular-nums"],
  },
  balanceHint: {
    color: DS.colors.textSecondary,
    ...DS.typography.bodySm,
  },
  sectionTitle: {
    color: DS.colors.textPrimary,
    ...fonts.bold,
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  cardsStack: {
    gap: 12,
  },
  offerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    backgroundColor: DS.colors.surfaceHigh,
    borderRadius: 20,
    borderCurve: "continuous",
    boxShadow: "0px 12px 28px rgba(15, 23, 42, 0.05)",
  },
  offerCardSelected: {
    borderWidth: 2,
    borderColor: DIAMOND_PILL_BLUE,
    boxShadow:
      "0px 14px 28px rgba(15, 23, 42, 0.08), 0px 0px 18px rgba(29, 78, 216, 0.16)",
  },
  diamondPile: {
    position: "relative",
    justifyContent: "center",
  },
  offerCopy: {
    flex: 1,
    gap: 4,
  },
  offerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  offerTitle: {
    flex: 1,
    color: DS.colors.textPrimary,
    ...fonts.bold,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  offerCount: {
    color: DIAMOND_PILL_BLUE,
    ...fonts.semibold,
    fontSize: 15,
    lineHeight: 20,
  },
  offerPrice: {
    color: DS.colors.textPrimary,
    ...fonts.semibold,
    fontSize: 14,
    lineHeight: 18,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    borderCurve: "continuous",
    backgroundColor: "rgba(229, 57, 53, 0.12)",
  },
  badgeText: {
    color: BUY_NOW_RUBY,
    ...DS.typography.label,
    letterSpacing: 1.2,
  },
  errorText: {
    color: BUY_NOW_RUBY,
    ...DS.typography.bodySm,
  },
  primaryButton: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 18,
    borderCurve: "continuous",
    backgroundColor: BUY_NOW_RUBY,
    boxShadow: "0px 14px 26px rgba(229, 57, 53, 0.24)",
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: DS.colors.textInverse,
    ...fonts.bold,
    fontSize: 16,
    lineHeight: 20,
  },
});
