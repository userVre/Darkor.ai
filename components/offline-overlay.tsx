import NetInfo, {useNetInfo} from "@react-native-community/netinfo";
import {useEffect, useMemo, useState} from "react";
import {Modal, Pressable, Text, View} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import Svg, {Circle, Path} from "react-native-svg";

import {DS, SCREEN_SIDE_PADDING, glowShadow, surfaceCard} from "../lib/design-system";

function WifiAlertIcon({ size = 120 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FDE8EE",
        }}
      >
        <Svg width={size * 0.66} height={size * 0.66} viewBox="0 0 64 64" fill="none">
          <Path
            d="M10 25C22.3 14.7 41.7 14.7 54 25"
            stroke="#D64067"
            strokeWidth={4}
            strokeLinecap="round"
          />
          <Path
            d="M18 34C26 27.8 38 27.8 46 34"
            stroke="#D64067"
            strokeWidth={4}
            strokeLinecap="round"
          />
          <Path
            d="M26.5 43.5C29.8 41.1 34.2 41.1 37.5 43.5"
            stroke="#D64067"
            strokeWidth={4}
            strokeLinecap="round"
          />
          <Circle cx="32" cy="50" r="3.4" fill="#D64067" />
        </Svg>
      </View>

      <View
        style={{
          position: "absolute",
          right: size * 0.08,
          bottom: size * 0.12,
          width: size * 0.34,
          height: size * 0.34,
          borderRadius: (size * 0.34) / 2,
          backgroundColor: "#D64067",
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 4,
          borderColor: "#FFFFFF",
        }}
      >
        <View
          style={{
            width: 4,
            height: size * 0.12,
            borderRadius: 999,
            backgroundColor: "#FFFFFF",
            marginBottom: 4,
          }}
        />
        <View
          style={{
            width: 4,
            height: 4,
            borderRadius: 999,
            backgroundColor: "#FFFFFF",
          }}
        />
      </View>
    </View>
  );
}

export function OfflineOverlay() {
  const insets = useSafeAreaInsets();
  const netInfo = useNetInfo();
  const [dismissed, setDismissed] = useState(false);

  const isOffline = useMemo(() => {
    if (netInfo.isInternetReachable === false) {
      return true;
    }

    if (netInfo.isConnected === false) {
      return true;
    }

    return false;
  }, [netInfo.isConnected, netInfo.isInternetReachable]);

  useEffect(() => {
    if (!isOffline) {
      setDismissed(false);
    }
  }, [isOffline]);

  const visible = isOffline && !dismissed;

  const handleDismiss = () => {
    setDismissed(true);
    void NetInfo.refresh().catch(() => undefined);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          backgroundColor: "rgba(15, 18, 24, 0.18)",
          paddingTop: Math.max(insets.top, DS.spacing[3]),
          paddingBottom: Math.max(insets.bottom, DS.spacing[3]),
          paddingHorizontal: SCREEN_SIDE_PADDING,
        }}
      >
        <View
          style={{
            ...surfaceCard("#FFFFFF"),
            ...glowShadow("rgba(214,64,103,0.16)", 22),
            width: "100%",
            maxWidth: 420,
            alignSelf: "center",
            paddingHorizontal: DS.spacing[4],
            paddingTop: DS.spacing[5],
            paddingBottom: DS.spacing[4],
            gap: DS.spacing[4],
          }}
        >
          <View style={{ alignItems: "center", justifyContent: "center" }}>
            <WifiAlertIcon />
          </View>

          <View style={{ gap: DS.spacing[1.5] }}>
            <Text
              selectable
              style={{
                color: "#111111",
                ...DS.typography.cardTitle,
              }}
            >
              You are offline
            </Text>
            <Text
              selectable
              style={{
                color: DS.colors.textMuted,
                ...DS.typography.body,
              }}
            >
              It seems there is a problem with your connection. Please check your network status.
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Got it"
            onPress={handleDismiss}
            style={({ pressed }) => ({
              minHeight: 58,
              borderRadius: 18,
              borderCurve: "continuous",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: pressed ? DS.colors.accentStrong : DS.colors.accent,
              opacity: pressed ? 0.92 : 1,
            })}
          >
            <Text
              style={{
                color: "#FFFFFF",
                ...DS.typography.button,
                fontSize: 17,
                lineHeight: 22,
              }}
            >
              Got It!
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
