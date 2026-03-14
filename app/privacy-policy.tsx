import { useRouter } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { ArrowLeft } from "lucide-react-native";

import { triggerHaptic } from "../lib/haptics";
import { LuxPressable } from "../components/lux-pressable";

export default function PrivacyPolicyScreen() {
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
          <Text className="text-lg font-medium text-white">Privacy Policy</Text>
          <View className="h-10 w-10" />
        </View>

        <View className="mt-6 gap-4">
          <Text className="text-xs uppercase tracking-[3px] text-zinc-500">Last updated</Text>
          <Text className="text-sm text-zinc-300">March 14, 2026</Text>

          <Text className="mt-4 text-base font-semibold text-white">Overview</Text>
          <Text className="text-sm leading-6 text-zinc-300">
            Darkor.ai (“Darkor,” “we,” “our,” “us”) provides AI-powered interior and exterior redesign services.
            This Privacy Policy explains what data we collect, how we use it, and the choices you have.
          </Text>

          <Text className="mt-4 text-base font-semibold text-white">Information We Collect</Text>
          <Text className="text-sm leading-6 text-zinc-300">
            We collect information you provide (such as account details and uploaded images), usage data
            (such as feature interactions and device information), and payment status data from RevenueCat
            to manage your subscription.
          </Text>

          <Text className="mt-4 text-base font-semibold text-white">How We Use Your Data</Text>
          <Text className="text-sm leading-6 text-zinc-300">
            We use your data to deliver AI redesigns, personalize your experience, manage credits and subscriptions,
            improve model quality, and secure the app. We do not sell your personal data.
          </Text>

          <Text className="mt-4 text-base font-semibold text-white">Image Processing</Text>
          <Text className="text-sm leading-6 text-zinc-300">
            Images you upload are processed to generate redesigns. We store generated images and related metadata
            so you can access your results. You can delete your account to remove your data.
          </Text>

          <Text className="mt-4 text-base font-semibold text-white">Sharing & Disclosure</Text>
          <Text className="text-sm leading-6 text-zinc-300">
            We share data only with service providers needed to operate Darkor.ai (e.g., authentication, analytics,
            payment processing) and when required by law. We require providers to protect your data.
          </Text>

          <Text className="mt-4 text-base font-semibold text-white">Data Security</Text>
          <Text className="text-sm leading-6 text-zinc-300">
            We use encryption and access controls to protect your data. No system is perfectly secure; please use
            strong passwords and keep your device secure.
          </Text>

          <Text className="mt-4 text-base font-semibold text-white">Your Rights</Text>
          <Text className="text-sm leading-6 text-zinc-300">
            You can access, update, or delete your account data at any time. You can request account deletion from
            Settings, which removes your stored generations and profile information.
          </Text>

          <Text className="mt-4 text-base font-semibold text-white">Contact Us</Text>
          <Text className="text-sm leading-6 text-zinc-300">
            For privacy questions or requests, contact us at support@darkor.ai.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
