import { useOAuth } from "@clerk/expo";
import { useSignUp } from "@clerk/expo/legacy";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";
import { LuxPressable } from "../components/lux-pressable";

export default function SignUpScreen() {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { signUp, isLoaded } = useSignUp();
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_apple" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  const handleSignUp = async () => {
    if (!isLoaded) return;
    setLoading(true);
    try {
      await signUp.create({ emailAddress: email.trim(), password });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      Alert.alert("Verify email", "Check your inbox for the verification code, then sign in.");
      router.replace({ pathname: "/sign-in", params: { returnTo: returnTo ?? "/(tabs)" } });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sign up failed";
      Alert.alert("Sign up failed", message);
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignUp = async () => {
    setAppleLoading(true);
    try {
      const { createdSessionId, setActive: setOAuthActive } = await startOAuthFlow();
      if (createdSessionId) {
        await setOAuthActive?.({ session: createdSessionId });
        router.replace(returnTo ?? "/(tabs)");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Apple sign-up failed";
      Alert.alert("Apple sign-up failed", message);
    } finally {
      setAppleLoading(false);
    }
  };

  return (
    <View className="flex-1 justify-center bg-black px-5" style={{ backgroundColor: "#000000" }}>
      <Text className="text-3xl font-bold text-zinc-100">Create account</Text>
      <TextInput
        className="mt-4 rounded-2xl border border-white/10 bg-black/60 p-4 text-zinc-100"
        style={{ borderWidth: 0.5 }}
        placeholder="Email"
        placeholderTextColor="#71717a"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        className="mt-3 rounded-2xl border border-white/10 bg-black/60 p-4 text-zinc-100"
        style={{ borderWidth: 0.5 }}
        placeholder="Password"
        placeholderTextColor="#71717a"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <LuxPressable
        onPress={() => void handleSignUp()}
        className="mt-4 rounded-2xl bg-cyan-400 p-4"
        disabled={loading}
      >
        <Text className="text-center font-semibold text-zinc-900">{loading ? "Creating..." : "Create account"}</Text>
      </LuxPressable>

      <LuxPressable
        onPress={() => void handleAppleSignUp()}
        className="mt-3 flex-row items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black py-3"
        style={{ borderWidth: 0.5 }}
        disabled={appleLoading}
      >
        <Text className="text-lg font-semibold text-white">{"\uF8FF"}</Text>
        <Text className="text-sm font-semibold text-white">
          {appleLoading ? "Connecting..." : "Continue with Apple"}
        </Text>
      </LuxPressable>

      <Text className="mt-4 text-center text-zinc-400">
        Already have an account? <Link href="/sign-in" className="text-cyan-300">Sign in</Link>
      </Text>
    </View>
  );
}


