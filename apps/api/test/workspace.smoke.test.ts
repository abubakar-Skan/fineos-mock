import { describe, expect, it } from "vitest";
import "@fineos/contracts";
import type { ApiResult } from "@fineos/contracts";

describe("api planned test path", () => {
  it("discovers contract imports under the app test directory", () => {
    const result: ApiResult<"ok", "FAILED"> = { ok: true, value: "ok" };

    expect(result.ok).toBe(true);
  });
});
