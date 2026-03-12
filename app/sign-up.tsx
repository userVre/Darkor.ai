import { useSignUp } from "@clerk/expo/legacy";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp, isLoaded } = useSignUp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!isLoaded) return;
    setLoading(true);
    try {
      await signUp.create({ emailAddress: email.trim(), password });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      Alert.alert("Verify email", "Check your inbox for the verification code, then sign in.");
      router.replace("/sign-in");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sign up failed";
      Alert.alert("Sign up failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 justify-center bg-zinc-950 px-5">
      <Text className="text-3xl font-bold text-zinc-100">Create account</Text>
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

      <Pressable onPress={() => void handleSignUp()} className="mt-4 rounded-2xl bg-cyan-400 p-4" style={{ cursor: "pointer" }} disabled={loading}>
        <Text className="text-center font-semibold text-zinc-900">{loading ? "Creating..." : "Create account"}</Text>
      </Pressable>

      <Text className="mt-4 text-center text-zinc-400">
        Already have an account? <Link href="/sign-in" className="text-cyan-300">Sign in</Link>
      </Text>
    </View>
  );
}


