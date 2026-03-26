import { useOAuth } from "@clerk/expo";
import { useSignIn } from "@clerk/expo/legacy";
import { LinearGradient } from "expo-linear-gradient";
import { Link, type Href, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";
import { LuxPressable } from "../components/lux-pressable";

export default function SignInScreen() {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { signIn, setActive, isLoaded } = useSignIn();
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_apple" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const nextRoute = typeof returnTo === "string" && returnTo.startsWith("/") ? returnTo : "/(tabs)";

  const handleSignIn = async () => {
    if (!isLoaded) return;
    setLoading(true);
    try {
      const completeSignIn = await signIn.create({ identifier: email.trim(), password });
      if (completeSignIn.status !== "complete") {
        Alert.alert("Sign in", "Additional verification is required for this account.");
        return;
      }
      await setActive({ session: completeSignIn.createdSessionId });
      router.replace(nextRoute as Href);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sign in failed";
      Alert.alert("Sign in failed", message);
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setAppleLoading(true);
    try {
      const { createdSessionId, setActive: setOAuthActive } = await startOAuthFlow();
      if (createdSessionId) {
        await setOAuthActive?.({ session: createdSessionId });
        router.replace(nextRoute as Href);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Apple sign-in failed";
      Alert.alert("Apple sign-in failed", message);
    } finally {
      setAppleLoading(false);
    }
  };

  return (
    <View className="flex-1 justify-center bg-black px-5" style={{ backgroundColor: "#000000" }}>
      <Text className="text-3xl font-bold text-zinc-100">Sign in</Text>
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
        onPress={() => void handleSignIn()}
        className="mt-4 rounded-2xl"
        disabled={loading}
      >
        <LinearGradient
          colors={["#d946ef", "#4f46e5"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          className="rounded-2xl p-4"
        >
          <Text className="text-center font-semibold text-white">{loading ? "Signing in..." : "Continue"}</Text>
        </LinearGradient>
      </LuxPressable>

      <LuxPressable
        onPress={() => void handleAppleSignIn()}
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
        No account?{" "}
        <Link href={{ pathname: "/sign-up", params: { returnTo: nextRoute } }} style={{ color: "#f0abfc" }}>
          Create one
        </Link>
      </Text>
    </View>
  );
}


