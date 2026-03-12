import { cssInterop } from "nativewind";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { VideoView } from "expo-video";
import { MotiImage, MotiView } from "moti";

cssInterop(MotiView, { className: "style" });
cssInterop(MotiImage, { className: "style" });
cssInterop(BlurView, { className: "style" });
cssInterop(VideoView, { className: "style" });
cssInterop(Image, { className: "style" });
