import type {TFunction} from "i18next";

export type WizardExamplePhoto = {
  id: string;
  label: string;
  source: number;
};

export function getFloorWizardExamplePhotos(t: TFunction): WizardExamplePhoto[] {
  return [
    {
      id: "floor-before-cracked-concrete",
      label: t("wizard.examples.floor.crackedConcrete"),
      source: require("../assets/media/examples/floor/floor-before-cracked-concrete.webp"),
    },
    {
      id: "floor-before-damaged-planks",
      label: t("wizard.examples.floor.damagedPlanks"),
      source: require("../assets/media/examples/floor/floor-before-damaged-planks.webp"),
    },
    {
      id: "floor-before-broken-tile",
      label: t("wizard.examples.floor.brokenTile"),
      source: require("../assets/media/examples/floor/floor-before-broken-tile.webp"),
    },
    {
      id: "floor-before-renovation-subfloor",
      label: t("wizard.examples.floor.renovationSubfloor"),
      source: require("../assets/media/examples/floor/floor-before-renovation-subfloor.webp"),
    },
    {
      id: "floor-before-worn-plywood",
      label: t("wizard.examples.floor.wornPlywood"),
      source: require("../assets/media/examples/floor/floor-before-worn-plywood.webp"),
    },
  ];
}

export function getPaintWizardExamplePhotos(t: TFunction): WizardExamplePhoto[] {
  return [
    {
      id: "wall-before-raw-concrete",
      label: t("wizard.examples.paint.rawConcrete"),
      source: require("../assets/media/examples/wall/wall-before-raw-concrete.webp"),
    },
    {
      id: "wall-before-peeling-plaster",
      label: t("wizard.examples.paint.peelingPlaster"),
      source: require("../assets/media/examples/wall/wall-before-peeling-plaster.webp"),
    },
    {
      id: "wall-before-worn-white",
      label: t("wizard.examples.paint.wornWhite"),
      source: require("../assets/media/examples/wall/wall-before-worn-white.webp"),
    },
    {
      id: "wall-before-exposed-brick",
      label: t("wizard.examples.paint.exposedBrick"),
      source: require("../assets/media/examples/wall/wall-before-exposed-brick.webp"),
    },
    {
      id: "wall-before-stained-plaster",
      label: t("wizard.examples.paint.stainedPlaster"),
      source: require("../assets/media/examples/wall/wall-before-stained-plaster.webp"),
    },
    {
      id: "wall-before-damp-streaks",
      label: t("wizard.examples.paint.dampStreaks"),
      source: require("../assets/media/examples/wall/wall-before-damp-streaks.webp"),
    },
  ];
}

export function getLayoutWizardExamplePhotos(_t: TFunction): WizardExamplePhoto[] {
  return [
    {
      id: "layout-before-lounge-blocked",
      label: "Lounge circulation",
      source: require("../assets/media/examples/layout/layout-before-lounge-blocked.webp"),
    },
    {
      id: "layout-before-studio-cluttered",
      label: "Studio flow",
      source: require("../assets/media/examples/layout/layout-before-studio-cluttered.webp"),
    },
    {
      id: "layout-before-kitchen-compressed",
      label: "Kitchen clearance",
      source: require("../assets/media/examples/layout/layout-before-kitchen-compressed.webp"),
    },
    {
      id: "layout-before-dining-crowded",
      label: "Dining flow",
      source: require("../assets/media/examples/layout/layout-before-dining-crowded.webp"),
    },
    {
      id: "layout-before-bedroom-tight",
      label: "Bedroom clearance",
      source: require("../assets/media/examples/layout/layout-before-bedroom-tight.webp"),
    },
    {
      id: "layout-before-stair-nook-office",
      label: "Nook planning",
      source: require("../assets/media/examples/layout/layout-before-stair-nook-office.webp"),
    },
  ];
}

export function getReplaceWizardExamplePhotos(t: TFunction): WizardExamplePhoto[] {
  return [
    {
      id: "replace-before-messy-lounge",
      label: t("workspace.localization.examples.interior.messyLounge"),
      source: require("../assets/media/examples/interior/interior-before-messy-lounge.webp"),
    },
    {
      id: "replace-before-worn-reading-room",
      label: t("workspace.localization.examples.interior.wornRoom"),
      source: require("../assets/media/examples/interior/interior-before-worn-reading-room.webp"),
    },
    {
      id: "replace-before-outdated-kitchen",
      label: t("workspace.localization.examples.interior.outdatedKitchen"),
      source: require("../assets/media/examples/interior/interior-before-outdated-kitchen.webp"),
    },
    {
      id: "replace-before-damaged-room",
      label: t("workspace.localization.examples.interior.damagedRoom"),
      source: require("../assets/media/examples/interior/interior-before-damaged-room.webp"),
    },
    {
      id: "replace-before-empty-room",
      label: t("workspace.localization.examples.interior.emptyRoom"),
      source: require("../assets/media/examples/interior/interior-before-empty-room.webp"),
    },
  ];
}
