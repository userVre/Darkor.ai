import { useAuth } from "@clerk/expo";
import { useMutation } from "convex/react";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  FlatList,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Purchases, { PurchasesPackage } from "react-native-purchases";
import { ArrowRight, Check, ShieldCheck, X } from "lucide-react-native";

import { triggerHaptic } from "../lib/haptics";
import { hasProEntitlement } from "../lib/revenuecat";

const GALLERY_IMAGES = [
  require("../assets/media/luxury-1.jpg"),
  require("../assets/media/luxury-2.jpg"),
  require("../assets/media/luxury-3.jpg"),
  require("../assets/media/luxury-4.jpg"),
  require("../assets/media/luxury-5.jpg"),
  require("../assets/media/luxury-6.jpg"),
  require("../assets/media/luxury-7.jpg"),
];

const YEARLY_TOTAL = 484.99;
const WEEKLY_PRICE = 119.99;
const YEARLY_WEEKLY_EQUIV = (YEARLY_TOTAL / 52).toFixed(2);
const PRO_CREDITS_GRANT = 100;

const FEATURES = ["Faster Rendering", "Ad-free Experience", "Unlimited Design Renders"];

const stagger = (index: number) => ({
  from: { opacity: 0, translateY: 16 },
  animate: { opacity: 1, translateY: 0 },
  transition: { type: "timing", duration: 420, delay: 140 + index * 90 },
});

export default function PaywallScreen() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const setPlan = useMutation("users:setPlanFromRevenueCat" as any);

  const [annualPackage, setAnnualPackage] = useState<PurchasesPackage | null>(null);
  const [weeklyPackage, setWeeklyPackage] = useState<PurchasesPackage | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<"yearly" | "weekly">("yearly");
  const [trialEnabled, setTrialEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const galleryWidth = Math.min(320, Math.round(width * 0.76));
  const galleryHeight = Math.round(galleryWidth * 0.64);
  const galleryGap = 14;
  const itemSize = galleryWidth + galleryGap;
  const baseCount = GALLERY_IMAGES.length;
  const loopImages = useMemo(
    () => [...GALLERY_IMAGES, ...GALLERY_IMAGES, ...GALLERY_IMAGES],
    [],
  );
  const initialOffset = baseCount * itemSize;
  const scrollX = useRef(new Animated.Value(0)).current;
  const listRef = useRef<FlatList<number>>(null);

  useEffect(() => {
    const id = setTimeout(() => {
      listRef.current?.scrollToOffset({ offset: initialOffset, animated: false });
    }, 0);
    return () => clearTimeout(id);
  }, [initialOffset]);

  useEffect(() => {
    let mounted = true;
    const listenerId = scrollX.addListener(({ value }) => {
      if (!mounted) return;
      listRef.current?.scrollToOffset({ offset: value, animated: false });
    });

    const startLoop = () => {
      scrollX.setValue(initialOffset);
      Animated.timing(scrollX, {
        toValue: initialOffset + baseCount * itemSize,
        duration: baseCount * 3800,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished && mounted) {
          startLoop();
        }
      });
    };

    startLoop();

    return () => {
      mounted = false;
      scrollX.stopAnimation();
      scrollX.removeListener(listenerId);
    };
  }, [baseCount, initialOffset, itemSize, scrollX]);

  useEffect(() => {
    let active = true;
    const loadOfferings = async () => {
      try {
        const data = await Purchases.getOfferings();
        if (!active) return;
        const current = data.current;
        const available = current?.availablePackages ?? [];
        const annual = current?.annual ?? available.find((pkg) => pkg.packageType === Purchases.PACKAGE_TYPE.ANNUAL);
        const weekly = current?.weekly ?? available.find((pkg) => pkg.packageType === Purchases.PACKAGE_TYPE.WEEKLY);
        setAnnualPackage(annual ?? null);
        setWeeklyPackage(weekly ?? null);
      } catch (error) {
        if (active) {
          setErrorMessage("Subscriptions are temporarily unavailable.");
        }
      }
    };

    void loadOfferings();
    return () => {
      active = false;
    };
  }, []);

  const handleSelectPlan = (plan: "yearly" | "weekly") => {
    if (trialEnabled && plan === "weekly") return;
    triggerHaptic();
    setSelectedPlan(plan);
  };

  const handleToggleTrial = (value: boolean) => {
    triggerHaptic();
    setTrialEnabled(value);
    if (value) {
      setSelectedPlan("yearly");
    }
  };

  const handleRestore = async () => {
    triggerHaptic();
    setErrorMessage(null);
    try {
      setIsLoading(true);
      const info = await Purchases.restorePurchases();
      const hasPro = hasProEntitlement(info);
      if (hasPro && isSignedIn) {
        await setPlan({ plan: "pro", credits: PRO_CREDITS_GRANT });
      }
      if (hasPro) {
        router.replace("/(tabs)");
      }
    } catch (error) {
      Alert.alert("Restore failed", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    triggerHaptic();
    router.back();
  };

  const handlePurchase = async () => {
    triggerHaptic();
    setErrorMessage(null);

    const chosenPackage = trialEnabled || selectedPlan === "yearly" ? annualPackage : weeklyPackage;
    if (!chosenPackage) {
      const message = "We could not load your subscription options. Please try again.";
      setErrorMessage(message);
      Alert.alert("Purchase Error", message);
      return;
    }

    try {
      setIsLoading(true);
      const result = await Purchases.purchasePackage(chosenPackage);
      const hasPro = hasProEntitlement(result.customerInfo);

      if (hasPro && isSignedIn) {
        await setPlan({ plan: "pro", credits: PRO_CREDITS_GRANT });
      }

      router.replace("/(tabs)");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Purchase cancelled.";
      setErrorMessage(message);
      Alert.alert("Purchase Error", message);
    } finally {
      setIsLoading(false);
    }
  };

  const buttonLabel = trialEnabled ? "Try for Free" : "Continue";
  const trialCopy = "3-DAYS FREE TRIAL then MAD 119.99 per week";

  const renderItem = useCallback(
    ({ item }: { item: number }) => (
      <View style={{ marginRight: galleryGap }}>
        <Image
          source={item}
          className="rounded-3xl border border-white/10"
          style={{ width: galleryWidth, height: galleryHeight, borderCurve: "continuous" }}
          contentFit="cover"
        />
      </View>
    ),
    [galleryGap, galleryHeight, galleryWidth],
  );

  const getItemLayout = useCallback(
    (_: ArrayLike<number> | null | undefined, index: number) => ({
      length: itemSize,
      offset: itemSize * index,
      index,
    }),
    [itemSize],
  );

  return (
    <View className="flex-1 bg-black" style={{ backgroundColor: "#000000" }}>
      <ScrollView
        className="flex-1 bg-black"
        style={{ backgroundColor: "#000000" }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 36, paddingTop: insets.top + 10 }}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View className="gap-8">
          <MotiView {...stagger(0)} className="flex-row items-center justify-between px-5">
            <Pressable onPress={handleRestore} className="cursor-pointer">
              <Text className="text-sm font-semibold text-zinc-200">Restore</Text>
            </Pressable>
            <Pressable onPress={handleClose} className="cursor-pointer h-9 w-9 items-center justify-center rounded-full bg-white/10">
              <X color="#f4f4f5" size={16} />
            </Pressable>
          </MotiView>

          <View className="relative">
            <FlatList
              ref={listRef}
              data={loopImages}
              horizontal
              keyExtractor={(_, index) => `gallery-${index}`}
              scrollEnabled={false}
              showsHorizontalScrollIndicator={false}
              renderItem={renderItem}
              getItemLayout={getItemLayout}
              contentContainerStyle={{ paddingHorizontal: 20 }}
              initialNumToRender={baseCount}
              windowSize={5}
              removeClippedSubviews
            />
            <View className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-black/80" />
            <View className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-black/80" />
          </View>

          <MotiView {...stagger(1)} className="px-5">
            <Text className="text-[11px] uppercase tracking-[3px] text-zinc-400">Darkor.ai Pro</Text>
            <Text className="mt-2 text-3xl font-semibold text-white">Unlock the Studio</Text>
            <Text className="mt-3 text-sm text-zinc-400">Premium redesigns, instant iterations, and unlimited visual exports.</Text>
          </MotiView>

          <View className="gap-3 px-5">
            {FEATURES.map((feature, index) => (
              <MotiView key={feature} {...stagger(index + 2)}>
                <View className="flex-row items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <View className="h-9 w-9 items-center justify-center rounded-full bg-white/10">
                    <Check color="#f8fafc" size={16} />
                  </View>
                  <Text className="text-sm font-semibold text-zinc-100">{feature}</Text>
                </View>
              </MotiView>
            ))}
          </View>

          <MotiView {...stagger(5)} className="gap-4 px-5">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-sm font-semibold text-white">Free trial enabled</Text>
                <Text className="mt-1 text-xs text-zinc-500">Applies to Yearly Access</Text>
              </View>
              <Switch
                value={trialEnabled}
                onValueChange={handleToggleTrial}
                trackColor={{ false: "#27272a", true: "#f43f5e" }}
                thumbColor={trialEnabled ? "#f8fafc" : "#a1a1aa"}
                ios_backgroundColor="#27272a"
              />
            </View>

            {trialEnabled ? (
              <View className="gap-2">
                <Text className="text-sm font-semibold text-white">{trialCopy}</Text>
                <View className="flex-row items-center gap-2">
                  <ShieldCheck color="#22d3ee" size={14} />
                  <Text className="text-xs font-semibold text-cyan-200">No Payment Now</Text>
                </View>
              </View>
            ) : null}
          </MotiView>

          <MotiView {...stagger(6)} className="gap-3 px-5">
            <Pressable
              onPress={() => handleSelectPlan("yearly")}
              className={`cursor-pointer rounded-3xl border px-5 py-4 ${
                selectedPlan === "yearly" ? "border-fuchsia-400/70 bg-fuchsia-500/10" : "border-white/10 bg-white/5"
              }`}
            >
              <View className="flex-row items-start justify-between">
                <Text className="text-sm font-semibold text-zinc-200">YEARLY ACCESS</Text>
                <View className="rounded-full bg-amber-400/20 px-3 py-1">
                  <Text className="text-[10px] font-semibold text-amber-200">BEST OFFER</Text>
                </View>
              </View>
              <Text className="mt-3 text-2xl font-semibold text-white">MAD {YEARLY_WEEKLY_EQUIV} / week</Text>
              <Text className="mt-1 text-xs text-zinc-400">Just MAD {YEARLY_TOTAL.toFixed(2)} per year</Text>
            </Pressable>

            <Pressable
              onPress={() => handleSelectPlan("weekly")}
              disabled={trialEnabled}
              className={`cursor-pointer rounded-3xl border px-5 py-4 ${
                selectedPlan === "weekly" ? "border-white/40 bg-white/10" : "border-white/10 bg-white/5"
              } ${trialEnabled ? "opacity-50" : "opacity-100"}`}
            >
              <Text className="text-sm font-semibold text-zinc-200">WEEKLY ACCESS</Text>
              <Text className="mt-3 text-2xl font-semibold text-white">MAD {WEEKLY_PRICE.toFixed(2)} / week</Text>
            </Pressable>
          </MotiView>

          {errorMessage ? (
            <Text className="px-5 text-xs text-rose-200">{errorMessage}</Text>
          ) : null}

          <MotiView {...stagger(7)} className="gap-3 px-5">
            <Pressable onPress={handlePurchase} disabled={isLoading} className="cursor-pointer" style={{ opacity: isLoading ? 0.8 : 1 }}>
              <LinearGradient
                colors={["#f43f5e", "#d946ef"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ borderRadius: 22, paddingVertical: 16, paddingHorizontal: 18, alignItems: "center" }}
              >
                {isLoading ? (
                  <View className="flex-row items-center gap-2">
                    <ActivityIndicator color="#ffffff" />
                    <Text className="text-sm font-semibold text-white">Processing...</Text>
                  </View>
                ) : (
                  <View className="flex-row items-center gap-2">
                    <Text className="text-sm font-semibold text-white">{buttonLabel}</Text>
                    <ArrowRight color="#ffffff" size={16} />
                  </View>
                )}
              </LinearGradient>
            </Pressable>
            <Text className="text-center text-[11px] leading-5 text-zinc-500">
              Subscription auto-renews. Cancel anytime in your App Store or Google Play settings.
            </Text>
          </MotiView>
        </View>
      </ScrollView>
    </View>
  );
}
