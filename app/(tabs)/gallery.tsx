import { useAuth } from "@clerk/expo";
import { useQuery } from "convex/react";
import { MotiImage } from "moti";
import { FlatList, Text, View } from "react-native";

type GenerationItem = {
  _id: string;
  imageUrl: string;
  prompt?: string;
  style?: string;
};

export default function GalleryScreen() {
  const { isSignedIn } = useAuth();
  const archive = useQuery("generations:getUserArchive" as any, isSignedIn ? {} : "skip") as
    | GenerationItem[]
    | undefined;

  if (!isSignedIn) {
    return (
      <View className="flex-1 items-center justify-center bg-zinc-950 px-6">
        <Text className="text-center text-zinc-400">Sign in to view your saved generations.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-zinc-950 px-4 pt-14">
      <Text className="mb-4 text-3xl font-bold text-zinc-100">Gallery</Text>
      <FlatList
        data={archive ?? []}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: "space-between", marginBottom: 10 }}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View className="w-[48.5%] rounded-2xl border border-white/10 bg-zinc-900 p-2">
            <MotiImage source={{ uri: item.imageUrl }} className="h-36 w-full rounded-xl border border-white/5" resizeMode="cover" />
            <Text className="mt-2 text-xs text-zinc-400" numberOfLines={2}>
              {item.prompt ?? item.style ?? "Darkor.ai generation"}
            </Text>
          </View>
        )}
        ListEmptyComponent={<Text className="mt-8 text-center text-zinc-500">No generations yet.</Text>}
      />
    </View>
  );
}

