import { expect, test } from "./fixtures";
import {
  DAVID_CASE_ID,
  MISSING_CASE_ID,
  apiCreateDraft,
  apiExecute,
  apiGetCase,
  apiSaveSection,
  apiSubmit,
  executeConcurrently,
  expectConcurrentExecutionGuarded,
  nextButton,
} from "./helpers";

test.describe("Negative branches", () => {
  test("should reject advancing intake when no Leave or GDC component is selected", async ({ page }) => {
    await page.goto("/notifications/NTN-UNSELECTED/intake/notification-options");
    await nextButton(page).click();
    await expect(page.getByRole("alert")).toContainText(/at least one leave or gdc component/i);
    await expect(page).toHaveURL(/\/intake\/notification-options/);
  });

  test("should return a typed not-found result when a case does not exist", async ({ request }) => {
    const body = await apiGetCase(request, MISSING_CASE_ID);
    expect(body.ok).toBe(false);
    expect((body as { error: string }).error).toBe("case_not_found");
  });

  test("should return the same generated references and refuse edits when a notification is submitted twice", async ({ request }) => {
    const draftId = await apiCreateDraft(request);
    await apiSaveSection(request, draftId, "notificationOptions", options(true, false, false));
    const first = await apiSubmit(request, draftId);
    const second = await apiSubmit(request, draftId);
    expect(first.ok && second.ok).toBe(true);
    expect(second).toEqual(first);
    const edit = await apiSaveSection(request, draftId, "occupation", {});
    expect(edit.ok).toBe(false);
    expect((edit as { error: string }).error).toBe("already_submitted");
  });

  test("should escalate as ineligible intake when only an accommodation is requested", async ({ request }) => {
    const draftId = await apiCreateDraft(request);
    await apiSaveSection(request, draftId, "notificationOptions", options(false, true, false));
    await apiSubmit(request, draftId);
    const run = await apiExecute(request, draftId);
    expect(run.ok).toBe(true);
    expect((run as { value: { status: string } }).value.status).toBe("ESCALATED_INELIGIBLE_INTAKE");
  });

  test("should escalate as conditions-not-met when a serious health condition has no description", async ({ request }) => {
    const draftId = await apiCreateDraft(request);
    await apiSaveSection(request, draftId, "notificationOptions", options(true, false, false));
    await apiSaveSection(request, draftId, "leaveReason", { leaveReason: "serious_health_condition" });
    await apiSubmit(request, draftId);
    const run = await apiExecute(request, draftId);
    expect(run.ok).toBe(true);
    expect((run as { value: { status: string } }).value.status).toBe("ESCALATED_CONDITIONS_NOT_MET");
  });

  test("should complete a GDC claim without updating a provider when the provider is skipped", async ({ request }) => {
    const draftId = await apiCreateDraft(request);
    await apiSaveSection(request, draftId, "notificationOptions", options(false, false, true));
    await apiSaveSection(request, draftId, "medicalDetails", { diagnosisCode: "O80" });
    await apiSubmit(request, draftId);
    const run = await apiExecute(request, draftId, { providerDecision: { kind: "skip" } });
    expect(run.ok).toBe(true);
    expect((run as { value: { status: string; providerUpdated: boolean } }).value.status).toBe("COMPLETED");
    expect((run as { value: { providerUpdated: boolean } }).value.providerUpdated).toBe(false);
  });

  test("should not allow two concurrent executions of the same case to both complete", async ({ request }) => {
    const results = await executeConcurrently(request, DAVID_CASE_ID);
    expectConcurrentExecutionGuarded(results);
  });
});

const options = (requestLeave: boolean, requestAccommodation: boolean, requestGdc: boolean) => ({
  requestLeave,
  requestAccommodation,
  requestGdc,
});
