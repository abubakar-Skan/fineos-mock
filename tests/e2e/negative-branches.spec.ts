import { expect, test } from "./fixtures";
import {
  DAVID_CASE_ID,
  MISSING_CASE_ID,
  apiCreateDraft,
  apiGetCase,
  apiSaveSection,
  apiSubmit,
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

  // Default agent-first mode: the execute shortcut is not registered, so it is
  // an ordinary 404. Orchestration branch coverage (ineligible intake,
  // conditions-not-met, provider skip, concurrent guard) lives in the
  // code-enabled API tests (apps/api/test/api.test.ts).
  test("should not expose the case-execution shortcut in default agent mode", async ({ request }) => {
    const res = await request.post(`/api/cases/${DAVID_CASE_ID}/execute`, { data: {} });
    expect(res.status()).toBe(404);
  });
});

const options = (requestLeave: boolean, requestAccommodation: boolean, requestGdc: boolean) => ({
  requestLeave,
  requestAccommodation,
  requestGdc,
});
