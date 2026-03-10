import { useSignIn } from "@clerk/expo/legacy";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";

export default function SignInScreen() {
  const router = useRouter();
  const { signIn, setActive, isLoaded } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

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
      router.replace("/(tabs)");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sign in failed";
      Alert.alert("Sign in failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 justify-center bg-zinc-950 px-5">
      <Text className="text-3xl font-bold text-zinc-100">Sign in</Text>
      <TextInput
        className="mt-4 rounded-2xl border border-white/10 bg-zinc-900 p-4 text-zinc-100"
        placeholder="Email"
        placeholderTextColor="#71717a"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        className="mt-3 rounded-2xl border border-white/10 bg-zinc-900 p-4 text-zinc-100"
        placeholder="Password"
        placeholderTextColor="#71717a"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Pressable onPress={() => void handleSignIn()} className="mt-4 rounded-2xl bg-cyan-400 p-4" disabled={loading}>
        <Text className="text-center font-semibold text-zinc-900">{loading ? "Signing in..." : "Continue"}</Text>
      </Pressable>

      <Text className="mt-4 text-center text-zinc-400">
        No account? <Link href="/sign-up" className="text-cyan-300">Create one</Link>
      </Text>
    </View>
  );
}


