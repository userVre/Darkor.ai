import { useAuth, useUser } from "@clerk/clerk-expo";
import { useQuery } from "convex/react";
import * as WebBrowser from "expo-web-browser";
import { Pressable, ScrollView, Text, View } from "react-native";

import { PLAN_PRICING, planTitle, type PlanKey } from "@/lib/pricing";

type MeResponse = {
  plan: "free" | PlanKey;
  credits: number;
};

export default function SettingsScreen() {
  const { signOut, isSignedIn } = useAuth();
  const { user } = useUser();
  const me = useQuery("users:me" as any, isSignedIn ? {} : "skip") as MeResponse | null | undefined;

  const openBilling = async () => {
    const portalUrl = process.env.EXPO_PUBLIC_POLAR_PORTAL_URL;
    if (!portalUrl) return;
    await WebBrowser.openBrowserAsync(portalUrl);
  };

  return (
    <ScrollView className="flex-1 bg-zinc-950" contentContainerStyle={{ padding: 20, paddingTop: 60, paddingBottom: 120 }}>
      <Text className="text-3xl font-bold text-zinc-100">Settings & Billing</Text>

      <View className="mt-5 rounded-3xl border border-white/10 bg-zinc-900 p-5">
        <Text className="text-zinc-300">Signed in as</Text>
        <Text className="mt-1 text-base font-semibold text-zinc-100">{user?.primaryEmailAddress?.emailAddress ?? "Guest"}</Text>
        <Text className="mt-4 text-zinc-300">Current Plan</Text>
        <Text className="mt-1 text-xl font-semibold text-zinc-100">
          {me?.plan && me.plan !== "free" ? planTitle(me.plan) : "Free"}
        </Text>
        <Text className="mt-2 text-zinc-400">Credits available: {me?.credits ?? 0}</Text>
      </View>

      <View className="mt-4 rounded-3xl border border-white/10 bg-zinc-900 p-5">
        <Text className="text-base font-semibold text-zinc-100">Plan Credits</Text>
        {(["pro", "premium", "ultra"] as PlanKey[]).map((plan) => (
          <Text key={plan} className="mt-2 text-zinc-400">
            {planTitle(plan)}: {PLAN_PRICING[plan].credits} credits/month
          </Text>
        ))}
      </View>

      <Pressable onPress={() => void openBilling()} className="mt-6 rounded-2xl bg-cyan-400 px-4 py-4">
        <Text className="text-center text-base font-semibold text-zinc-900">Manage Billing</Text>
      </Pressable>

      {isSignedIn ? (
        <Pressable onPress={() => void signOut()} className="mt-3 rounded-2xl border border-white/20 px-4 py-4">
          <Text className="text-center text-base font-semibold text-zinc-200">Sign out</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}
