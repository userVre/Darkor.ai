import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ScrollView, Text, View } from "react-native";
import { ChevronLeft, CircleHelp } from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { LuxPressable } from "../components/lux-pressable";
import { triggerHaptic } from "../lib/haptics";

const FAQ_ITEMS = [
  {
    question: "How do credits work in Darkor.ai?",
    answer: "Each redesign uses credits based on the workflow and export quality you choose. Your remaining balance updates automatically after every generation.",
  },
  {
    question: "What do I unlock with PRO?",
    answer: "PRO unlocks premium generation tools, faster processing, and higher-end output quality through the paywall flow in the app.",
  },
  {
    question: "Why is my result taking longer than expected?",
    answer: "Generation times depend on queue load, source image quality, and the workflow you selected. Keeping the app open on a stable connection helps avoid interruptions.",
  },
  {
    question: "How do I delete my account?",
    answer: "Open My Profile and choose Delete Account. This removes your account data and signs you out after confirmation.",
  },
];

export default function FaqScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: "#09090b" }}>
      <StatusBar style="light" />
      <ScrollView
        style={{ flex: 1, backgroundColor: "#09090b" }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 10,
          paddingBottom: Math.max(insets.bottom + 32, 40),
        }}
        contentInsetAdjustmentBehavior="never"
      >
        <View className="flex-row items-center gap-4 pb-8">
          <LuxPressable
            onPress={() => {
              triggerHaptic();
              router.back();
            }}
            pressableClassName="cursor-pointer"
            className="h-11 w-11 items-center justify-center rounded-2xl"
            style={{
              backgroundColor: "#111113",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.08)",
            }}
          >
            <ChevronLeft color="#fafafa" size={20} />
          </LuxPressable>
          <View className="flex-1">
            <Text className="text-3xl font-bold text-white">FAQ</Text>
            <Text className="mt-2 text-sm leading-6 text-zinc-400">
              Quick answers to the most common Darkor.ai questions.
            </Text>
          </View>
        </View>

        <View className="gap-3">
          {FAQ_ITEMS.map((item) => (
            <View
              key={item.question}
              className="rounded-3xl px-5 py-5"
              style={{
                backgroundColor: "#111113",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.08)",
              }}
            >
              <View className="flex-row items-start gap-3">
                <View
                  className="mt-0.5 h-10 w-10 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: "rgba(217, 70, 239, 0.14)" }}
                >
                  <CircleHelp color="#d946ef" size={18} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-white">{item.question}</Text>
                  <Text className="mt-2 text-sm leading-6 text-zinc-400">{item.answer}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
