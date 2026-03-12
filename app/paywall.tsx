import { useAuth } from "@clerk/expo";
import { useMutation } from "convex/react";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Purchases, { PurchasesPackage } from "react-native-purchases";
import { Check, Crown, Sparkles, Zap } from "lucide-react-native";

import { triggerHaptic } from "../lib/haptics";
import { hasProEntitlement } from "../lib/revenuecat";

const GALLERY_IMAGES = [
  require("../assets/media/comp-1.jpg"),
  require("../assets/media/comp-2.jpg"),
  require("../assets/media/comp-3.jpg"),
  require("../assets/media/comp-4.jpg"),
  require("../assets/media/comp-5.jpg"),
  require("../assets/media/comp-6.jpg"),
  require("../assets/media/render.jpg"),
];

const YEARLY_TOTAL = 484.99;
const WEEKLY_PRICE = 119.99;
const YEARLY_WEEKLY_EQUIV = (YEARLY_TOTAL / 52).toFixed(2);

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

  const galleryWidth = Math.min(280, Math.round(width * 0.72));
  const galleryHeight = Math.min(190, Math.round(galleryWidth * 0.68));
  const galleryGap = 14;
  const trackWidth = (galleryWidth + galleryGap) * GALLERY_IMAGES.length;
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    translateX.setValue(0);
    const animation = Animated.loop(
      Animated.timing(translateX, {
        toValue: -trackWidth,
        duration: 28000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    animation.start();
    return () => animation.stop();
  }, [trackWidth, translateX]);

  useEffect(() => {
    let active = true;
    const loadOfferings = async () => {
      try {
        const data = await Purchases.getOfferings();
        if (!active) return;        const current = data.current;
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
    triggerHaptic();
    setSelectedPlan(plan);
    if (plan === "weekly") {
      setTrialEnabled(false);
    }
  };

  const handleToggleTrial = (value: boolean) => {
    triggerHaptic();
    setTrialEnabled(value);
    if (value) {
      setSelectedPlan("yearly");
    }
  };

  const handlePurchase = async () => {
    triggerHaptic();
    setErrorMessage(null);

    const chosenPackage = trialEnabled || selectedPlan === "yearly" ? annualPackage : weeklyPackage;
    if (!chosenPackage) {
      setErrorMessage("We could not load your subscription options. Please try again.");
      return;
    }

    try {
      setIsLoading(true);
      const result = await Purchases.purchasePackage(chosenPackage);
      const hasPro = hasProEntitlement(result.customerInfo);

      if (hasPro && isSignedIn) {
        await setPlan({ plan: "pro" });
      }

      router.replace("/(tabs)");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Purchase cancelled.";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  const buttonLabel = trialEnabled ? "Try for Free" : "Continue";

  return (
    <View className="flex-1 bg-black">
      <ScrollView
        className="flex-1 bg-black"
        contentContainerStyle={{ paddingBottom: insets.bottom + 40, paddingTop: insets.top + 18 }}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View className="gap-10">
          <MotiView
            from={{ opacity: 0, translateY: 16 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 520 }}
            className="px-5"
          >
            <Text className="text-[11px] uppercase tracking-[3px] text-zinc-400">Darkor.ai Pro</Text>
            <View className="mt-2 flex-row items-center gap-2">
              <Crown color="#facc15" size={18} />
              <Text className="text-3xl font-semibold text-white">Unlock the Studio</Text>
            </View>
            <Text className="mt-3 text-sm text-zinc-400">
              Premium redesigns, instant iterations, and unlimited visual exports.
            </Text>
          </MotiView>

          <View className="relative">
            <View className="overflow-hidden">
              <Animated.View
                style={{
                  flexDirection: "row",
                  transform: [{ translateX }],
                  paddingLeft: 20,
                }}
              >
                {[...GALLERY_IMAGES, ...GALLERY_IMAGES].map((source, index) => (
                  <View key={`gallery-${index}`} style={{ marginRight: galleryGap }}>
                    <Image
                      source={source}
                      className="rounded-3xl border border-white/10"
                      style={{ width: galleryWidth, height: galleryHeight, borderCurve: "continuous" }}
                      contentFit="cover"
                    />
                  </View>
                ))}
              </Animated.View>
            </View>
            <View className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-black/70" />
            <View className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-black/70" />
          </View>

          <View className="gap-4 px-5">
            {[
              { label: "Faster Rendering", icon: Zap },
              { label: "Ad-free Experience", icon: Sparkles },
              { label: "Unlimited Design Renders", icon: Check },
            ].map((feature) => {
              const Icon = feature.icon;
              return (
                <View key={feature.label} className="flex-row items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <View className="h-9 w-9 items-center justify-center rounded-full bg-white/10">
                    <Icon color="#f8fafc" size={16} />
                  </View>
                  <Text className="text-sm font-semibold text-zinc-100">{feature.label}</Text>
                </View>
              );
            })}
          </View>

          <View className="gap-3 px-5">
            <Pressable
              onPress={() => handleSelectPlan("yearly")}
              className={`cursor-pointer rounded-3xl border px-5 py-4 ${
                selectedPlan === "yearly" ? "border-cyan-300/60 bg-cyan-400/10" : "border-white/10 bg-white/5"
              }`}
            >
              <View className="flex-row items-start justify-between">
                <View>
                  <Text className="text-base font-semibold text-white">Yearly</Text>
                  <Text className="mt-1 text-xs text-zinc-400">MAD {YEARLY_TOTAL.toFixed(2)} billed yearly</Text>
                </View>
                <View className="rounded-full bg-amber-400/20 px-3 py-1">
                  <Text className="text-[10px] font-semibold text-amber-200">BEST OFFER</Text>
                </View>
              </View>
              <Text className="mt-3 text-2xl font-semibold text-white">MAD {YEARLY_WEEKLY_EQUIV} / week</Text>
              {trialEnabled ? (
                <Text className="mt-1 text-xs text-cyan-200">3-day free trial included</Text>
              ) : null}
            </Pressable>

            <Pressable
              onPress={() => handleSelectPlan("weekly")}
              className={`cursor-pointer rounded-3xl border px-5 py-4 ${
                selectedPlan === "weekly" ? "border-white/40 bg-white/10" : "border-white/10 bg-white/5"
              }`}
            >
              <Text className="text-base font-semibold text-white">Weekly</Text>
              <Text className="mt-3 text-2xl font-semibold text-white">MAD {WEEKLY_PRICE.toFixed(2)} / week</Text>
            </Pressable>
          </View>

          <View className="flex-row items-center justify-between px-5">
            <View>
              <Text className="text-sm font-semibold text-white">Enable free trial</Text>
              <Text className="mt-1 text-xs text-zinc-500">Trial applies to Yearly plan</Text>
            </View>
            <Switch
              value={trialEnabled}
              onValueChange={handleToggleTrial}
              trackColor={{ false: "#27272a", true: "#22d3ee" }}
              thumbColor={trialEnabled ? "#f8fafc" : "#a1a1aa"}
              ios_backgroundColor="#27272a"
            />
          </View>

          {errorMessage ? (
            <Text className="px-5 text-xs text-rose-200">{errorMessage}</Text>
          ) : null}

          <View className="gap-3 px-5">
            <Pressable
              onPress={handlePurchase}
              disabled={isLoading}
              className={`cursor-pointer items-center rounded-2xl px-4 py-4 ${
                isLoading ? "bg-zinc-700" : "bg-white"
              }`}
            >
              <Text className={`text-sm font-semibold ${isLoading ? "text-zinc-300" : "text-black"}`}>
                {isLoading ? "Processing..." : buttonLabel}
              </Text>
            </Pressable>
            <Text className="text-center text-[11px] leading-5 text-zinc-500">
              Subscription auto-renews. Cancel anytime in your App Store or Google Play settings.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}





