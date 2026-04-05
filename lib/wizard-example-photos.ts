export type WizardExamplePhoto = {
  id: string;
  label: string;
  source: number;
};

export const FLOOR_WIZARD_EXAMPLE_PHOTOS: WizardExamplePhoto[] = [
  {
    id: "floor-before-cracked-concrete",
    label: "Cracked Concrete",
    source: require("../assets/media/examples/floor/floor-before-cracked-concrete.jpg"),
  },
  {
    id: "floor-before-damaged-planks",
    label: "Damaged Planks",
    source: require("../assets/media/examples/floor/floor-before-damaged-planks.jpg"),
  },
  {
    id: "floor-before-broken-tile",
    label: "Broken Tile",
    source: require("../assets/media/examples/floor/floor-before-broken-tile.jpg"),
  },
  {
    id: "floor-before-renovation-subfloor",
    label: "Renovation Subfloor",
    source: require("../assets/media/examples/floor/floor-before-renovation-subfloor.jpg"),
  },
  {
    id: "floor-before-worn-plywood",
    label: "Worn Plywood",
    source: require("../assets/media/examples/floor/floor-before-worn-plywood.jpg"),
  },
];

export const PAINT_WIZARD_EXAMPLE_PHOTOS: WizardExamplePhoto[] = [
  {
    id: "wall-before-raw-concrete",
    label: "Raw Concrete",
    source: require("../assets/media/examples/wall/wall-before-raw-concrete.jpg"),
  },
  {
    id: "wall-before-peeling-plaster",
    label: "Peeling Plaster",
    source: require("../assets/media/examples/wall/wall-before-peeling-plaster.jpg"),
  },
  {
    id: "wall-before-worn-white",
    label: "Worn White",
    source: require("../assets/media/examples/wall/wall-before-worn-white.jpg"),
  },
  {
    id: "wall-before-exposed-brick",
    label: "Exposed Brick",
    source: require("../assets/media/examples/wall/wall-before-exposed-brick.jpg"),
  },
  {
    id: "wall-before-stained-plaster",
    label: "Stained Plaster",
    source: require("../assets/media/examples/wall/wall-before-stained-plaster.jpg"),
  },
  {
    id: "wall-before-damp-streaks",
    label: "Damp Streaks",
    source: require("../assets/media/examples/wall/wall-before-damp-streaks.jpg"),
  },
];
