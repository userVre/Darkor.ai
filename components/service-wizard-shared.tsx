import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Camera, Check, Plus } from "lucide-react-native";
import { ScrollView, Text, View, StyleSheet, useWindowDimensions, type ImageSourcePropType } from "react-native";

import { DS, HAIRLINE, glowShadow } from "../lib/design-system";
import { SERVICE_WIZARD_THEME } from "../lib/service-wizard-theme";
import { LuxPressable } from "./lux-pressable";

const pointerClassName = "cursor-pointer";

export type ServiceExamplePhoto = {
  id: string;
  source: ImageSourcePropType;
};

type ServiceIntakeStepProps = {
  heading: string;
  subtext: string;
  examples: ServiceExamplePhoto[];
  onUploadPress: () => void;
  onCameraPress: () => void;
  onExamplePress: (example: ServiceExamplePhoto) => void;
};

type ServiceSelectionCardProps = {
  title: string;
  description: string;
  image: ImageSourcePropType;
  width: number;
  active: boolean;
  onPress: () => void;
};

export function ServiceIntakeStep({
  heading,
  subtext,
  examples,
  onUploadPress,
  onCameraPress,
  onExamplePress,
}: ServiceIntakeStepProps) {
  const { width } = useWindowDimensions();
  const exampleCardWidth = Math.max(Math.min(width * 0.42, 176), 136);
  const exampleCardHeight = Math.round(exampleCardWidth * 1.02);

  return (
    <View style={styles.intakeContent}>
      <View style={styles.intakeCopy}>
        <Text style={styles.intakeTitle}>{heading}</Text>
        <Text style={styles.intakeText}>{subtext}</Text>
      </View>

      <LuxPressable
        onPress={onUploadPress}
        className={pointerClassName}
        pressableClassName={pointerClassName}
        style={styles.uploadSquarePressable}
        glowColor={SERVICE_WIZARD_THEME.colors.accentGlowSoft}
        scale={0.985}
      >
        <LinearGradient
          colors={["rgba(255,255,255,0.05)", "rgba(255,255,255,0.02)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.uploadSquare}
        >
          <View style={styles.plusTile}>
            <Plus color="#FFFFFF" size={32} strokeWidth={2.2} />
          </View>
        </LinearGradient>
      </LuxPressable>

      <LuxPressable
        onPress={onCameraPress}
        className={pointerClassName}
        pressableClassName={pointerClassName}
        style={styles.cameraButtonWrap}
        glowColor="rgba(255,255,255,0.05)"
        scale={0.99}
      >
        <View style={styles.cameraButton}>
          <Camera color="#FFFFFF" size={18} strokeWidth={2.1} />
          <Text style={styles.cameraText}>Use Camera</Text>
        </View>
      </LuxPressable>

      <View style={styles.examplesSection}>
        <Text style={styles.examplesTitle}>Example Photos</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          contentContainerStyle={styles.examplesRailContent}
          style={{ cursor: "pointer" as any }}
        >
          {examples.map((example) => (
            <LuxPressable
              key={example.id}
              onPress={() => onExamplePress(example)}
              className={pointerClassName}
              pressableClassName={pointerClassName}
              style={{ width: exampleCardWidth, height: exampleCardHeight }}
              glowColor="rgba(255,255,255,0.04)"
              scale={0.985}
            >
              <View style={styles.exampleCard}>
                <Image source={example.source} style={styles.exampleImage} contentFit="cover" transition={120} cachePolicy="memory-disk" />
              </View>
            </LuxPressable>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

export function ServiceSelectionCard({
  title,
  description,
  image,
  width,
  active,
  onPress,
}: ServiceSelectionCardProps) {
  return (
    <LuxPressable
      onPress={onPress}
      className={pointerClassName}
      pressableClassName={pointerClassName}
      style={{ width }}
      glowColor={active ? "rgba(217,70,239,0.22)" : "rgba(255,255,255,0.04)"}
      scale={0.99}
    >
      <View style={[styles.selectionCard, active ? styles.selectionCardActive : null]}>
        <View style={styles.selectionImageWrap}>
          <Image source={image} style={styles.selectionImage} contentFit="cover" transition={120} cachePolicy="memory-disk" />
          {active ? (
            <View style={styles.selectionBadge}>
              <Check color="#FFFFFF" size={14} strokeWidth={2.6} />
            </View>
          ) : null}
        </View>
        <View style={styles.selectionCopy}>
          <Text style={styles.selectionTitle}>{title}</Text>
          <Text style={[styles.selectionDescription, active ? styles.selectionDescriptionActive : null]} numberOfLines={2}>
            {description}
          </Text>
        </View>
      </View>
    </LuxPressable>
  );
}

const styles = StyleSheet.create({
  intakeContent: {
    gap: 22,
  },
  intakeCopy: {
    alignItems: "center",
    gap: 10,
    paddingTop: 12,
  },
  intakeTitle: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 36,
    letterSpacing: -0.8,
    textAlign: "center",
  },
  intakeText: {
    color: SERVICE_WIZARD_THEME.colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 330,
  },
  uploadSquarePressable: {
    width: "100%",
    maxWidth: 320,
    alignSelf: "center",
  },
  uploadSquare: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 32,
    borderWidth: HAIRLINE,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#050506",
    alignItems: "center",
    justifyContent: "center",
    ...glowShadow("rgba(255,255,255,0.02)", 16),
  },
  plusTile: {
    width: 92,
    height: 92,
    borderRadius: 28,
    borderWidth: HAIRLINE,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraButtonWrap: {
    alignSelf: "center",
  },
  cameraButton: {
    minHeight: 52,
    paddingHorizontal: 18,
    borderRadius: DS.radius.pill,
    borderWidth: HAIRLINE,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.03)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  cameraText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  examplesSection: {
    gap: 14,
  },
  examplesTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  examplesRailContent: {
    gap: 12,
    paddingRight: 2,
  },
  exampleCard: {
    flex: 1,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: HAIRLINE,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#08090B",
  },
  exampleImage: {
    width: "100%",
    height: "100%",
  },
  selectionCard: {
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: HAIRLINE,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#09090C",
  },
  selectionCardActive: {
    borderColor: SERVICE_WIZARD_THEME.colors.accent,
    backgroundColor: "rgba(168,85,247,0.08)",
  },
  selectionImageWrap: {
    aspectRatio: 1,
    backgroundColor: "#111214",
  },
  selectionImage: {
    width: "100%",
    height: "100%",
  },
  selectionBadge: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SERVICE_WIZARD_THEME.colors.accent,
    borderWidth: HAIRLINE,
    borderColor: "rgba(255,255,255,0.2)",
  },
  selectionCopy: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    gap: 6,
  },
  selectionTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.35,
  },
  selectionDescription: {
    color: "#C9CBD1",
    fontSize: 13,
    lineHeight: 19,
  },
  selectionDescriptionActive: {
    color: SERVICE_WIZARD_THEME.colors.accentText,
  },
});
