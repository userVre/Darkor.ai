import { Text, View } from "react-native";

console.log("LOG_STAGE_2: Root loaded");

export default function RootLayout() {
  console.log("LOG_STAGE_1: Layout mounting");
  return (
    <View style={{ flex: 1, backgroundColor: "#000", justifyContent: "center", alignItems: "center" }}>
      <Text style={{ color: "white", fontSize: 24 }}>DARKOR AI BOOTING...</Text>
    </View>
  );
}
