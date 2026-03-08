import { useAuth } from "@clerk/clerk-expo";
import { useMutation, useQuery } from "convex/react";
import * as ImagePicker from "expo-image-picker";
import { MotiImage, MotiView } from "moti";
import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { generateImage } from "@/lib/api";

const styles = ["Modern", "Luxury", "Scandinavian", "Cyberpunk", "Boho", "Japandi"];

type Plan = "free" | "pro" | "premium" | "ultra";

type MeResponse = {
  plan: Plan;
  credits: number;
};

export default function WorkspaceScreen() {
  const { isSignedIn, getToken } = useAuth();
  const me = useQuery("users:me" as any, {}) as MeResponse | null | undefined;
  const ensureUser = useMutation("users:getOrCreateCurrentUser" as any);

  const [prompt, setPrompt] = useState("Luxury minimal living room with warm sunlight");
  const [selectedStyle, setSelectedStyle] = useState(styles[0]);
  const [inputBase64, setInputBase64] = useState<string | null>(null);
  const [sourceUri, setSourceUri] = useState<string | null>(null);
  const [resultUri, setResultUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "Photo access is required to upload your room image.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.9,
      base64: true,
    });

    if (result.canceled) return;

    const picked = result.assets[0];
    setSourceUri(picked.uri);
    setInputBase64(picked.base64 ?? null);
  };

  const handleGenerate = async () => {
    if (!isSignedIn) {
      Alert.alert("Sign in required", "Please sign in to use the workspace.");
      return;
    }

    if (!inputBase64) {
      Alert.alert("Image required", "Please upload an image first.");
      return;
    }

    if ((me?.credits ?? 0) <= 0) {
      Alert.alert("Refill Credits", "You have no credits left.");
      return;
    }

    setLoading(true);
    try {
      await ensureUser({});

      const token = await getToken();
      const activePlan = me?.plan && me.plan !== "free" ? me.plan : "pro";
      const response = await generateImage(
        {
          imageBase64: inputBase64,
          prompt,
          style: selectedStyle,
          planUsed: activePlan,
        },
        token,
      );

      setResultUri(response.imageUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Generation failed";
      Alert.alert("Generation failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-zinc-950" contentContainerStyle={{ padding: 20, paddingTop: 60, paddingBottom: 120 }}>
      <Text className="text-3xl font-bold text-zinc-100">Workspace</Text>
      <Text className="mt-2 text-zinc-400">Credits: {me?.credits ?? 0}</Text>

      <Pressable onPress={pickImage} className="mt-5 rounded-2xl border border-white/15 bg-zinc-900 p-4">
        <Text className="text-center text-zinc-100">Upload Input Image</Text>
      </Pressable>

      {sourceUri ? <MotiImage source={{ uri: sourceUri }} className="mt-4 h-56 w-full rounded-2xl border border-white/5" resizeMode="cover" /> : null}

      <TextInput
        className="mt-4 rounded-2xl border border-white/10 bg-zinc-900 p-4 text-zinc-100"
        placeholder="Describe the redesign"
        placeholderTextColor="#71717a"
        value={prompt}
        onChangeText={setPrompt}
        multiline
      />

      <Text className="mt-4 text-base font-semibold text-zinc-100">Style</Text>
      <View className="mt-3 flex-row flex-wrap gap-2">
        {styles.map((style) => {
          const active = style === selectedStyle;
          return (
            <Pressable
              key={style}
              onPress={() => setSelectedStyle(style)}
              className={`rounded-xl px-4 py-2 ${active ? "bg-white" : "bg-zinc-900"}`}
            >
              <Text className={`${active ? "text-zinc-900" : "text-zinc-300"}`}>{style}</Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={() => void handleGenerate()}
        disabled={loading || (me?.credits ?? 0) <= 0}
        className={`mt-6 rounded-2xl px-4 py-4 ${loading || (me?.credits ?? 0) <= 0 ? "bg-zinc-700" : "bg-cyan-400"}`}
      >
        <Text className="text-center text-base font-semibold text-zinc-900">{loading ? "Generating..." : "Generate"}</Text>
      </Pressable>

      {resultUri ? (
        <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} className="mt-6">
          <MotiImage source={{ uri: resultUri }} className="h-64 w-full rounded-2xl border border-white/5" resizeMode="cover" />
          <View className="mt-3 flex-row justify-between">
            {[0, 1, 2].map((i) => (
              <MotiImage key={i} source={{ uri: resultUri }} className="h-24 w-[32%] rounded-2xl border border-white/5" resizeMode="cover" />
            ))}
          </View>
        </MotiView>
      ) : null}
    </ScrollView>
  );
}
