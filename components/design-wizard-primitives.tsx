import type {Icon, IconProps} from "phosphor-react-native";
import {
ArmchairIcon,
BabyIcon,
BathtubIcon,
BedIcon,
BooksIcon,
BriefcaseIcon,
CookingPotIcon,
DoorOpenIcon,
FilmSlateIcon,
ForkKnifeIcon,
GameControllerIcon,
HouseLineIcon,
OfficeChairIcon,
ProjectorScreenIcon,
TelevisionIcon,
WashingMachineIcon,
} from "phosphor-react-native";
import type {TextStyle, ViewStyle} from "react-native";

export const DESIGN_WIZARD_ACCENT = "#1D4ED8";
export const DESIGN_WIZARD_ACCENT_STRONG = "#1E40AF";
export const DESIGN_WIZARD_DEPTH_SHADOW = "rgba(29,78,216,0.22)";
export const DESIGN_WIZARD_SURFACE = "#FFFFFF";
export const DESIGN_WIZARD_SURFACE_MUTED = "#F5F5F5";
export const DESIGN_WIZARD_BORDER = "#E3E3E3";
export const DESIGN_WIZARD_TEXT = "#0A0A0A";
export const DESIGN_WIZARD_TEXT_MUTED = "#686868";
export const DESIGN_WIZARD_TEXT_ON_DARK = "#FFFFFF";
export const DESIGN_WIZARD_RUBY = "#E53935";
export const DESIGN_WIZARD_SELECTION_BLUE = "#2563EB";
export const DESIGN_WIZARD_SELECTION_BLUE_SOFT = "rgba(37,99,235,0.14)";
export const DESIGN_WIZARD_SELECTION_BLUE_GLOW = "rgba(37,99,235,0.2)";

type RoomIconName =
  | "Bathroom"
  | "Bedroom"
  | "Dining Room"
  | "Hall"
  | "Gaming Room"
  | "Kitchen"
  | "Laundry"
  | "Library"
  | "Living Room"
  | "Nursery"
  | "Home Office"
  | "Home Theater";

const ROOM_ICON_MAP: Record<RoomIconName, Icon> = {
  Bathroom: BathtubIcon,
  Bedroom: BedIcon,
  "Dining Room": ForkKnifeIcon,
  Hall: DoorOpenIcon,
  "Gaming Room": GameControllerIcon,
  Kitchen: CookingPotIcon,
  Laundry: WashingMachineIcon,
  Library: BooksIcon,
  "Living Room": ArmchairIcon,
  Nursery: BabyIcon,
  "Home Office": OfficeChairIcon,
  "Home Theater": ProjectorScreenIcon,
};

const BUILDING_ICON_MAP: Record<string, Icon> = {
  Apartment: HouseLineIcon,
  "Office Building": BriefcaseIcon,
  Office: BriefcaseIcon,
  Retail: TelevisionIcon,
  Store: TelevisionIcon,
  House: HouseLineIcon,
  Villa: HouseLineIcon,
  Restaurant: ForkKnifeIcon,
  Theater: FilmSlateIcon,
};

export function getArchitecturalSelectionRadii(): ViewStyle {
  return {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 24,
    borderBottomRightRadius: 12,
    borderBottomLeftRadius: 24,
    borderCurve: "continuous",
  };
}

export function getWizardSelectionCardStyle(active: boolean, backgroundColor = DESIGN_WIZARD_SURFACE_MUTED): ViewStyle {
  return {
    ...getArchitecturalSelectionRadii(),
    borderWidth: active ? 2 : 1,
    borderColor: active ? DESIGN_WIZARD_SELECTION_BLUE : DESIGN_WIZARD_BORDER,
    backgroundColor,
    shadowColor: DESIGN_WIZARD_SELECTION_BLUE,
    shadowOpacity: active ? 0.2 : 0.05,
    shadowRadius: active ? 16 : 12,
    shadowOffset: { width: 0, height: active ? 8 : 6 },
    elevation: active ? 8 : 2,
    boxShadow: active
      ? `0px 0px 0px 1px ${DESIGN_WIZARD_SELECTION_BLUE_SOFT}, 0px 12px 28px ${DESIGN_WIZARD_SELECTION_BLUE_GLOW}`
      : "0px 10px 24px rgba(15,23,42,0.05)",
  };
}

export function getWizardSelectedLabelTextStyle(active: boolean): TextStyle {
  return active
    ? {
        color: DESIGN_WIZARD_SELECTION_BLUE,
        fontWeight: "700",
      }
    : {
        color: DESIGN_WIZARD_TEXT,
        fontWeight: "600",
      };
}

export function getWizardFloatingButtonStyle(active: boolean): ViewStyle {
  return {
    borderRadius: 14,
    borderCurve: "continuous",
    backgroundColor: active ? DESIGN_WIZARD_ACCENT : "#ECECEC",
    boxShadow: active
      ? "0px 18px 30px rgba(29,78,216,0.24)"
      : "0px 14px 28px rgba(15,23,42,0.12)",
  };
}

export function getWizardSelectedIconContainerStyle(active: boolean): ViewStyle {
  return {
    borderRadius: 18,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: active ? DESIGN_WIZARD_SELECTION_BLUE_SOFT : "#E9E9E9",
    backgroundColor: active ? "#FFFFFF" : "#F7F7F7",
    boxShadow: active
      ? `0px 0px 0px 1px ${DESIGN_WIZARD_SELECTION_BLUE_SOFT}, 0px 8px 20px ${DESIGN_WIZARD_SELECTION_BLUE_GLOW}`
      : "none",
  };
}

export function spacedCapsLabel(value: string) {
  return value
    .toUpperCase()
    .split(" ")
    .map((word) => word.split("").join(" "))
    .join("   ");
}

export function getArchitecturalRoomIcon(name: string) {
  return ROOM_ICON_MAP[name as RoomIconName] ?? HouseLineIcon;
}

export function getArchitecturalBuildingIcon(name: string) {
  return BUILDING_ICON_MAP[name] ?? HouseLineIcon;
}

export function getArchitecturalIconProps(color: string, size: number): IconProps {
  return {
    color,
    size,
    weight: "light",
  };
}
