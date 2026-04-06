import { MaterialIcons as ExpoMaterialIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

type BaseIconProps = Omit<ComponentProps<typeof ExpoMaterialIcons>, "name"> & {
  absoluteStrokeWidth?: boolean;
  strokeWidth?: number;
};

export type MaterialIconName = ComponentProps<typeof ExpoMaterialIcons>["name"];
export type MaterialIconProps = BaseIconProps & {
  name: MaterialIconName;
};

export function MaterialIcon({
  name,
  size = 24,
  strokeWidth: _strokeWidth,
  absoluteStrokeWidth: _absoluteStrokeWidth,
  ...props
}: MaterialIconProps) {
  return <ExpoMaterialIcons name={name} size={size} {...props} />;
}

function createIcon(name: MaterialIconName) {
  function Icon({
    size = 24,
    strokeWidth: _strokeWidth,
    absoluteStrokeWidth: _absoluteStrokeWidth,
    ...props
  }: BaseIconProps) {
    return <ExpoMaterialIcons name={name} size={size} {...props} />;
  }

  Icon.displayName = `MaterialIcon(${name})`;

  return Icon;
}

export const ArrowLeft = createIcon("arrow-back");
export const BadgeCheck = createIcon("verified");
export const Bath = createIcon("bathtub");
export const Baby = createIcon("child-care");
export const BedDouble = createIcon("bed");
export const BookOpen = createIcon("menu-book");
export const Box = createIcon("inventory-2");
export const BrickWall = createIcon("grid-view");
export const BrushCleaning = createIcon("cleaning-services");
export const Building2 = createIcon("apartment");
export const Camera = createIcon("photo-camera");
export const CarFront = createIcon("directions-car");
export const Check = createIcon("check");
export const ChevronLeft = createIcon("chevron-left");
export const ChevronRight = createIcon("chevron-right");
export const CircleHelp = createIcon("help-outline");
export const Compass = createIcon("explore");
export const Copy = createIcon("content-copy");
export const CookingPot = createIcon("soup-kitchen");
export const Diamond = createIcon("diamond");
export const DoorOpen = createIcon("door-front");
export const Download = createIcon("download");
export const Eraser = createIcon("cleaning-services");
export const Fence = createIcon("fence");
export const FileQuestion = createIcon("quiz");
export const FileText = createIcon("description");
export const Flower2 = createIcon("local-florist");
export const Gem = createIcon("diamond");
export const House = createIcon("house");
export const Image = createIcon("image");
export const ImagePlus = createIcon("add-photo-alternate");
export const LayoutGrid = createIcon("apps");
export const LayoutPanelTop = createIcon("dashboard");
export const Mail = createIcon("mail");
export const Monitor = createIcon("computer");
export const MoveHorizontal = createIcon("compare-arrows");
export const PaintRoller = createIcon("format-paint");
export const Plus = createIcon("add");
export const Projector = createIcon("present-to-all");
export const Redo2 = createIcon("redo");
export const RotateCcw = createIcon("restart-alt");
export const Send = createIcon("send");
export const Settings = createIcon("settings");
export const Share2 = createIcon("share");
export const Shield = createIcon("shield");
export const Sofa = createIcon("weekend");
export const Sparkles = createIcon("auto-awesome");
export const Star = createIcon("star");
export const Store = createIcon("storefront");
export const SunMedium = createIcon("wb-sunny");
export const Trash2 = createIcon("delete");
export const Trees = createIcon("park");
export const Undo2 = createIcon("undo");
export const UserCircle2 = createIcon("account-circle");
export const UserRound = createIcon("account-circle");
export const UtensilsCrossed = createIcon("restaurant");
export const Wallpaper = createIcon("wallpaper");
export const Wand2 = createIcon("auto-fix-high");
export const X = createIcon("close");
