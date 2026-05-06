import NetInfo from "@react-native-community/netinfo";
import {useEffect, useState} from "react";
import {Modal, Pressable, Text, View} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import Svg, {Circle, Path} from "react-native-svg";

import {DS, SCREEN_SIDE_PADDING, glowShadow, surfaceCard} from "../lib/design-system";
import {useIsOffline} from "../lib/offline";

const OFFLINE_RED = "#E11D48";
const OFFLINE_RED_PRESSED = "#BE123C";
const OFFLINE_RED_SOFT = "#FFE4E6";
const OFFLINE_TEXT = "#111111";
const OFFLINE_MUTED = "#6B7280";

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
          backgroundColor: OFFLINE_RED_SOFT,
        }}
      >
        <Svg width={size * 0.66} height={size * 0.66} viewBox="0 0 64 64" fill="none">
          <Path
            d="M10 25C22.3 14.7 41.7 14.7 54 25"
            stroke={OFFLINE_RED}
            strokeWidth={4}
            strokeLinecap="round"
          />
          <Path
            d="M18 34C26 27.8 38 27.8 46 34"
            stroke={OFFLINE_RED}
            strokeWidth={4}
            strokeLinecap="round"
          />
          <Path
            d="M26.5 43.5C29.8 41.1 34.2 41.1 37.5 43.5"
            stroke={OFFLINE_RED}
            strokeWidth={4}
            strokeLinecap="round"
          />
          <Circle cx="32" cy="50" r="3.4" fill={OFFLINE_RED} />
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
          backgroundColor: OFFLINE_RED,
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
  const isOffline = useIsOffline();
  const [dismissed, setDismissed] = useState(false);

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
          backgroundColor: "rgba(17, 17, 17, 0.24)",
          paddingTop: Math.max(insets.top, DS.spacing[3]),
          paddingBottom: Math.max(insets.bottom, DS.spacing[3]),
          paddingHorizontal: SCREEN_SIDE_PADDING,
        }}
      >
        <View
          style={{
            ...surfaceCard("#FFFFFF"),
            ...glowShadow("rgba(225,29,72,0.16)", 28),
            width: "100%",
            maxWidth: 420,
            alignSelf: "center",
            alignItems: "center",
            paddingHorizontal: DS.spacing[3],
            paddingTop: DS.spacing[5],
            paddingBottom: DS.spacing[3],
            gap: DS.spacing[3],
          }}
        >
          <View style={{ alignItems: "center", justifyContent: "center" }}>
            <WifiAlertIcon />
          </View>

          <View style={{ alignItems: "center", gap: DS.spacing[1.5], width: "100%" }}>
            <Text
              selectable
              style={{
                color: OFFLINE_TEXT,
                ...DS.typography.cardTitle,
                fontSize: 24,
                lineHeight: 30,
                textAlign: "center",
              }}
            >
              Vous êtes hors ligne
            </Text>
            <Text
              selectable
              style={{
                color: OFFLINE_MUTED,
                ...DS.typography.body,
                textAlign: "center",
              }}
            >
              Vérifiez votre connexion internet pour continuer à transformer vos espaces.
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Compris"
            onPress={handleDismiss}
            style={({ pressed }) => ({
              width: "100%",
              minHeight: 58,
              borderRadius: 20,
              borderCurve: "continuous",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: pressed ? OFFLINE_RED_PRESSED : OFFLINE_RED,
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
              Compris !
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
