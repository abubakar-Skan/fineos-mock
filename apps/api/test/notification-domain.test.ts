import { describe, expect, it } from "vitest";
import {
  createNotification,
  submitNotification,
} from "../src/domain/notification";
import {
  aGdcOnlyDraft,
  aLeaveAndGdcDraft,
  aLeaveOnlyDraft,
  aNotification,
  anAccommodationOnlyDraft,
  anEmptyScopeDraft,
} from "./builders";

describe("Notification intake aggregate", () => {
  it("should activate the leave section when only leave is requested", () => {
    expect(createNotification(aLeaveOnlyDraft())).toMatchObject({
      ok: true,
      value: { scope: "leave_only" },
    });
  });

  it("should activate the gdc section when only group disability is requested", () => {
    expect(createNotification(aGdcOnlyDraft())).toMatchObject({
      ok: true,
      value: { scope: "gdc_only" },
    });
  });

  it("should activate both sections when leave and group disability are requested", () => {
    expect(createNotification(aLeaveAndGdcDraft())).toMatchObject({
      ok: true,
      value: { scope: "leave_and_gdc" },
    });
  });

  it("should treat an accommodation request as the leave section", () => {
    expect(createNotification(anAccommodationOnlyDraft())).toMatchObject({
      ok: true,
      value: { scope: "leave_only" },
    });
  });

  it("should reject the notification when no component is requested", () => {
    expect(createNotification(anEmptyScopeDraft())).toMatchObject({
      ok: false,
      error: { kind: "UNSUPPORTED_COMPONENT_SCOPE" },
    });
  });

  it("should create only the absence case when submitting a leave-only notification", () => {
    expect(submitNotification(aNotification("leave_only"))).toEqual({
      ok: true,
      value: { scope: "leave_only", createsAbsenceCase: true, createsGdcCase: false },
    });
  });

  it("should create only the gdc case when submitting a gdc-only notification", () => {
    expect(submitNotification(aNotification("gdc_only"))).toEqual({
      ok: true,
      value: { scope: "gdc_only", createsAbsenceCase: false, createsGdcCase: true },
    });
  });

  it("should create both cases when submitting a combined notification", () => {
    expect(submitNotification(aNotification("leave_and_gdc"))).toEqual({
      ok: true,
      value: { scope: "leave_and_gdc", createsAbsenceCase: true, createsGdcCase: true },
    });
  });
});
