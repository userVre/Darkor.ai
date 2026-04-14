import {
  ArrowLeft,
  ArrowLeftRight,
  Bath,
  Baby,
  BadgeCheck,
  BedDouble,
  BookOpen,
  Box,
  BrickWall,
  BrushCleaning,
  Building2,
  Camera,
  CarFront,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Compass,
  Copy,
  CookingPot,
  DoorOpen,
  Download,
  Eraser,
  Fence,
  FileQuestionMark,
  FileText,
  Flower2,
  Gem as GemBase,
  House,
  Image,
  ImagePlus,
  LayoutGrid,
  LayoutPanelTop,
  Mail,
  Monitor,
  MoveHorizontal,
  PaintRoller,
  Plus,
  Projector,
  Redo2,
  RotateCcw,
  Send,
  Settings2,
  Share2,
  Shield,
  Sofa as SofaBase,
  Sparkles,
  Star,
  Store,
  SunMedium,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Trees,
  Undo2,
  UserRound,
  UtensilsCrossed,
  Wallpaper,
  WandSparkles as WandSparklesBase,
  X,
  type LucideIcon,
  type LucideProps,
} from "lucide-react-native";
import type { ComponentProps } from "react";

type IconProps = LucideProps & {
  absoluteStrokeWidth?: boolean;
};

const DEFAULT_STROKE_WIDTH = 1.72;

const ICON_MAP = {
  add: Plus,
  apartment: Building2,
  "arrow-back": ArrowLeft,
  "auto-awesome": Sparkles,
  "auto-fix-high": WandSparklesBase,
  bathtub: Bath,
  bed: BedDouble,
  "child-care": Baby,
  "cleaning-services": BrushCleaning,
  close: X,
  "compare-arrows": ArrowLeftRight,
  computer: Monitor,
  "content-copy": Copy,
  dashboard: LayoutPanelTop,
  delete: Trash2,
  description: FileText,
  diamond: GemBase,
  "directions-car": CarFront,
  "dinner-dining": UtensilsCrossed,
  "door-front": DoorOpen,
  download: Download,
  draw: BrushCleaning,
  explore: Compass,
  fence: Fence,
  "format-paint": PaintRoller,
  "grid-view": BrickWall,
  "help-outline": CircleHelp,
  house: House,
  image: Image,
  kitchen: CookingPot,
  language: LanguagesFallback,
  "local-florist": Flower2,
  "local-laundry-service": WashingLinesFallback,
  "local-library": BookOpen,
  mail: Mail,
  "meeting-room": DoorOpen,
  "menu-book": BookOpen,
  park: Trees,
  "photo-camera": Camera,
  "present-to-all": Projector,
  quiz: FileQuestionMark,
  redo: Redo2,
  restaurant: UtensilsCrossed,
  "restart-alt": RotateCcw,
  send: Send,
  settings: Settings2,
  share: Share2,
  shield: Shield,
  "soup-kitchen": CookingPot,
  "sports-esports": Sparkles,
  star: Star,
  storefront: Store,
  tv: Monitor,
  verified: BadgeCheck,
  wallpaper: Wallpaper,
  "wb-sunny": SunMedium,
  weekend: SofaBase,
  work: BriefcaseFallback,
} as const;

type MaterialIconName = keyof typeof ICON_MAP;
type MaterialIconComponent = LucideIcon | typeof LanguagesFallback | typeof WashingLinesFallback | typeof BriefcaseFallback;

function LanguagesFallback(props: IconProps) {
  return <CircleHelp {...props} />;
}

function WashingLinesFallback(props: IconProps) {
  return <Sparkles {...props} />;
}

function BriefcaseFallback(props: IconProps) {
  return <Box {...props} />;
}

export type { MaterialIconName };
export type MaterialIconProps = Omit<ComponentProps<typeof ArrowLeft>, "ref"> & {
  name: MaterialIconName;
};

function renderIcon(Icon: MaterialIconComponent, props: IconProps) {
  return <Icon strokeWidth={props.strokeWidth ?? DEFAULT_STROKE_WIDTH} {...props} />;
}

export function MaterialIcon({ name, ...props }: MaterialIconProps) {
  const Icon = ICON_MAP[name];
  return renderIcon(Icon, props);
}

function createIcon(Icon: MaterialIconComponent, displayName: string) {
  function WrappedIcon(props: IconProps) {
    return renderIcon(Icon, props);
  }

  WrappedIcon.displayName = displayName;
  return WrappedIcon;
}

export {
  ArrowLeft,
  BadgeCheck,
  Bath,
  Baby,
  BedDouble,
  BookOpen,
  Box,
  BrickWall,
  BrushCleaning,
  Building2,
  Camera,
  CarFront,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Compass,
  Copy,
  CookingPot,
  DoorOpen,
  Download,
  Eraser,
  Fence,
  FileQuestionMark as FileQuestion,
  FileText,
  Flower2,
  GemBase as Gem,
  House,
  Image,
  ImagePlus,
  LayoutGrid,
  LayoutPanelTop,
  Mail,
  Monitor,
  MoveHorizontal,
  PaintRoller,
  Plus,
  Projector,
  Redo2,
  RotateCcw,
  Send,
  Share2,
  Shield,
  Sparkles,
  Star,
  Store,
  SunMedium,
  Trash2,
  Trees,
  Undo2,
  UserRound,
  UtensilsCrossed,
  Wallpaper,
  X,
};

export const Diamond = createIcon(GemBase, "MaterialIcon(Diamond)");
export const Draw = createIcon(BrushCleaning, "MaterialIcon(Draw)");
export const GemIcon = createIcon(GemBase, "MaterialIcon(Gem)");
export const Settings = createIcon(Settings2, "MaterialIcon(Settings)");
export const SofaIcon = createIcon(SofaBase, "MaterialIcon(Sofa)");
export const ThumbDown = createIcon(ThumbsDown, "MaterialIcon(ThumbDown)");
export const ThumbUp = createIcon(ThumbsUp, "MaterialIcon(ThumbUp)");
export const UserCircle2 = createIcon(UserRound, "MaterialIcon(UserCircle2)");
export const Wand2 = createIcon(WandSparklesBase, "MaterialIcon(Wand2)");
export const DiamondIcon = Diamond;
export const Sofa = createIcon(SofaBase, "MaterialIcon(Sofa)");
