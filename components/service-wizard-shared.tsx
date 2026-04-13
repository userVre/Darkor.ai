import { Image } from "expo-image";
import { MotiView } from "moti";
import { Check, ImagePlus, X } from "@/components/material-icons";
import { Children, cloneElement, isValidElement, useState, type ComponentProps, type ReactElement, type ReactNode } from "react";
import { ScrollView, Text, View, StyleSheet, useWindowDimensions, type ImageSourcePropType } from "react-native";
import { fonts } from "../styles/typography";
import { spacing } from "../styles/spacing";
import { dark as colors } from "@/styles/theme";

import { HAIRLINE, glowShadow } from "../lib/design-system";
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
        <View style={styles.uploadSquare}>
          {selectedImageUri ? (
            <>
              <Image source={{ uri: selectedImageUri }} style={styles.selectedImagePreview} contentFit="cover" transition={140} cachePolicy="memory-disk" />
              <View style={styles.selectedImageBadge}>
                <Check color={colors.textSuccess} size={14} strokeWidth={2.7} />
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
                  glowColor={colors.surfaceHigh}
                  scale={0.96}
                >
                  <X color={colors.textPrimary} size={16} strokeWidth={2.4} />
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
                <View style={styles.uploadIconBadge}>
                  <ImagePlus color={colors.textPrimary} size={28} strokeWidth={1.9} />
                </View>
              </View>
              <View style={styles.uploadEmptyCopy}>
                <Text style={styles.uploadEmptyTitle}>Tap to add your photo</Text>
                <Text style={styles.uploadEmptyText}>or drag from your gallery</Text>
              </View>
            </MotiView>
          )}
        </View>
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
                glowColor={colors.surfaceHigh}
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
      glowColor={active ? colors.brand : colors.surfaceHigh}
      scale={0.99}
    >
      <View style={[styles.selectionCard, active ? styles.selectionCardActive : null]}>
        <View style={styles.selectionImageWrap}>
          <Image source={image} style={styles.selectionImage} contentFit="cover" transition={120} cachePolicy="memory-disk" />
          <View pointerEvents="none" style={styles.selectionGradient} />
          {active ? (
            <View style={[styles.selectionBadge, recommended ? styles.selectionBadgeOffset : null]}>
              <Check color={colors.textPrimary} size={14} strokeWidth={2.6} />
            </View>
          ) : null}
          {recommended ? (
            <View style={styles.selectionRecommendedBadge}>
              <Text style={styles.selectionRecommendedText}>Recommended</Text>
            </View>
          ) : null}
          <View style={[styles.selectionCopy, fullWidth ? styles.selectionCopyCentered : null]}>
            <Text style={styles.selectionTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>
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
    typeof flattenedContentStyle?.paddingBottom === "number" ? flattenedContentStyle.paddingBottom: spacing.xs;
  const resolvedPaddingBottom = footer ? Math.max(existingPaddingBottom, footerHeight + 16) : existingPaddingBottom;

  return (
    <View style={styles.stepScreen}>
      <ScrollView
        style={styles.stepScroll}
        scrollEnabled={scrollEnabled}
        contentInsetAdjustmentBehavior="never"
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
    gap: spacing.lg,
  },
  intakeContentUploaded: {
    gap: spacing.md,
  },
  intakeCopy: {
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  intakeTitle: {
    color: colors.textPrimary,
    fontSize: 30,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "800",
    lineHeight: 36,
    letterSpacing: -0.8,
  },
  intakeText: {
    color: SERVICE_WIZARD_THEME.colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
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
    borderRadius: 12,
    borderWidth: HAIRLINE,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...glowShadow(colors.border, 16),
  },
  dashedUploadFrame: {
    width: "87%",
    height: "87%",
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.brand,
    backgroundColor: colors.brandSurface,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    ...glowShadow(colors.brand, 18),
  },
  selectedImagePreview: {
    ...StyleSheet.absoluteFillObject,
  },
  selectedImageBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    minHeight: 34,
    paddingHorizontal: spacing.sm,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderWidth: HAIRLINE,
    borderColor: colors.success,
    backgroundColor: colors.successSurfaceHigh,
  },
  selectedImageBadgeLabel: {
    color: colors.textSuccess,
    fontSize: 12,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "800",
    letterSpacing: -0.1,
  },
  clearSelectionButton: {
    position: "absolute",
    top: 16,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: HAIRLINE,
    borderColor: colors.borderLight,
    backgroundColor: colors.surfaceOverlay,
  },
  uploadIconWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  uploadIconBadge: {
    width: 92,
    height: 92,
    borderRadius: 12,
    borderWidth: HAIRLINE,
    borderColor: colors.brandBorder,
    backgroundColor: colors.surfaceHigh,
    alignItems: "center",
    justifyContent: "center",
    ...glowShadow(colors.brand, 18),
  },
  uploadEmptyCopy: {
    gap: spacing.xs,
    alignItems: "flex-start",
  },
  uploadEmptyTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "800",
    letterSpacing: -0.35,
  },
  uploadEmptyText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    maxWidth: 210,
  },
  examplesSection: {
    gap: spacing.md,
  },
  examplesTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  examplesRailContent: {
    gap: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  exampleCard: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: HAIRLINE,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  exampleImage: {
    width: "100%",
    height: "100%",
  },
  selectionCard: {
    width: "100%",
    minHeight: 252,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: HAIRLINE,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selectionCardActive: {
    borderColor: "#CC3333",
    backgroundColor: "rgba(204,51,51,0.1)",
  },
  selectionImageWrap: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
  },
  selectionImage: {
    ...StyleSheet.absoluteFillObject,
  },
  selectionGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surfaceOverlay,
  },
  selectionBadge: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 30,
    height: 30,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#CC3333",
    borderWidth: HAIRLINE,
    borderColor: colors.borderLight,
  },
  selectionBadgeOffset: {
    right: 120,
  },
  selectionRecommendedBadge: {
    position: "absolute",
    top: 14,
    right: 14,
    minHeight: 28,
    paddingHorizontal: spacing.sm,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceOverlay,
    borderWidth: HAIRLINE,
    borderColor: colors.borderLight,
  },
  selectionRecommendedText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontFamily: fonts.regular.fontFamily,
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
    alignItems: "flex-start",
  },
  selectionTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "800",
    lineHeight: 22,
    letterSpacing: -0.35,
    textShadowColor: colors.shadow,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  selectionGrid: {
    gap: spacing.md,
  },
  selectionGridRow: {
    width: "100%",
    flexDirection: "row",
    gap: spacing.md,
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
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
    borderTopWidth: HAIRLINE,
    borderTopColor: colors.border,
    backgroundColor: SERVICE_WIZARD_THEME.colors.background,
  },
  fixedFooterContent: {
    gap: spacing.sm,
  },
});

