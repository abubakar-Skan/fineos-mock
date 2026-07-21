import { describe, expect, it } from "vitest";
import "@fineos/contracts";
import type { ApiResult } from "@fineos/contracts";

describe("web workspace smoke check", () => {
  it("resolves ApiResult from @fineos/contracts", () => {
    const result: ApiResult<{ id: string }, "NOT_FOUND"> = {
      ok: true,
      value: { id: "party-1" },
    };

    expect(result.ok).toBe(true);
  });
});
