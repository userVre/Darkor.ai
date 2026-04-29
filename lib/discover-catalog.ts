import {useMemo} from "react";
import {useTranslation} from "react-i18next";
import type {ImageSourcePropType} from "react-native";

import {GENERATED_DISCOVER_ASSETS, type GeneratedDiscoverAssetId} from "./generated-discover-assets";

export type DiscoverTabId = "discover";
export type DiscoverClusterId = "interiors" | "architecture" | "landscapes";
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
  renderKey: string;
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
  titleKey: string;
  clusterId: DiscoverClusterId;
  service: DiscoverService;
  visibleInFeed?: boolean;
};

const DISCOVER_GROUP_DEFINITIONS: DiscoverGroupDefinition[] = [
  { id: "kitchen", titleKey: "gallery.groups.kitchen", clusterId: "interiors", service: "interior" },
  { id: "living-room", titleKey: "gallery.groups.livingRoom", clusterId: "interiors", service: "interior" },
  { id: "dining-room", titleKey: "gallery.groups.diningRoom", clusterId: "interiors", service: "interior" },
  { id: "bedroom", titleKey: "gallery.groups.bedroom", clusterId: "interiors", service: "interior" },
  { id: "bathroom", titleKey: "gallery.groups.bathroom", clusterId: "interiors", service: "interior" },
  { id: "gaming-room", titleKey: "gallery.groups.gamingRoom", clusterId: "interiors", service: "interior" },
  { id: "home-office", titleKey: "gallery.groups.homeOffice", clusterId: "interiors", service: "interior" },
  { id: "coffee-shop", titleKey: "gallery.groups.coffeeShop", clusterId: "interiors", service: "interior" },
  { id: "study-room", titleKey: "gallery.groups.studyRoom", clusterId: "interiors", service: "interior" },
  { id: "restaurant", titleKey: "gallery.groups.restaurant", clusterId: "interiors", service: "interior" },
  { id: "attic", titleKey: "gallery.groups.attic", clusterId: "interiors", service: "interior" },
  { id: "toilet", titleKey: "gallery.groups.toilet", clusterId: "interiors", service: "interior" },
  { id: "balcony", titleKey: "gallery.groups.balcony", clusterId: "interiors", service: "interior" },
  { id: "hall", titleKey: "gallery.groups.hall", clusterId: "interiors", service: "interior" },
  { id: "deck", titleKey: "gallery.groups.deck", clusterId: "interiors", service: "interior" },
  { id: "villa", titleKey: "gallery.groups.villa", clusterId: "architecture", service: "exterior" },
  { id: "apartment", titleKey: "gallery.groups.apartment", clusterId: "architecture", service: "exterior" },
  { id: "house", titleKey: "gallery.groups.house", clusterId: "architecture", service: "exterior" },
  { id: "office-building", titleKey: "gallery.groups.officeBuilding", clusterId: "architecture", service: "exterior" },
  { id: "retail", titleKey: "gallery.groups.retail", clusterId: "architecture", service: "exterior" },
  { id: "residential", titleKey: "gallery.groups.residential", clusterId: "architecture", service: "exterior" },
  { id: "wall", titleKey: "gallery.groups.wall", clusterId: "landscapes", service: "foundation", visibleInFeed: false },
  { id: "floor", titleKey: "gallery.groups.floor", clusterId: "landscapes", service: "foundation", visibleInFeed: false },
  { id: "garden", titleKey: "gallery.groups.garden", clusterId: "landscapes", service: "garden" },
];

const DISCOVER_CLUSTER_TITLES: Record<DiscoverClusterId, string> = {
  interiors: "Interior",
  architecture: "Exterior",
  landscapes: "Garden",
};

function createDiscoverTileId(groupId: GeneratedDiscoverAssetId, clusterId: DiscoverClusterId, index: number) {
  return `${clusterId}:${groupId}:${index + 1}`;
}

function buildTiles(
  groupId: GeneratedDiscoverAssetId,
  clusterId: DiscoverClusterId,
  title: string,
  t: ReturnType<typeof useTranslation>["t"],
): DiscoverTile[] {
  return GENERATED_DISCOVER_ASSETS[groupId].map((image, index) => ({
    id: createDiscoverTileId(groupId, clusterId, index),
    title: t("gallery.imageTitleTemplate", { title, index: index + 1 }),
    previewTitle: title,
    categoryId: groupId,
    image,
  }));
}

function buildDiscoverGroups(t: ReturnType<typeof useTranslation>["t"]) {
  return DISCOVER_GROUP_DEFINITIONS.map((group) => {
    const title = t(group.titleKey);

    return {
      id: group.id,
      title,
      clusterId: group.clusterId,
      service: group.service,
      renderKey: `${group.clusterId}:${group.id}`,
      items: buildTiles(group.id, group.clusterId, title, t),
    };
  });
}

function buildDiscoverClusters(groups: DiscoverGroup[]) {
  return [
    {
      id: "interiors" as const,
      title: DISCOVER_CLUSTER_TITLES.interiors,
      groups: groups.filter((group) => group.clusterId === "interiors"),
    },
    {
      id: "architecture" as const,
      title: DISCOVER_CLUSTER_TITLES.architecture,
      groups: groups.filter((group) => group.clusterId === "architecture"),
    },
    {
      id: "landscapes" as const,
      title: DISCOVER_CLUSTER_TITLES.landscapes,
      groups: groups.filter(
        (group) =>
          group.clusterId === "landscapes"
          && DISCOVER_GROUP_DEFINITIONS.find((definition) => definition.id === group.id)?.visibleInFeed !== false,
      ),
    },
  ];
}

function buildDiscoverFeedRows(clusters: DiscoverCluster[]): DiscoverFeedRow[] {
  return clusters.flatMap((cluster) => [
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
}

export function useDiscoverGroups(_tabId: DiscoverTabId = "discover") {
  const { t, i18n } = useTranslation();

  return useMemo(() => {
    const groups = buildDiscoverGroups(t);
    return groups.filter(
      (group) => DISCOVER_GROUP_DEFINITIONS.find((definition) => definition.id === group.id)?.visibleInFeed !== false,
    );
  }, [i18n.language, t]);
}

export function useDiscoverClusters(_tabId: DiscoverTabId = "discover") {
  const { t, i18n } = useTranslation();

  return useMemo(() => {
    const groups = buildDiscoverGroups(t);
    return buildDiscoverClusters(groups);
  }, [i18n.language, t]);
}

export function useDiscoverFeedRows(_tabId: DiscoverTabId = "discover") {
  const { t, i18n } = useTranslation();

  return useMemo(() => {
    const groups = buildDiscoverGroups(t);
    const clusters = buildDiscoverClusters(groups);
    return buildDiscoverFeedRows(clusters);
  }, [i18n.language, t]);
}

export function useDiscoverGroup(_tabId: DiscoverTabId, groupId: string | undefined) {
  const groups = useDiscoverGroups();

  return useMemo(() => groups.find((group) => group.id === groupId), [groupId, groups]);
}
