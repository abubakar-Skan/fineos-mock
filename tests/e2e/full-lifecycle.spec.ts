import { expect, test } from "./fixtures";
import {
  completeEricaLeaveAndGdcIntake,
  signIn,
  startEricaNotification,
} from "./helpers";

test.describe("Full notification-to-execution lifecycle", () => {
  test("signs in, completes Erica intake, submits, searches the generated case, and executes it", async ({ page }) => {
    await signIn(page);

    const draftId = await startEricaNotification(page);
    await completeEricaLeaveAndGdcIntake(page);

    await expect(page.getByRole("heading", { name: /notification submitted/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: new RegExp(`Absence Case — ${draftId}-ABS-01`) })).toBeVisible();
    await expect(page.getByRole("heading", { name: new RegExp(`Group Disability Claim — ${draftId}-GDC-02`) })).toBeVisible();

    await searchGeneratedCase(page, draftId);
    await executeGeneratedCase(page, draftId);
  });
});

const searchGeneratedCase = async (page: import("@playwright/test").Page, draftId: string): Promise<void> => {
  await page.getByRole("button", { name: /open search/i }).click();
  const dialog = page.getByRole("dialog", { name: /case search/i });
  await dialog.getByLabel("Case Number").fill(draftId);
  await dialog.getByRole("button", { name: /^search$/i }).click();
  await expect(dialog.getByRole("button", { name: draftId })).toBeVisible();
  await dialog.getByRole("button", { name: draftId }).click();
  await expect(dialog.getByText(`Selected ${draftId}`)).toBeVisible();
  await dialog.getByRole("button", { name: /^ok$/i }).click();
};

const executeGeneratedCase = async (page: import("@playwright/test").Page, draftId: string): Promise<void> => {
  await page.goto(`/cases/${draftId}/general`);
  await expect(page.getByRole("heading", { name: new RegExp(draftId) })).toBeVisible();
  await page.getByRole("button", { name: /run case execution/i }).click();
  const banner = page.getByText(/case execution completed/i);
  await expect(banner).toBeVisible();
  await expect(banner).toContainText(/absence and gdc/i);
};
