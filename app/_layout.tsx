import "react-native-gesture-handler";
import "react-native-reanimated";

import { Stack } from "expo-router";

console.log("[Boot] Safe root layout loaded");

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#000" },
      }}
    />
  );
}
