import { mutationGeneric } from "convex/server";
import { v } from "convex/values";

import { claimDailyDiamondForViewer } from "./users";

export const claimDailyDiamond = mutationGeneric({
  args: {
    anonymousId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await claimDailyDiamondForViewer(ctx, args);
  },
});
