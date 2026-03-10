import { useAuth, useUser } from "@clerk/expo";
import { useRouter } from "expo-router";
import { MotiImage, MotiView } from "moti";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { getPriceId, PLAN_PRICING, planTitle, type BillingCycle, type PlanKey } from "@/lib/pricing";
import { openPolarCheckout } from "@/lib/polar";
import { saveSubscriptionIntent } from "@/lib/subscription-intent";
import HeroTransformation from "@/app/components/HeroTransformation";
import OutdoorTransformation from "@/app/components/OutdoorTransformation";

const media = {
  sketch: require("../../assets/media/sketch.jpg"),
  render: require("../../assets/media/render.jpg"),
  stagingBefore: require("../../assets/media/staging-before.jpg"),
  stagingAfter: require("../../assets/media/staging-after.jpg"),
  comp1: require("../../assets/media/comp-1.jpg"),
  comp2: require("../../assets/media/comp-2.jpg"),
  comp3: require("../../assets/media/comp-3.jpg"),
  comp4: require("../../assets/media/comp-4.jpg"),
  comp5: require("../../assets/media/comp-5.jpg"),
  comp6: require("../../assets/media/comp-6.jpg"),
};

const plans: PlanKey[] = ["pro", "premium", "ultra"];

export default function HomeScreen() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);

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

  return (
    <ScrollView className="flex-1 bg-zinc-950" contentContainerStyle={{ paddingBottom: 120 }}>
      <View className="px-5 pt-16">
        <Text className="text-xs uppercase tracking-[3px] text-cyan-300">Darkor.ai</Text>
        <Text className="mt-3 text-4xl font-bold leading-tight text-zinc-100">AI staging that sells faster.</Text>
        <Text className="mt-3 text-base text-zinc-400">
          Native mobile studio for before/after redesigns, gallery history, and one-tap billing.
        </Text>
      </View>

      <HeroTransformation />

      <View className="mt-8 gap-4 px-5">
        <OutdoorTransformation />
        {[
          { title: "Sketch2Image", before: media.sketch, after: media.render },
                    { title: "Virtual Staging", before: media.stagingBefore, after: media.stagingAfter },
        ].map((section, idx) => (
          <MotiView
            key={section.title}
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: 150 * idx }}
            className="rounded-3xl border border-white/10 bg-zinc-900 p-3"
          >
            <Text className="mb-3 text-base font-semibold text-zinc-100">{section.title}</Text>
            <View className="flex-row gap-2">
              <MotiImage source={section.before} className="h-36 flex-1 rounded-2xl border border-white/5" resizeMode="cover" />
              <MotiImage source={section.after} className="h-36 flex-1 rounded-2xl border border-white/5" resizeMode="cover" />
            </View>
          </MotiView>
        ))}
      </View>

      <View className="mt-8 px-5">
        <Text className="mb-3 text-base font-semibold text-zinc-100">Comparison Grid</Text>
        <View className="flex-row flex-wrap justify-between gap-y-3">
          {[media.comp1, media.comp2, media.comp3, media.comp4, media.comp5, media.comp6].map((img, idx) => (
            <MotiImage key={idx} source={img} className="h-28 w-[48.5%] rounded-2xl border border-white/5" resizeMode="cover" />
          ))}
        </View>
      </View>

      <View className="mt-10 px-5">
        <View className="mb-4 flex-row rounded-2xl border border-white/10 bg-zinc-900 p-1">
          <Pressable
            onPress={() => setCycle("monthly")}
            className={`flex-1 rounded-xl px-4 py-3 ${cycle === "monthly" ? "bg-white" : "bg-transparent"}`}
          >
            <Text className={`text-center font-semibold ${cycle === "monthly" ? "text-zinc-900" : "text-zinc-300"}`}>Monthly</Text>
          </Pressable>
          <Pressable
            onPress={() => setCycle("yearly")}
            className={`flex-1 rounded-xl px-4 py-3 ${cycle === "yearly" ? "bg-white" : "bg-transparent"}`}
          >
            <Text className={`text-center font-semibold ${cycle === "yearly" ? "text-zinc-900" : "text-zinc-300"}`}>Yearly</Text>
          </Pressable>
        </View>

        {pricingCards.map((card) => (
          <View key={card.plan} className="mb-3 rounded-3xl border border-white/10 bg-zinc-900 p-5">
            <Text className="text-xl font-semibold text-zinc-100">{card.title}</Text>
            <Text className="mt-2 text-zinc-400">{card.credits} monthly credits</Text>
            <Text className="mt-4 text-3xl font-bold text-zinc-100">${card.current}</Text>
            <Text className="text-zinc-400">{cycle === "monthly" ? "/month" : `/year ($${card.monthlyDisplay.toFixed(2)}/mo)`}</Text>

            <Pressable
              onPress={() => void handleSubscribe(card.plan, card.priceId)}
              className="mt-4 rounded-2xl bg-cyan-400 px-4 py-4"
            >
              <Text className="text-center text-base font-semibold text-zinc-900">
                {loadingPlan === card.plan ? "Opening checkout..." : "Subscribe"}
              </Text>
            </Pressable>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}







