import { describe, expect, it } from "vitest";
import { createDiagnosisCode, toCaseId } from "@fineos/contracts";
import { executeCase } from "../src/domain/case-execution";
import {
  aBlankDiagnosisCodeValue,
  aDiagnosisCodeValue,
  aMissingConditionDescription,
  aMissingDiagnosisCode,
  anExecutionInput,
} from "./builders";

describe("Case execution aggregate", () => {
  it("should create a diagnosis code when the value is present", () => {
    const value = aDiagnosisCodeValue(); // Given
    const result = createDiagnosisCode(value); // When
    expect(result).toEqual({ ok: true, value: "O80" }); // Then
  });

  it("should reject a diagnosis code when the value is blank", () => {
    const value = aBlankDiagnosisCodeValue(); // Given
    const result = createDiagnosisCode(value); // When
    expect(result).toMatchObject({ // Then
      ok: false,
      error: { kind: "INVALID_DIAGNOSIS_CODE" },
    });
  });

  it("should complete with the absence track when the case is absence only", () => {
    expect(
      executeCase(anExecutionInput({ componentScope: "absence_only" })),
    ).toMatchObject({
      ok: true,
      value: {
        status: "COMPLETED",
        activatedTracks: ["absence"],
        diagnosisUpdated: false,
        providerUpdated: false,
      },
    });
  });

  it("should complete with the gdc track when the case is gdc only", () => {
    expect(
      executeCase(anExecutionInput({ componentScope: "gdc_only" })),
    ).toMatchObject({
      ok: true,
      value: {
        status: "COMPLETED",
        activatedTracks: ["gdc"],
        diagnosisUpdated: true,
        providerUpdated: true,
      },
    });
  });

  it("should complete with both tracks when the case has absence and gdc components", () => {
    expect(
      executeCase(anExecutionInput({ componentScope: "absence_and_gdc" })),
    ).toMatchObject({
      ok: true,
      value: { status: "COMPLETED", activatedTracks: ["absence", "gdc"] },
    });
  });

  it("should mark the provider updated when provider details are attached", () => {
    expect(
      executeCase(anExecutionInput({ componentScope: "gdc_only", providerAttached: true })),
    ).toMatchObject({ ok: true, value: { status: "COMPLETED", providerUpdated: true } });
  });

  it("should complete without a provider update when provider details are skipped", () => {
    expect(
      executeCase(anExecutionInput({ componentScope: "gdc_only", providerAttached: false })),
    ).toMatchObject({ ok: true, value: { status: "COMPLETED", providerUpdated: false } });
  });

  it("should complete when a non-serious leave reason has no condition description", () => {
    expect(
      executeCase(
        anExecutionInput({
          leaveReason: "other",
          conditionDescription: aMissingConditionDescription(),
        }),
      ),
    ).toMatchObject({ ok: true, value: { status: "COMPLETED" } });
  });

  it("should escalate as case not found when the case is missing", () => {
    expect(executeCase(anExecutionInput({ caseFound: false }))).toMatchObject({
      ok: true,
      value: { status: "ESCALATED_CASE_NOT_FOUND", activatedTracks: [] },
    });
  });

  it("should escalate as ineligible intake when the intake type is not covered", () => {
    expect(
      executeCase(anExecutionInput({ intakeType: "accommodation_only" })),
    ).toMatchObject({ ok: true, value: { status: "ESCALATED_INELIGIBLE_INTAKE" } });
  });

  it("should escalate as conditions not met when a serious leave reason lacks a condition", () => {
    expect(
      executeCase(
        anExecutionInput({
          leaveReason: "serious_health_condition",
          conditionDescription: aMissingConditionDescription(),
        }),
      ),
    ).toMatchObject({ ok: true, value: { status: "ESCALATED_CONDITIONS_NOT_MET" } });
  });

  it("should reject execution when the case id is missing", () => {
    expect(executeCase(anExecutionInput({ caseId: toCaseId("") }))).toMatchObject({
      ok: false,
      error: { kind: "MISSING_CASE_ID" },
    });
  });

  it("should reject execution when a gdc case has no diagnosis code", () => {
    expect(
      executeCase(
        anExecutionInput({
          componentScope: "gdc_only",
          diagnosisCode: aMissingDiagnosisCode(),
          leaveReason: "other",
        }),
      ),
    ).toMatchObject({ ok: false, error: { kind: "MISSING_DIAGNOSIS_CODE" } });
  });
});
