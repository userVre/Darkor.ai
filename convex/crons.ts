import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

const crons = cronJobs();

crons.hourly("check pro trial expiry", { minuteUTC: 0 }, internal.users.checkProTrialExpiry);

export default crons;
