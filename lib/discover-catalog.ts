import { DISCOVER_SECTIONS, type DiscoverSectionId, type DiscoverTile } from "./data";

export type DiscoverTabId = DiscoverSectionId;

export type DiscoverTab = {
  id: DiscoverTabId;
  label: string;
};

export type DiscoverGroup = {
  id: string;
  title: string;
  items: DiscoverTile[];
};

export const DISCOVER_TABS: DiscoverTab[] = DISCOVER_SECTIONS.map((section) => ({
  id: section.id,
  label: section.title,
}));

function slugifyGroupId(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function buildDiscoverGroups(tabId: DiscoverTabId): DiscoverGroup[] {
  const section = DISCOVER_SECTIONS.find((candidate) => candidate.id === tabId);
  if (!section) {
    return [];
  }

  const grouped = new Map<string, DiscoverGroup>();

  for (const item of section.items) {
    const title = item.spaceType?.trim() || section.title;
    const id = slugifyGroupId(title) || tabId;
    const existing = grouped.get(id);

    if (existing) {
      existing.items.push(item);
      continue;
    }

    grouped.set(id, {
      id,
      title,
      items: [item],
    });
  }

  return Array.from(grouped.values());
}

export function getDiscoverGroups(tabId: DiscoverTabId) {
  return buildDiscoverGroups(tabId);
}

export function getDiscoverGroup(tabId: DiscoverTabId, groupId: string) {
  return buildDiscoverGroups(tabId).find((group) => group.id === groupId);
}

export type { DiscoverTile };
