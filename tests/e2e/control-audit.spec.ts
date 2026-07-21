import { test } from "./fixtures";
import {
  AccessAudit,
  CaseAudit,
  ConfirmationAudit,
  IntakeAudit,
  LookupAudit,
  MasterPlanAudit,
  PartyAudit,
  SearchAudit,
  assertIntakeLifecycleCoverage,
} from "./page-objects/control-audit";

test.describe("Every visible enabled control has deterministic behavior", () => {
  test("source intake lifecycle s0 through s13 has exact audit ownership", () => {
    assertIntakeLifecycleCoverage();
  });

  test("login, header, navigation, and dashboard match their inventories and behaviors", async ({ page }) => {
    await new AccessAudit(page).run();
  });

  test("case, party, and recent search states match their inventories and behaviors", async ({ page }) => {
    await new SearchAudit(page).run();
  });

  test("every inventoried search result is independently exercised", async ({ page }) => {
    await new SearchAudit(page).runEveryResult();
  });

  test("master plan controls match their inventory and behaviors", async ({ page }) => {
    await new MasterPlanAudit(page).run();
  });

  test("party profile, edit, contact, and communication states match their inventories and behaviors", async ({ page }) => {
    await new PartyAudit(page).run();
  });

  test("every intake stage matches its explicit control inventory and behavior", async ({ page, request }) => {
    await new IntakeAudit(page, request).runStages();
  });

  test("intake calendar, absence, and provider modal states match their inventories and behaviors", async ({ page, request }) => {
    await new IntakeAudit(page, request).runTransientStates();
  });

  test("every inventoried calendar day independently mutates its exact date field", async ({ page, request }) => {
    await new IntakeAudit(page, request).runEveryCalendarDay();
  });

  test("confirmation root, absence, and GDC links match their inventory and behaviors", async ({ page, request }) => {
    await new ConfirmationAudit(page, request).run();
  });

  test("notification and absence case tabs and panels match their inventories and behaviors", async ({ page }) => {
    await new CaseAudit(page).runNotificationAndAbsence();
  });

  test("GDC diagnosis and provider states match their inventories and behaviors", async ({ page }) => {
    await new CaseAudit(page).runGdc();
  });

  test("every inventoried diagnosis result independently adds its exact row", async ({ page }) => {
    await new CaseAudit(page).runEveryDiagnosisResult();
  });

  test("every lookup route matches its explicit control inventory and behavior", async ({ page }) => {
    await new LookupAudit(page).run();
  });
});
