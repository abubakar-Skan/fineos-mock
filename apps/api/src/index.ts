import type { ApiResult } from "@fineos/contracts";

export function describeHealth(): ApiResult<"ok", never> {
  return { ok: true, value: "ok" };
}
