import { ntn159898Seed } from "./ntn-159898.ts";
import { ntn170001Seed } from "./ntn-170001.ts";
import { ntn170002Seed } from "./ntn-170002.ts";
import { ntn170003Seed } from "./ntn-170003.ts";
import { ntn170004Seed } from "./ntn-170004.ts";
import type { Process2CaseSeed } from "./types";

// The single ordered source of the Process 2 case fixtures. seed.ts reads this
// array and derives every party/notification/component row from it, so a new
// scenario becomes live simply by adding its module here.
export const PROCESS2_CASE_SEEDS: readonly Process2CaseSeed[] = [
  ntn159898Seed,
  ntn170001Seed,
  ntn170002Seed,
  ntn170003Seed,
  ntn170004Seed,
];
