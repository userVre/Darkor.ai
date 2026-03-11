import { MotiImage, MotiView } from "moti";
import { StyleSheet, useWindowDimensions, View, Text } from "react-native";
import Svg, { Path } from "react-native-svg";

const beforeGarden = require("../../assets/media/garden-before.jpg");
const afterGarden = require("../../assets/media/garden-after.jpg");

export default function OutdoorTransformation() {
  const { width } = useWindowDimensions();
  const frameWidth = Math.min(176, width * 0.42);
  const frameHeight = Math.round(frameWidth * 1.1);

  return (
    <View className="rounded-3xl border border-white/10 bg-zinc-900 px-3 py-4" style={styles.card}>
      <Text className="mb-3 text-base font-semibold text-zinc-100">Design gardens and outdoor spaces</Text>

      <View className="flex-row items-center justify-between">
        <MotiView
          from={{ opacity: 0, translateX: -8 }}
          animate={{ opacity: 1, translateX: 0 }}
          transition={{ type: "timing", duration: 450 }}
          className="overflow-hidden rounded-2xl border border-white/15"
          style={{ width: frameWidth, height: frameHeight }}
        >
          <MotiImage source={beforeGarden} resizeMode="cover" className="h-full w-full" />
        </MotiView>

        <View className="items-center justify-center px-1" style={{ width: Math.max(38, width * 0.1) }}>
          <Svg width="38" height="24" viewBox="0 0 38 24" fill="none">
            <Path
              d="M2 12C7.8 8.3 12.3 8.6 17.5 12.2C21.4 14.9 25.7 15.2 30.8 11.4"
              stroke="white"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeDasharray="2 4"
            />
            <Path d="M26 7.8L35 11.2L28.2 17.1" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>

        <MotiView
          from={{ opacity: 0, translateX: 8 }}
          animate={{ opacity: 1, translateX: 0 }}
          transition={{ type: "timing", duration: 450, delay: 120 }}
          className="overflow-hidden rounded-2xl border border-white/15"
          style={{ width: frameWidth, height: frameHeight }}
        >
          <MotiImage source={afterGarden} resizeMode="cover" className="h-full w-full" />
        </MotiView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    shadowColor: "#0ea5e9",
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },
});
