import { expect, test } from "./fixtures";
import {
  completeEricaLeaveAndGdcIntake,
  signIn,
  startEricaNotification,
} from "./helpers";

test.describe("Full notification-to-agent-handoff lifecycle", () => {
  test("signs in, completes Erica intake, submits, searches the generated case, and hands off to the agent", async ({ page, request }) => {
    await signIn(page);

    const draftId = await startEricaNotification(page);
    await completeEricaLeaveAndGdcIntake(page);

    await expect(page.getByRole("heading", { name: /notification submitted/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: new RegExp(`Absence Case — ${draftId}-ABS-01`) })).toBeVisible();
    await expect(page.getByRole("heading", { name: new RegExp(`Group Disability Claim — ${draftId}-GDC-02`) })).toBeVisible();

    await searchGeneratedCase(page, draftId);
    await assertAgentModeCase(page, request, draftId);
  });
});

const searchGeneratedCase = async (page: import("@playwright/test").Page, draftId: string): Promise<void> => {
  await page.getByRole("button", { name: /open search/i }).click();
  const dialog = page.getByRole("dialog", { name: /case search/i });
  await dialog.getByLabel("Case Number").fill(draftId);
  await dialog.getByRole("button", { name: /^search$/i }).click();
  await expect(dialog.getByRole("button", { name: draftId })).toBeVisible();
  await dialog.getByRole("button", { name: draftId }).click();
  await expect(page).toHaveURL(new RegExp(`/cases/${draftId}/general$`));
  await expect(page.getByRole("heading", { name: new RegExp(draftId) })).toBeVisible();
};

// Default agent-first mode: the generated case opens as a manual record with no
// Run Case Execution shortcut, and the execute endpoint does not exist (404).
// The external Playwright agent drives the case from here.
const assertAgentModeCase = async (
  page: import("@playwright/test").Page,
  request: import("@playwright/test").APIRequestContext,
  draftId: string,
): Promise<void> => {
  await page.goto(`/cases/${draftId}/general`);
  await expect(page.getByRole("heading", { name: new RegExp(draftId) })).toBeVisible();
  await expect(page.getByRole("button", { name: /run case execution/i })).toHaveCount(0);
  const res = await request.post(`/api/cases/${draftId}/execute`, { data: {} });
  expect(res.status()).toBe(404);
};
