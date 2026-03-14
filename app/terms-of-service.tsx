import { useRouter } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { ArrowLeft } from "lucide-react-native";

import { triggerHaptic } from "../lib/haptics";
import { LuxPressable } from "../components/lux-pressable";

export default function TermsOfServiceScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-black" style={{ backgroundColor: "#000000" }}>
      <ScrollView
        className="flex-1 bg-black"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120 }}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View className="flex-row items-center justify-between">
          <LuxPressable
            onPress={() => {
              triggerHaptic();
              router.back();
            }}
            className="cursor-pointer h-10 w-10 items-center justify-center rounded-full border border-white/10"
            style={{ borderWidth: 0.5 }}
          >
            <ArrowLeft color="#e4e4e7" size={18} />
          </LuxPressable>
          <Text className="text-lg font-medium text-white">Terms of Service</Text>
          <View className="h-10 w-10" />
        </View>

        <View className="mt-6 gap-4">
          <Text className="text-xs uppercase tracking-[3px] text-zinc-500">Last updated</Text>
          <Text className="text-sm text-zinc-300">March 14, 2026</Text>

          <Text className="mt-4 text-base font-semibold text-white">Acceptance of Terms</Text>
          <Text className="text-sm leading-6 text-zinc-300">
            By accessing or using Darkor.ai, you agree to these Terms of Service. If you do not agree, do not use the app.
          </Text>

          <Text className="mt-4 text-base font-semibold text-white">Service Description</Text>
          <Text className="text-sm leading-6 text-zinc-300">
            Darkor.ai provides AI-generated redesigns for interior and exterior spaces. Outputs are for visualization
            only and may not reflect structural or engineering constraints.
          </Text>

          <Text className="mt-4 text-base font-semibold text-white">Account & Eligibility</Text>
          <Text className="text-sm leading-6 text-zinc-300">
            You must be at least 13 years old to use Darkor.ai. You are responsible for maintaining the security of your
            account and all activity that occurs under it.
          </Text>

          <Text className="mt-4 text-base font-semibold text-white">User Content</Text>
          <Text className="text-sm leading-6 text-zinc-300">
            You retain ownership of images you upload. By using the service, you grant Darkor.ai a limited license to
            process your images to generate results and to store them for your access.
          </Text>

          <Text className="mt-4 text-base font-semibold text-white">Subscriptions & Credits</Text>
          <Text className="text-sm leading-6 text-zinc-300">
            Paid plans provide enhanced features and higher-quality downloads. Credits are consumed per generation.
            Subscription billing and renewals are handled by your app store and RevenueCat.
          </Text>

          <Text className="mt-4 text-base font-semibold text-white">Prohibited Use</Text>
          <Text className="text-sm leading-6 text-zinc-300">
            You agree not to misuse the service, reverse engineer it, or upload unlawful or harmful content.
          </Text>

          <Text className="mt-4 text-base font-semibold text-white">Disclaimer</Text>
          <Text className="text-sm leading-6 text-zinc-300">
            The service is provided “as is” without warranties of any kind. We do not guarantee specific results or
            accuracy of AI-generated designs.
          </Text>

          <Text className="mt-4 text-base font-semibold text-white">Limitation of Liability</Text>
          <Text className="text-sm leading-6 text-zinc-300">
            To the maximum extent permitted by law, Darkor.ai is not liable for indirect or consequential damages
            arising from your use of the service.
          </Text>

          <Text className="mt-4 text-base font-semibold text-white">Contact</Text>
          <Text className="text-sm leading-6 text-zinc-300">
            Questions about these terms can be sent to support@darkor.ai.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
