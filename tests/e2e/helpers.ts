import { expect, type APIRequestContext, type Locator, type Page } from "@playwright/test";

export const ERICA_PARTY_ID = "PTY-80937";
export const DAVID_CASE_ID = "NTN-159898";
export const MISSING_CASE_ID = "NTN-000000";
export const MOCK_PASSWORD = "fineos";

export const nextButton = (page: Page): Locator =>
  page.getByRole("button", { name: /^(next|finish)$/i }).last();

export async function signIn(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Password").fill(MOCK_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL("**/dashboard");
}

export async function startEricaNotification(page: Page): Promise<string> {
  await page.goto(`/parties/${ERICA_PARTY_ID}`);
  await page.getByRole("button", { name: /create notification/i }).click();
  await page.waitForURL(/\/notifications\/NTN-\d+\/intake\/notification-details/);
  return draftIdFromUrl(page.url());
}

const draftIdFromUrl = (url: string): string => {
  const match = url.match(/notifications\/(NTN-\d+)/);
  if (!match) throw new Error(`No draft id found in URL: ${url}`);
  return match[1]!;
};

const advance = async (page: Page, slug: string): Promise<void> => {
  await nextButton(page).click();
  await page.waitForURL(`**/intake/${slug}`);
};

const selectBothComponents = async (page: Page): Promise<void> => {
  await page.getByRole("radio", { name: /accident or treatment required/i }).click();
  await page.getByRole("switch", { name: /request a leave/i }).click();
  await page.getByRole("switch", { name: /group disability claim/i }).click();
};

const addDiagnosisAndProvider = async (page: Page): Promise<void> => {
  await page.getByLabel("Diagnosis code or description")
    .selectOption("O80 - Encounter for full-term uncomplicated delivery");
  await page.getByRole("button", { name: /add medical provider/i }).click();
  const dialog = page.getByRole("dialog", { name: /choose the party/i });
  await dialog.getByRole("button", { name: /^search$/i }).click();
  await dialog.getByRole("button", { name: /travis larson/i }).click();
  await expect(page.getByText(/travis larson/i)).toBeVisible();
};

export async function completeEricaLeaveAndGdcIntake(page: Page): Promise<void> {
  await advance(page, "member-occupation");
  await advance(page, "notification-options");
  await selectBothComponents(page);
  await advance(page, "reason-for-absence");
  await page.getByLabel("Absence reason").selectOption("Serious Health Condition");
  await advance(page, "dates-of-absence");
  await advance(page, "work-absence-details");
  await advance(page, "additional-absence-details");
  await page.getByLabel(/additional detail/i).fill("Recovering from surgery");
  await advance(page, "incident-details");
  await advance(page, "policy-details");
  await advance(page, "earnings-details");
  await advance(page, "medical-details");
  await addDiagnosisAndProvider(page);
  await nextButton(page).click();
  await page.waitForURL("**/confirmation");
}

interface SubmissionBody {
  readonly notificationId: string;
  readonly absenceCaseId: string | null;
  readonly gdcCaseId: string | null;
}

interface ExecutionBody {
  readonly status: string;
  readonly providerUpdated: boolean;
  readonly activatedTracks: readonly string[];
}

type ApiSuccess<T> = { ok: true; value: T };
type ApiFailure = { ok: false; error: string; message: string };
type ApiBody<T> = ApiSuccess<T> | ApiFailure;
type ExecutionResponse = ApiBody<ExecutionBody>;

const draftDefaults = { source: "Phone", notificationDate: "2026-02-13" };

export async function apiCreateDraft(
  request: APIRequestContext,
  partyId: string = ERICA_PARTY_ID,
): Promise<string> {
  const res = await request.post(`/api/parties/${partyId}/notifications`, { data: draftDefaults });
  const body = (await res.json()) as ApiBody<{ draftId: string }>;
  if (!body.ok) throw new Error(`createDraft failed: ${body.error}`);
  return body.value.draftId;
}

export const apiSaveSection = async (
  request: APIRequestContext,
  draftId: string,
  key: string,
  data: Readonly<Record<string, unknown>>,
): Promise<ApiBody<{ saved: true }>> =>
  (await (await request.put(`/api/notifications/${draftId}/sections/${key}`, { data })).json()) as ApiBody<{ saved: true }>;

export const apiSubmit = async (
  request: APIRequestContext,
  draftId: string,
): Promise<ApiBody<SubmissionBody>> =>
  (await (await request.post(`/api/notifications/${draftId}/submit`, { data: {} })).json()) as ApiBody<SubmissionBody>;

export const apiExecute = async (
  request: APIRequestContext,
  caseId: string,
  decisions: Readonly<Record<string, unknown>> = {},
): Promise<ApiBody<ExecutionBody>> =>
  (await (await request.post(`/api/cases/${caseId}/execute`, { data: decisions })).json()) as ApiBody<ExecutionBody>;

export const executeConcurrently = (
  request: APIRequestContext,
  caseId: string,
): Promise<readonly ExecutionResponse[]> =>
  Promise.all([apiExecute(request, caseId), apiExecute(request, caseId)]);

export const expectConcurrentExecutionGuarded = (
  results: readonly ExecutionResponse[],
): void => {
  expect(results.map(normalizeExecutionResult).sort()).toEqual(["COMPLETED", "GUARDED"]);
};

const normalizeExecutionResult = (result: ExecutionResponse): string =>
  result.ok && result.value.status === "COMPLETED" ? "COMPLETED"
    : !result.ok && isExecutionGuard(result.error) ? "GUARDED"
      : `UNEXPECTED:${result.ok ? result.value.status : result.error}`;

const isExecutionGuard = (error: string): boolean =>
  error === "execution_in_progress" || error === "case_already_terminal";

export const apiGetCase = async (
  request: APIRequestContext,
  caseId: string,
): Promise<ApiBody<unknown>> =>
  (await (await request.get(`/api/cases/${caseId}`)).json()) as ApiBody<unknown>;
