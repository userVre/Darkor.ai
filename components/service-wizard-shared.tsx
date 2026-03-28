import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { MotiView } from "moti";
import { Check, ImagePlus, X } from "lucide-react-native";
import { Children, cloneElement, isValidElement, useState, type ComponentProps, type ReactElement, type ReactNode } from "react";
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
  selectedImageUri?: string | null;
  onClearSelection?: () => void;
  onUploadPress: () => void;
  onCameraPress?: () => void;
  onExamplePress: (example: ServiceExamplePhoto) => void;
};

type ServiceSelectionCardProps = {
  title: string;
  description: string;
  image: ImageSourcePropType;
  width: number;
  active: boolean;
  onPress: () => void;
  fullWidth?: boolean;
  recommended?: boolean;
};

type ServiceSelectionGridProps = {
  children: ReactNode;
};

type ServiceWizardStepScreenProps = {
  children: ReactNode;
  footer?: ReactNode;
  footerOffset?: number;
  scrollEnabled?: boolean;
  showsVerticalScrollIndicator?: boolean;
  contentContainerStyle?: ComponentProps<typeof ScrollView>["contentContainerStyle"];
};

export function ServiceIntakeStep({
  heading,
  subtext,
  examples,
  selectedImageUri,
  onClearSelection,
  onUploadPress,
  onExamplePress,
}: ServiceIntakeStepProps) {
  const { width } = useWindowDimensions();
  const hasSelectedImage = Boolean(selectedImageUri);
  const exampleCardWidth = Math.max(Math.min(width * 0.42, 176), 136);
  const exampleCardHeight = Math.round(exampleCardWidth * 1.02);

  return (
    <View style={[styles.intakeContent, hasSelectedImage ? styles.intakeContentUploaded : null]}>
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
          {selectedImageUri ? (
            <>
              <Image source={{ uri: selectedImageUri }} style={styles.selectedImagePreview} contentFit="cover" transition={140} cachePolicy="memory-disk" />
              <View style={styles.selectedImageBadge}>
                <Check color="#DCFCE7" size={14} strokeWidth={2.7} />
                <Text style={styles.selectedImageBadgeLabel}>Photo ready</Text>
              </View>
              {onClearSelection ? (
                <LuxPressable
                  onPress={(event) => {
                    event.stopPropagation();
                    onClearSelection();
                  }}
                  className={pointerClassName}
                  pressableClassName={pointerClassName}
                  style={styles.clearSelectionButton}
                  glowColor="rgba(255,255,255,0.05)"
                  scale={0.96}
                >
                  <X color="#FFFFFF" size={16} strokeWidth={2.4} />
                </LuxPressable>
              ) : null}
            </>
          ) : (
            <MotiView
              pointerEvents="none"
              animate={{ opacity: [0.46, 0.92, 0.46], scale: [0.994, 1.006, 0.994] }}
              transition={{ duration: 2000, loop: true, type: "timing" }}
              style={styles.dashedUploadFrame}
            >
              <View style={styles.uploadIconWrap}>
                <LinearGradient
                  colors={["rgba(168,85,247,0.24)", "rgba(124,58,237,0.08)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.uploadIconBadge}
                >
                  <ImagePlus color="#F5F3FF" size={28} strokeWidth={1.9} />
                </LinearGradient>
              </View>
              <View style={styles.uploadEmptyCopy}>
                <Text style={styles.uploadEmptyTitle}>Tap to add your photo</Text>
                <Text style={styles.uploadEmptyText}>or drag from your gallery</Text>
              </View>
            </MotiView>
          )}
        </LinearGradient>
      </LuxPressable>
      {hasSelectedImage ? null : (
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
      )}
    </View>
  );
}

export function ServiceSelectionCard({
  title,
  description: _description,
  image,
  width,
  active,
  onPress,
  fullWidth = false,
  recommended = false,
}: ServiceSelectionCardProps) {
  return (
    <LuxPressable
      onPress={onPress}
      className={pointerClassName}
      pressableClassName={pointerClassName}
      style={{ width: fullWidth ? "100%" : width }}
      glowColor={active ? "rgba(217,70,239,0.22)" : "rgba(255,255,255,0.04)"}
      scale={0.99}
    >
      <View style={[styles.selectionCard, active ? styles.selectionCardActive : null]}>
        <View style={styles.selectionImageWrap}>
          <Image source={image} style={styles.selectionImage} contentFit="cover" transition={120} cachePolicy="memory-disk" />
          <LinearGradient
            colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.2)", "rgba(0,0,0,0.84)", "rgba(0,0,0,0.96)"]}
            locations={[0, 0.18, 0.72, 1]}
            style={styles.selectionGradient}
            pointerEvents="none"
          />
          {active ? (
            <View style={[styles.selectionBadge, recommended ? styles.selectionBadgeOffset : null]}>
              <Check color="#FFFFFF" size={14} strokeWidth={2.6} />
            </View>
          ) : null}
          {recommended ? (
            <View style={styles.selectionRecommendedBadge}>
              <Text style={styles.selectionRecommendedText}>Recommended</Text>
            </View>
          ) : null}
          <View style={[styles.selectionCopy, fullWidth ? styles.selectionCopyCentered : null]}>
            <Text
              style={[styles.selectionTitle, fullWidth ? styles.selectionTitleCentered : null]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.82}
            >
              {title}
            </Text>
          </View>
        </View>
      </View>
    </LuxPressable>
  );
}

export function ServiceSelectionGrid({ children }: ServiceSelectionGridProps) {
  const items = Children.toArray(children);
  const rows: ReactNode[][] = [];

  for (let index = 0; index < items.length; index += 2) {
    const rowItems = items.slice(index, index + 2);
    rows.push(rowItems);
  }

  return (
    <View style={styles.selectionGrid}>
      {rows.map((rowItems, rowIndex) => {
        const isOddLastRow = rowItems.length === 1 && rowIndex === rows.length - 1;

        return (
          <View key={`selection-grid-row-${rowIndex}`} style={styles.selectionGridRow}>
            {rowItems.map((child, itemIndex) => {
              const itemKey = `selection-grid-item-${rowIndex}-${itemIndex}`;

              if (!isValidElement(child)) {
                return (
                  <View key={itemKey} style={isOddLastRow ? styles.selectionGridSingleItem : styles.selectionGridHalfItem}>
                    {child}
                  </View>
                );
              }

              return (
                <View key={itemKey} style={isOddLastRow ? styles.selectionGridSingleItem : styles.selectionGridHalfItem}>
                  {cloneElement(child as ReactElement<ServiceSelectionCardProps>, {
                    fullWidth: isOddLastRow,
                    recommended: isOddLastRow,
                  })}
                </View>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

export function ServiceWizardStepScreen({
  children,
  footer,
  footerOffset = 96,
  scrollEnabled = true,
  showsVerticalScrollIndicator = false,
  contentContainerStyle,
}: ServiceWizardStepScreenProps) {
  const [footerHeight, setFooterHeight] = useState(0);
  const flattenedContentStyle = StyleSheet.flatten(contentContainerStyle);
  const existingPaddingBottom =
    typeof flattenedContentStyle?.paddingBottom === "number" ? flattenedContentStyle.paddingBottom : 0;
  const resolvedPaddingBottom = footer ? Math.max(existingPaddingBottom, footerHeight + 16) : existingPaddingBottom;

  return (
    <View style={styles.stepScreen}>
      <ScrollView
        style={styles.stepScroll}
        scrollEnabled={scrollEnabled}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        contentContainerStyle={[contentContainerStyle, footer ? { paddingBottom: resolvedPaddingBottom } : null]}
      >
        {children}
      </ScrollView>

      {footer ? (
        <View
          onLayout={(event) => {
            const nextHeight = Math.round(event.nativeEvent.layout.height);
            setFooterHeight((current) => (current === nextHeight ? current : nextHeight));
          }}
          pointerEvents="box-none"
          style={[styles.fixedFooterWrap, { paddingBottom: footerOffset }]}
        >
          <View style={styles.fixedFooterContent}>{footer}</View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  intakeContent: {
    gap: 22,
  },
  intakeContentUploaded: {
    gap: 18,
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
  dashedUploadFrame: {
    width: "87%",
    height: "87%",
    borderRadius: 28,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "rgba(124,58,237,0.88)",
    backgroundColor: "rgba(124,58,237,0.05)",
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    paddingHorizontal: 24,
    ...glowShadow("rgba(124,58,237,0.18)", 18),
  },
  selectedImagePreview: {
    ...StyleSheet.absoluteFillObject,
  },
  selectedImageBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: HAIRLINE,
    borderColor: "rgba(74,222,128,0.42)",
    backgroundColor: "rgba(22,101,52,0.84)",
  },
  selectedImageBadgeLabel: {
    color: "#F0FDF4",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: -0.1,
  },
  clearSelectionButton: {
    position: "absolute",
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: HAIRLINE,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(10,10,12,0.82)",
  },
  uploadIconWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  uploadIconBadge: {
    width: 92,
    height: 92,
    borderRadius: 26,
    borderWidth: HAIRLINE,
    borderColor: "rgba(192,132,252,0.28)",
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
    ...glowShadow("rgba(124,58,237,0.22)", 18),
  },
  uploadEmptyCopy: {
    gap: 6,
    alignItems: "center",
  },
  uploadEmptyTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.35,
    textAlign: "center",
  },
  uploadEmptyText: {
    color: "rgba(212,212,216,0.82)",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    maxWidth: 210,
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
    gap: 14,
    paddingHorizontal: 2,
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
    width: "100%",
    minHeight: 252,
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
    flex: 1,
    backgroundColor: "#111214",
  },
  selectionImage: {
    ...StyleSheet.absoluteFillObject,
  },
  selectionGradient: {
    ...StyleSheet.absoluteFillObject,
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
  selectionBadgeOffset: {
    right: 120,
  },
  selectionRecommendedBadge: {
    position: "absolute",
    top: 14,
    right: 14,
    minHeight: 28,
    paddingHorizontal: 10,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(12,12,16,0.78)",
    borderWidth: HAIRLINE,
    borderColor: "rgba(255,255,255,0.12)",
  },
  selectionRecommendedText: {
    color: "#F5E9FF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.1,
  },
  selectionCopy: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
  },
  selectionCopyCentered: {
    alignItems: "center",
  },
  selectionTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 22,
    letterSpacing: -0.35,
    textShadowColor: "rgba(0,0,0,0.38)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  selectionTitleCentered: {
    textAlign: "center",
  },
  selectionGrid: {
    gap: 16,
  },
  selectionGridRow: {
    width: "100%",
    flexDirection: "row",
    gap: 16,
    alignItems: "stretch",
  },
  selectionGridHalfItem: {
    flex: 1,
    minWidth: 0,
  },
  selectionGridSingleItem: {
    width: "100%",
  },
  stepScreen: {
    flex: 1,
  },
  stepScroll: {
    flex: 1,
  },
  fixedFooterWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 10,
    paddingHorizontal: 16,
    borderTopWidth: HAIRLINE,
    borderTopColor: "rgba(255,255,255,0.06)",
    backgroundColor: SERVICE_WIZARD_THEME.colors.background,
  },
  fixedFooterContent: {
    gap: 10,
  },
});
