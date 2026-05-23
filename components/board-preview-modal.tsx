import {X} from "@/components/material-icons";
import {Image} from "expo-image";
import {StyleSheet, View} from "react-native";
import {Gesture, GestureDetector} from "react-native-gesture-handler";
import Animated, {runOnJS, useAnimatedStyle, useSharedValue, withSpring} from "react-native-reanimated";
import {IconButton, Modal as PaperModal, Portal, Text, useTheme as usePaperTheme} from "react-native-paper";

import {md3Spacing} from "../constants/md3Theme";
import type {BoardItem} from "../lib/board";
import {BeforeAfterSlider} from "./before-after-slider";

type BoardPreviewModalProps = {
  item: BoardItem | null;
  visible: boolean;
  onClose: () => void;
};

export function BoardPreviewModal({item, visible, onClose}: BoardPreviewModalProps) {
  const paperTheme = usePaperTheme();
  const translateY = useSharedValue(0);
  const sliderX = useSharedValue(0);
  const sliderWidth = useSharedValue(0);
  const afterImageUri = item?.imageUri ?? undefined;
  const beforeImageUri = item?.originalImageUri ?? undefined;
  const previewImageUri = afterImageUri ?? beforeImageUri;
  const hasComparison = Boolean(beforeImageUri && afterImageUri);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{translateY: translateY.value}],
  }));

  const panGesture = Gesture.Pan()
    .activeOffsetY([12, 12])
    .failOffsetX([-12, 12])
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (event.translationY > 120 || event.velocityY > 900) {
        translateY.value = 0;
        runOnJS(onClose)();
        return;
      }

      translateY.value = withSpring(0, {damping: 18, stiffness: 180});
    });

  if (!item) {
    return null;
  }

  return (
    <Portal>
      <PaperModal
        contentContainerStyle={[styles.overlay, {backgroundColor: paperTheme.colors.scrim}]}
        dismissable
        onDismiss={onClose}
        visible={visible}
      >
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.content, animatedStyle]}>
            {hasComparison && item.originalImageUri ? (
              <BeforeAfterSlider
                afterSource={{uri: afterImageUri}}
                beforeSource={{uri: beforeImageUri}}
                contentFit="cover"
                sliderWidth={sliderWidth}
                sliderX={sliderX}
                style={styles.image}
              />
            ) : previewImageUri ? (
              <Image source={{uri: previewImageUri}} style={styles.image} contentFit="cover" transition={120} />
            ) : (
              <View style={styles.image} />
            )}
          </Animated.View>
        </GestureDetector>

        <IconButton
          accessibilityLabel="Close"
          icon={({color, size}) => <X color={color} size={size} strokeWidth={2.2} />}
          iconColor={paperTheme.colors.inverseOnSurface}
          mode="contained-tonal"
          onPress={onClose}
          size={24}
          style={styles.closeButton}
        />

        <View style={[styles.bottomBar, {backgroundColor: paperTheme.colors.inverseSurface}]}>
          <Text style={{color: paperTheme.colors.inverseOnSurface}} variant="titleMedium">
            {item.styleName}
          </Text>
          <Text style={{color: paperTheme.colors.inverseOnSurface}} variant="bodySmall">
            {item.roomType}
          </Text>
        </View>
      </PaperModal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  closeButton: {
    position: "absolute",
    top: md3Spacing.quadrupleExtraLarge,
    right: md3Spacing.extraLarge,
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    gap: md3Spacing.extraSmall,
    paddingHorizontal: md3Spacing.extraLarge,
    paddingTop: md3Spacing.large,
    paddingBottom: md3Spacing.doubleExtraLarge,
  },
});
