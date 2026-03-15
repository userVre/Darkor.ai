import { useAuth, useUser } from "@clerk/expo";
import { useMutation } from "convex/react";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Switch,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Carousel from "react-native-reanimated-carousel";
import { ArrowRight, Check, ShieldCheck, X } from "lucide-react-native";

import { triggerHaptic } from "../lib/haptics";
import {
  configureRevenueCat,
  getRevenueCatClient,
  hasProEntitlement,
  type RevenueCatPackage,
  type RevenueCatPurchases,
} from "../lib/revenuecat";
import { staggerFadeUp } from "../lib/motion";
import { LuxPressable } from "../components/lux-pressable";

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

export default function PaywallScreen() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const setPlan = useMutation("users:setPlanFromRevenueCat" as any);

  const [annualPackage, setAnnualPackage] = useState<RevenueCatPackage | null>(null);
  const [weeklyPackage, setWeeklyPackage] = useState<RevenueCatPackage | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<"yearly" | "weekly">("yearly");
  const [trialEnabled, setTrialEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const purchasesRef = useRef<RevenueCatPurchases | null>(null);

  const galleryWidth = Math.min(320, Math.round(width * 0.76));
  const galleryHeight = Math.round(galleryWidth * 0.64);

  useEffect(() => {
    console.log("[Screen] Paywall mounted");
    return () => console.log("[Screen] Paywall unmounted");
  }, []);

  useEffect(() => {
    let active = true;
    const loadOfferings = async () => {
      try {
        const cached = getRevenueCatClient();
        if (cached) {
          purchasesRef.current = cached;
        } else {
          const configured = await configureRevenueCat(isSignedIn ? user?.id ?? null : null);
          purchasesRef.current = configured;
        }
        if (!active) return;
        if (!purchasesRef.current) {
          setErrorMessage("Subscriptions are temporarily unavailable.");
          return;
        }
        const data = await purchasesRef.current.getOfferings();
        if (!active) return;
        const current = data.current;
        const available = current?.availablePackages ?? [];
        const annual =
          current?.annual ??
          available.find((pkg) => pkg.packageType === purchasesRef.current?.PACKAGE_TYPE.ANNUAL);
        const weekly =
          current?.weekly ??
          available.find((pkg) => pkg.packageType === purchasesRef.current?.PACKAGE_TYPE.WEEKLY);
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
  }, [isSignedIn, user?.id]);

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
      if (!purchasesRef.current) {
        Alert.alert("Restore failed", "Subscriptions are not available on this build.");
        return;
      }
      setIsLoading(true);
      const info = await purchasesRef.current.restorePurchases();
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
      if (!purchasesRef.current) {
        Alert.alert("Purchase Error", "Subscriptions are not available on this build.");
        return;
      }
      setIsLoading(true);
      const result = await purchasesRef.current.purchasePackage(chosenPackage);
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

  return (
    <View className="flex-1 bg-black" style={{ backgroundColor: "#000000" }}>
      <ScrollView
        className="flex-1 bg-black"
        style={{ backgroundColor: "#000000" }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 36, paddingTop: insets.top + 10 }}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View className="gap-8">
          <MotiView {...staggerFadeUp(0)} className="flex-row items-center justify-between px-5">
            <LuxPressable onPress={handleRestore} className="rounded-full px-2 py-1">
              <Text className="text-sm font-semibold text-zinc-200">Restore</Text>
            </LuxPressable>
            <LuxPressable onPress={handleClose} className="h-9 w-9 items-center justify-center rounded-full bg-white/10">
              <X color="#f4f4f5" size={16} />
            </LuxPressable>
          </MotiView>

          <View className="relative">
            <Carousel
              width={galleryWidth}
              height={galleryHeight}
              data={GALLERY_IMAGES}
              autoPlay
              autoPlayInterval={0}
              scrollAnimationDuration={3600}
              loop
              style={{ width }}
              mode="parallax"
              panGestureHandlerProps={{ enabled: false }}
              renderItem={({ item }) => (
                <View className="px-2">
                  <Image
                    source={item}
                    className="rounded-3xl border border-white/10"
                    style={{ width: galleryWidth, height: galleryHeight, borderCurve: "continuous", borderWidth: 0.5 }}
                    contentFit="cover"
                  />
                </View>
              )}
            />
            <View className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-black/80" />
            <View className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-black/80" />
          </View>

          <MotiView {...staggerFadeUp(1)} className="px-5">
            <Text className="text-[11px] uppercase tracking-[3px] text-zinc-400">Darkor.ai Pro</Text>
            <Text className="mt-2 text-3xl font-medium text-white">Unlock the Studio</Text>
            <Text className="mt-3 text-sm text-zinc-400">Premium redesigns, instant iterations, and unlimited visual exports.</Text>
          </MotiView>

          <View className="gap-3 px-5">
            {FEATURES.map((feature, index) => (
              <MotiView key={feature} {...staggerFadeUp(index + 2)}>
                <BlurView
                  intensity={85}
                  tint="dark"
                  className="flex-row items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                  style={{ borderWidth: 0.5, borderCurve: "continuous" }}
                >
                  <View className="h-9 w-9 items-center justify-center rounded-full bg-white/10">
                    <Check color="#f8fafc" size={16} />
                  </View>
                  <Text className="text-sm font-semibold text-zinc-100">{feature}</Text>
                </BlurView>
              </MotiView>
            ))}
          </View>

          <MotiView {...staggerFadeUp(5)} className="gap-4 px-5">
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
                style={{ cursor: "pointer" }}
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

          <MotiView {...staggerFadeUp(6)} className="gap-3 px-5">
            <LuxPressable
              onPress={() => handleSelectPlan("yearly")}
              className={`overflow-hidden rounded-3xl border px-5 py-4 ${
                selectedPlan === "yearly" ? "border-fuchsia-400/70 bg-fuchsia-500/10" : "border-white/10 bg-white/5"
              }`}
              style={{ borderWidth: 0.5 }}
            >
              <BlurView intensity={90} tint="dark" className="absolute inset-0" />
              <View className="flex-row items-start justify-between">
                <Text className="text-sm font-semibold text-zinc-200">YEARLY ACCESS</Text>
                <View className="rounded-full bg-amber-400/20 px-3 py-1">
                  <Text className="text-[10px] font-semibold text-amber-200">BEST OFFER</Text>
                </View>
              </View>
              <Text className="mt-3 text-2xl font-semibold text-white">MAD {YEARLY_WEEKLY_EQUIV} / week</Text>
              <Text className="mt-1 text-xs text-zinc-400">Just MAD {YEARLY_TOTAL.toFixed(2)} per year</Text>
            </LuxPressable>

            <LuxPressable
              onPress={() => handleSelectPlan("weekly")}
              disabled={trialEnabled}
              className={`overflow-hidden rounded-3xl border px-5 py-4 ${
                selectedPlan === "weekly" ? "border-white/40 bg-white/10" : "border-white/10 bg-white/5"
              } ${trialEnabled ? "opacity-50" : "opacity-100"}`}
              style={{ borderWidth: 0.5 }}
            >
              <BlurView intensity={90} tint="dark" className="absolute inset-0" />
              <Text className="text-sm font-semibold text-zinc-200">WEEKLY ACCESS</Text>
              <Text className="mt-3 text-2xl font-semibold text-white">MAD {WEEKLY_PRICE.toFixed(2)} / week</Text>
            </LuxPressable>
          </MotiView>

          {errorMessage ? (
            <Text className="px-5 text-xs text-rose-200">{errorMessage}</Text>
          ) : null}

          <MotiView {...staggerFadeUp(7)} className="gap-3 px-5">
            <LuxPressable onPress={handlePurchase} disabled={isLoading} className="rounded-[22px]" style={{ opacity: isLoading ? 0.8 : 1 }}>
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
            </LuxPressable>
            <Text className="text-center text-[11px] leading-5 text-zinc-500">
              Subscription auto-renews. Cancel anytime in your App Store or Google Play settings.
            </Text>
          </MotiView>
        </View>
      </ScrollView>
    </View>
  );
}







