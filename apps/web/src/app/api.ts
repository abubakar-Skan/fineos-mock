import type { ApiErrorCode, ApiResult } from "@fineos/contracts";

export interface SessionView {
  readonly token: string;
  readonly username: string;
}

export interface PartyView {
  readonly id: string;
  readonly customerNumber: string | null;
  readonly fullName: string;
  readonly partyType: string;
  readonly dateOfBirth: string | null;
  readonly employer: string | null;
  readonly phone: string | null;
  readonly homePhone: string | null;
  readonly email: string | null;
}

export interface CaseSummaryView {
  readonly caseId: string;
  readonly partyName: string;
  readonly scope: { readonly kind: string; readonly value?: string };
  readonly status: string;
}

export interface ContactInput {
  readonly phone: string | null;
  readonly email: string | null;
}

export interface ProviderInput {
  readonly firstName: string;
  readonly lastName: string;
}

type Result<T> = ApiResult<T, ApiErrorCode>;

const readJson = <T>(response: Response): Promise<Result<T>> =>
  response.json() as Promise<Result<T>>;

const get = async <T>(path: string): Promise<Result<T>> =>
  readJson<T>(await fetch(`/api${path}`));

const send = async <T>(path: string, method: string, body: unknown): Promise<Result<T>> =>
  readJson<T>(
    await fetch(`/api${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

const query = (value: string): string => encodeURIComponent(value);

export const login = (username: string, password: string): Promise<Result<SessionView>> =>
  send("/session", "POST", { username, password });

export const searchParties = (term: string): Promise<Result<readonly PartyView[]>> =>
  get(`/parties/search?term=${query(term)}`);

export const getParty = (id: string): Promise<Result<PartyView>> =>
  get(`/parties/${query(id)}`);

export const updateContact = (id: string, contact: ContactInput): Promise<Result<PartyView>> =>
  send(`/parties/${query(id)}/contact`, "PATCH", contact);

export const createProvider = (input: ProviderInput): Promise<Result<PartyView>> =>
  send("/providers", "POST", input);

export const searchCases = (term: string): Promise<Result<readonly CaseSummaryView[]>> =>
  get(`/cases/search?term=${query(term)}`);

export interface DraftInput {
  readonly source: string;
  readonly notificationDate: string;
}

export interface DraftCreatedView {
  readonly draftId: string;
  readonly scope: { readonly kind: string; readonly value?: string };
}

export interface SubmissionView {
  readonly notificationId: string;
  readonly absenceCaseId: string | null;
  readonly gdcCaseId: string | null;
}

export const createNotification = (partyId: string, input: DraftInput): Promise<Result<DraftCreatedView>> =>
  send(`/parties/${query(partyId)}/notifications`, "POST", input);

export const saveSection = (
  draftId: string,
  sectionKey: string,
  body: Readonly<Record<string, unknown>>,
): Promise<Result<{ readonly saved: true }>> =>
  send(`/notifications/${query(draftId)}/sections/${query(sectionKey)}`, "PUT", body);

export const submitNotification = (draftId: string): Promise<Result<SubmissionView>> =>
  send(`/notifications/${query(draftId)}/submit`, "POST", {});

export interface NotificationDetailView {
  readonly id: string;
  readonly partyId: string;
  readonly source: string;
  readonly notificationDate: string;
  readonly scope: { readonly kind: string; readonly value?: string };
  readonly leaveReason?: string | null;
  readonly conditionDescription?: string | null;
  readonly workState?: string | null;
  readonly diagnosisCode?: string | null;
  readonly providerPartyId?: string | null;
  readonly status: string;
}

export interface AbsencePeriodView {
  readonly id: string;
  readonly lastDayWorked: string;
  readonly startDate: string;
  readonly endDate: string;
}

export interface AbsenceCaseView {
  readonly id: string;
  readonly leaveReason?: string | null;
  readonly conditionDescription?: string | null;
  readonly workState?: string | null;
  readonly status: string;
  readonly periods: readonly AbsencePeriodView[];
}

export interface GdcCaseView {
  readonly id: string;
  readonly providerPartyId?: string | null;
  readonly diagnosisCode?: string | null;
  readonly status: string;
}

export interface CaseDetailsView {
  readonly notification: NotificationDetailView;
  readonly absence?: AbsenceCaseView;
  readonly gdc?: GdcCaseView;
  readonly claimant: PartyView;
  readonly provider: PartyView | null;
  readonly sections: Readonly<Record<string, unknown>>;
}

export type ExecutionTrackView = "absence" | "gdc";

export interface ExecutionResultView {
  readonly caseId: string;
  readonly status: string;
  readonly activatedTracks: readonly ExecutionTrackView[];
  readonly diagnosisUpdated: boolean;
  readonly providerUpdated: boolean;
  readonly runId: string;
}

export interface ExecuteInput {
  readonly conditionDescription?: string;
  readonly diagnosisCode?: string;
  readonly providerDecision?:
    | { readonly kind: "attach"; readonly providerPartyId: string }
    | { readonly kind: "skip" };
  readonly override?: string;
}

export const getCase = (id: string): Promise<Result<CaseDetailsView>> =>
  get(`/cases/${query(id)}?mode=soft`);

export const executeCase = (id: string, input: ExecuteInput): Promise<Result<ExecutionResultView>> =>
  send(`/cases/${query(id)}/execute`, "POST", input);

export const getExecutionRun = (id: string, runId: string): Promise<Result<{ readonly id: string; readonly status: string }>> =>
  get(`/cases/${query(id)}/execution-runs/${query(runId)}`);
