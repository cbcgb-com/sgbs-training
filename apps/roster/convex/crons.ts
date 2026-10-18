import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// America/New_York midnight is 04:00 or 05:00 UTC. An hourly tick is
// close enough: write today's NY date (queries that read appMeta.todayNy
// re-run) and sweep students whose past blanks just became the 2nd miss.
crons.interval(
  "NY calendar + absence withdrawal sweep",
  { hours: 1 },
  internal.attendanceStatus.dailySweep,
);

export default crons;
