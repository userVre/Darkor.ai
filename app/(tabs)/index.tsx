import { useAuth, useUser } from "@clerk/expo";
import { useRouter } from "expo-router";
import { MotiImage } from "moti";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedScrollHandler, useSharedValue } from "react-native-reanimated";

import ComparisonGrid from "../../components/comparison-grid";
import Logo from "../../components/logo";
import ScrollReveal from "../../components/scroll-reveal";
import AiServices from "../../components/sections/ai-services";
import WallOfLove from "../../components/wall-of-love";
import { getPriceId, PLAN_PRICING, planTitle, type BillingCycle, type PlanKey } from "../../lib/pricing";
import { openPolarCheckout } from "../../lib/polar";
import { saveSubscriptionIntent } from "../../lib/subscription-intent";
import HeroTransformation from "../_components/HeroTransformation";
import OutdoorTransformation from "../_components/OutdoorTransformation";

const media = {
  sketch: require("../../assets/media/sketch.jpg"),
  render: require("../../assets/media/render.jpg"),
  stagingBefore: require("../../assets/media/staging-before.jpg"),
  stagingAfter: require("../../assets/media/staging-after.jpg"),
};

const plans: PlanKey[] = ["pro", "premium", "ultra"];

export default function HomeScreen() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);
  const scrollY = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const pricingCards = useMemo(
    () =>
      plans.map((plan) => {
        const price = PLAN_PRICING[plan];
        const current = cycle === "monthly" ? price.monthly : price.yearly;
        return {
          plan,
          title: planTitle(plan),
          current,
          monthlyDisplay: cycle === "yearly" ? price.yearlyMonthlyDisplay : price.monthly,
          credits: price.credits,
          priceId: getPriceId(plan, cycle),
        };
      }),
    [cycle],
  );

  const handleSubscribe = async (plan: PlanKey, priceId: string) => {
    setLoadingPlan(plan);
    const intent = { planName: plan, priceId, billingCycle: cycle };

    try {
      if (!isSignedIn || !user?.id) {
        await saveSubscriptionIntent(intent);
        router.push("/sign-in");
        return;
      }

      await openPolarCheckout(user.id, intent);
    } catch (error) {
      console.error("Subscription flow failed", error);
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleStart = () => {
    if (isSignedIn) {
      router.push("/workspace");
      return;
    }
    router.push("/sign-up");
  };

  const handleLogin = () => {
    router.push("/sign-in");
  };

  const handleServiceCta = (serviceId: string) => {
    router.push({ pathname: "/wizard", params: { service: serviceId } });
  };

  return (
    <Animated.ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      onScroll={onScroll}
      scrollEventThrottle={16}
      contentInsetAdjustmentBehavior="automatic"
    >
      <ScrollReveal scrollY={scrollY}>
        <View className="px-5 pt-10">
          <Logo width={44} height={44} />
          <Text className="mt-3 text-4xl font-bold leading-tight text-zinc-100">AI staging that sells faster.</Text>
          <Text className="mt-3 text-base text-zinc-400">
            Native mobile studio for before/after redesigns, gallery history, and one-tap billing.
          </Text>

          <View className="mt-6 flex-row gap-3">
            <Pressable onPress={handleStart} className="flex-1 rounded-2xl bg-cyan-400 px-4 py-4" style={styles.glowCta}>
              <Text className="text-center text-base font-semibold text-zinc-900">Start for Free</Text>
            </Pressable>
            <Pressable onPress={handleLogin} className="flex-1 rounded-2xl border border-white/15 px-4 py-4">
              <Text className="text-center text-base font-semibold text-zinc-100">Login</Text>
            </Pressable>
          </View>
        </View>
      </ScrollReveal>

      <ScrollReveal scrollY={scrollY}>
        <HeroTransformation />
      </ScrollReveal>

      <ScrollReveal scrollY={scrollY}>
        <View className="mt-6 px-5">
          <OutdoorTransformation />
        </View>
      </ScrollReveal>

      <ScrollReveal scrollY={scrollY}>
        <View className="mt-6 gap-4 px-5">
          <View className="rounded-3xl border border-white/10 bg-zinc-900 p-4" style={styles.cardGlow}>
            <Text className="mb-3 text-base font-semibold text-zinc-100">Sketch2Image</Text>
            <View className="flex-row gap-2">
              <MotiImage source={media.sketch} className="h-36 flex-1 rounded-2xl border border-white/5" resizeMode="cover" />
              <MotiImage source={media.render} className="h-36 flex-1 rounded-2xl border border-white/5" resizeMode="cover" />
            </View>
          </View>

          <View className="rounded-3xl border border-white/10 bg-zinc-900 p-4" style={styles.cardGlow}>
            <Text className="mb-3 text-base font-semibold text-zinc-100">Virtual Staging</Text>
            <View className="flex-row gap-2">
              <MotiImage source={media.stagingBefore} className="h-36 flex-1 rounded-2xl border border-white/5" resizeMode="cover" />
              <MotiImage source={media.stagingAfter} className="h-36 flex-1 rounded-2xl border border-white/5" resizeMode="cover" />
            </View>
          </View>
        </View>
      </ScrollReveal>

      <AiServices scrollY={scrollY} onCtaPress={handleServiceCta} />

      <ScrollReveal scrollY={scrollY}>
        <ComparisonGrid scrollY={scrollY} />
      </ScrollReveal>

      <ScrollReveal scrollY={scrollY}>
        <WallOfLove />
      </ScrollReveal>

      <ScrollReveal scrollY={scrollY}>
        <View className="mt-10 px-5">
          <View className="mb-4 flex-row rounded-2xl border border-white/10 bg-zinc-900 p-1" style={styles.cardGlow}>
            <Pressable
              onPress={() => setCycle("monthly")}
              className={`flex-1 rounded-xl px-4 py-3 ${cycle === "monthly" ? "bg-white" : "bg-transparent"}`}
            >
              <Text className={`text-center font-semibold ${cycle === "monthly" ? "text-zinc-900" : "text-zinc-300"}`}>
                Monthly
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setCycle("yearly")}
              className={`flex-1 rounded-xl px-4 py-3 ${cycle === "yearly" ? "bg-white" : "bg-transparent"}`}
            >
              <Text className={`text-center font-semibold ${cycle === "yearly" ? "text-zinc-900" : "text-zinc-300"}`}>
                Yearly
              </Text>
            </Pressable>
          </View>

          {pricingCards.map((card) => (
            <View key={card.plan} className="mb-3 rounded-3xl border border-white/10 bg-zinc-900 p-5" style={styles.cardGlow}>
              <Text className="text-xl font-semibold text-zinc-100">{card.title}</Text>
              <Text className="mt-2 text-zinc-400">{card.credits} monthly credits</Text>
              <Text className="mt-4 text-3xl font-bold text-zinc-100">${card.current}</Text>
              <Text className="text-zinc-400">
                {cycle === "monthly" ? "/month" : `/year ($${card.monthlyDisplay.toFixed(2)}/mo)`}
              </Text>

              <Pressable
                onPress={() => void handleSubscribe(card.plan, card.priceId)}
                className="mt-4 rounded-2xl bg-cyan-400 px-4 py-4"
                style={styles.glowCta}
              >
                <Text className="text-center text-base font-semibold text-zinc-900">
                  {loadingPlan === card.plan ? "Opening checkout..." : "Subscribe"}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      </ScrollReveal>

      <ScrollReveal scrollY={scrollY}>
        <View style={styles.footerBrand}>
          <Logo size={56} />
        </View>
      </ScrollReveal>
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#09090b",
  },
  content: {
    paddingBottom: 140,
  },
  cardGlow: {
    shadowColor: "#0ea5e9",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  footerBrand: {
    paddingHorizontal: 20,
    paddingVertical: 32,
    alignItems: "center",
  },
  glowCta: {
    shadowColor: "#22d3ee",
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 16,
  },
});


