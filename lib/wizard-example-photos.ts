import type { TFunction } from "i18next";

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
      source: require("../assets/media/examples/floor/floor-before-cracked-concrete.jpg"),
    },
    {
      id: "floor-before-damaged-planks",
      label: t("wizard.examples.floor.damagedPlanks"),
      source: require("../assets/media/examples/floor/floor-before-damaged-planks.jpg"),
    },
    {
      id: "floor-before-broken-tile",
      label: t("wizard.examples.floor.brokenTile"),
      source: require("../assets/media/examples/floor/floor-before-broken-tile.jpg"),
    },
    {
      id: "floor-before-renovation-subfloor",
      label: t("wizard.examples.floor.renovationSubfloor"),
      source: require("../assets/media/examples/floor/floor-before-renovation-subfloor.jpg"),
    },
    {
      id: "floor-before-worn-plywood",
      label: t("wizard.examples.floor.wornPlywood"),
      source: require("../assets/media/examples/floor/floor-before-worn-plywood.jpg"),
    },
  ];
}

export function getPaintWizardExamplePhotos(t: TFunction): WizardExamplePhoto[] {
  return [
    {
      id: "wall-before-raw-concrete",
      label: t("wizard.examples.paint.rawConcrete"),
      source: require("../assets/media/examples/wall/wall-before-raw-concrete.jpg"),
    },
    {
      id: "wall-before-peeling-plaster",
      label: t("wizard.examples.paint.peelingPlaster"),
      source: require("../assets/media/examples/wall/wall-before-peeling-plaster.jpg"),
    },
    {
      id: "wall-before-worn-white",
      label: t("wizard.examples.paint.wornWhite"),
      source: require("../assets/media/examples/wall/wall-before-worn-white.jpg"),
    },
    {
      id: "wall-before-exposed-brick",
      label: t("wizard.examples.paint.exposedBrick"),
      source: require("../assets/media/examples/wall/wall-before-exposed-brick.jpg"),
    },
    {
      id: "wall-before-stained-plaster",
      label: t("wizard.examples.paint.stainedPlaster"),
      source: require("../assets/media/examples/wall/wall-before-stained-plaster.jpg"),
    },
    {
      id: "wall-before-damp-streaks",
      label: t("wizard.examples.paint.dampStreaks"),
      source: require("../assets/media/examples/wall/wall-before-damp-streaks.jpg"),
    },
  ];
}
