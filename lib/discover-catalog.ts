import type { ImageSourcePropType } from "react-native";

import { GENERATED_DISCOVER_ASSETS, type GeneratedDiscoverAssetId } from "./generated-discover-assets";

export type DiscoverTabId = "discover";
export type DiscoverClusterId = "interiors" | "architecture" | "foundations";
export type DiscoverService = "interior" | "exterior" | "foundation" | "garden";

export type DiscoverTile = {
  id: string;
  title: string;
  previewTitle: string;
  categoryId: DiscoverGroup["id"];
  image: ImageSourcePropType;
};

export type DiscoverGroup = {
  id: GeneratedDiscoverAssetId;
  title: string;
  clusterId: DiscoverClusterId;
  service: DiscoverService;
  items: DiscoverTile[];
};

export type DiscoverCluster = {
  id: DiscoverClusterId;
  title: string;
  groups: DiscoverGroup[];
};

export type DiscoverFeedRow =
  | {
      id: string;
      type: "cluster";
      cluster: DiscoverCluster;
    }
  | {
      id: string;
      type: "group";
      group: DiscoverGroup;
    };

type DiscoverGroupDefinition = {
  id: GeneratedDiscoverAssetId;
  title: string;
  clusterId: DiscoverClusterId;
  service: DiscoverService;
  visibleInFeed?: boolean;
};

const DISCOVER_GROUP_DEFINITIONS: DiscoverGroupDefinition[] = [
  { id: "kitchen", title: "Kitchen", clusterId: "interiors", service: "interior" },
  { id: "living-room", title: "Living Room", clusterId: "interiors", service: "interior" },
  { id: "dining-room", title: "Dining Room", clusterId: "interiors", service: "interior" },
  { id: "bedroom", title: "Bedroom", clusterId: "interiors", service: "interior" },
  { id: "bathroom", title: "Bathroom", clusterId: "interiors", service: "interior" },
  { id: "gaming-room", title: "Gaming Room", clusterId: "interiors", service: "interior" },
  { id: "home-office", title: "Home Office", clusterId: "interiors", service: "interior" },
  { id: "coffee-shop", title: "Coffee Shop", clusterId: "interiors", service: "interior" },
  { id: "study-room", title: "Study Room", clusterId: "interiors", service: "interior" },
  { id: "restaurant", title: "Restaurant", clusterId: "interiors", service: "interior" },
  { id: "attic", title: "Attic", clusterId: "interiors", service: "interior" },
  { id: "toilet", title: "Toilet", clusterId: "interiors", service: "interior" },
  { id: "balcony", title: "Balcony", clusterId: "interiors", service: "interior" },
  { id: "hall", title: "Hall", clusterId: "interiors", service: "interior" },
  { id: "deck", title: "Deck", clusterId: "interiors", service: "interior" },
  { id: "villa", title: "Villa", clusterId: "architecture", service: "exterior" },
  { id: "apartment", title: "Apartment", clusterId: "architecture", service: "exterior" },
  { id: "house", title: "House", clusterId: "architecture", service: "exterior" },
  { id: "office-building", title: "Office Building", clusterId: "architecture", service: "exterior" },
  { id: "retail", title: "Retail", clusterId: "architecture", service: "exterior" },
  { id: "residential", title: "Residential", clusterId: "architecture", service: "exterior" },
  { id: "wall", title: "Wall", clusterId: "foundations", service: "foundation" },
  { id: "floor", title: "Floor", clusterId: "foundations", service: "foundation" },
  { id: "garden", title: "Garden", clusterId: "foundations", service: "garden", visibleInFeed: false },
];

function buildTiles(groupId: GeneratedDiscoverAssetId, title: string): DiscoverTile[] {
  return GENERATED_DISCOVER_ASSETS[groupId].map((image, index) => ({
    id: `${groupId}-${index + 1}`,
    title: `${title} ${index + 1}`,
    previewTitle: title,
    categoryId: groupId,
    image,
  }));
}

export const DISCOVER_GROUPS: DiscoverGroup[] = DISCOVER_GROUP_DEFINITIONS.map((group) => ({
  id: group.id,
  title: group.title,
  clusterId: group.clusterId,
  service: group.service,
  items: buildTiles(group.id, group.title),
}));

export const DISCOVER_CLUSTERS: DiscoverCluster[] = [
  { id: "interiors", title: "Interiors", groups: DISCOVER_GROUPS.filter((group) => group.clusterId === "interiors") },
  {
    id: "architecture",
    title: "Architecture",
    groups: DISCOVER_GROUPS.filter((group) => group.clusterId === "architecture"),
  },
  {
    id: "foundations",
    title: "Foundations",
    groups: DISCOVER_GROUPS.filter(
      (group) =>
        group.clusterId === "foundations" &&
        DISCOVER_GROUP_DEFINITIONS.find((definition) => definition.id === group.id)?.visibleInFeed !== false,
    ),
  },
];

export const DISCOVER_FEED_ROWS: DiscoverFeedRow[] = DISCOVER_CLUSTERS.flatMap((cluster) => [
  {
    id: `cluster-${cluster.id}`,
    type: "cluster" as const,
    cluster,
  },
  ...cluster.groups.map((group) => ({
    id: `group-${group.id}`,
    type: "group" as const,
    group,
  })),
]);

export function getDiscoverGroups(_tabId: DiscoverTabId = "discover") {
  return DISCOVER_GROUPS.filter(
    (group) => DISCOVER_GROUP_DEFINITIONS.find((definition) => definition.id === group.id)?.visibleInFeed !== false,
  );
}

export function getDiscoverGroup(_tabId: DiscoverTabId, groupId: string) {
  return getDiscoverGroups().find((group) => group.id === groupId);
}
