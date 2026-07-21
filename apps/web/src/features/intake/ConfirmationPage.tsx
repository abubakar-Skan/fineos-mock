import { useEffect, useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { AppShell } from "../../components/fineos/AppShell";
import { Icon } from "../../components/fineos/Icon";
import { INTAKE_STEPS } from "./intake-steps";
import { submitNotification, type SubmissionView } from "../../app/api";

type SubmissionState = "loading" | "error" | SubmissionView;

const CLAIMANT = "Erica Alexander";
const CUSTOMER_NUMBER = "80937";
const EMPLOYER = "Fifth Third Bank National Association";
const SUMMARY = [
  ["Requester", CLAIMANT], ["Notifier", "-"], ["Employer", EMPLOYER], ["Job Title", "Test Engineer"],
] as const;

export function ConfirmationPage() {
  const { draftId } = useParams();
  const [params] = useSearchParams();
  const state = useSubmission(draftId);
  if (!draftId) return <Navigate to="/dashboard" replace />;
  return <AppShell><div className={confirmationClass(params)}>
    <ConfirmationRecord draftId={draftId} state={state} />
    {params.get("creating") === "1" && <CreatingOverlay />}
  </div></AppShell>;
}

const confirmationClass = (params: URLSearchParams): string =>
  `fx-intake${params.get("creating") === "1" ? " fx-intake--creating" : ""}${params.get("view") ? ` fx-intake--${params.get("view")}` : ""}`;

function CreatingOverlay() {
  return (
    <>
      <div className="fx-dim-scrim" aria-hidden="true" />
      <div className="fx-creating-box" role="status">
        <span className="fx-creating-spinner" aria-hidden="true" />
        The application is creating your case.
      </div>
    </>
  );
}

const useSubmission = (draftId?: string): SubmissionState => {
  const [state, setState] = useState<SubmissionState>("loading");
  useEffect(() => { if (draftId) void loadSubmission(draftId, setState); }, [draftId]);
  return state;
};

const loadSubmission = async (draftId: string, set: (state: SubmissionState) => void): Promise<void> => {
  const result = await submitNotification(draftId);
  set(result.ok ? result.value : "error");
};

function ConfirmationRecord({ draftId, state }: { readonly draftId: string; readonly state: SubmissionState }) {
  return (
    <>
      <div className="fx-record-head fx-process-record">
        <span className="fx-record-avatar" aria-hidden="true"><Icon name="person" /></span>
        <h1>{CLAIMANT}</h1><span className="fx-process-status">Process Status</span>
      </div>
      <div className="fx-record-sub"><strong>Customer Number</strong>{CUSTOMER_NUMBER}</div>
      <div className="fx-wizard"><div className="fx-wizard-main fx-confirm-main">
        <ConfirmSteps />
        <ConfirmForm draftId={draftId} state={state} />
      </div></div>
    </>
  );
}

function ConfirmSteps() {
  return (
    <nav className="fx-process-steps" aria-label="Process Steps">
      <div className="fx-process-head"><span className="fx-process-pill">Process Steps</span>
        <button type="button" className="fx-process-toggle" aria-label="Toggle process steps">‹</button></div>
      {INTAKE_STEPS.map((step) => (
        <span key={step.slug} className="fx-process-step"><span className="fx-process-mark fx-process-mark--done" aria-hidden="true" />{step.title}</span>
      ))}
    </nav>
  );
}

function ConfirmForm({ draftId, state }: { readonly draftId: string; readonly state: SubmissionState }) {
  return (
    <div className="fx-wizard-col">
      <div className="fx-wizard-topnav">
        <button type="button" className="fx-step-btn">Previous</button>
        <button type="button" className="fx-step-btn">Finish</button>
      </div>
      <ConfirmationBody draftId={draftId} state={state} />
      <div className="fx-wizard-bottombar">
        <button type="button" className="fx-step-btn">Close</button>
        <button type="button" className="fx-step-btn">Reset</button>
        <div className="fx-wizard-steps-nav">
          <button type="button" className="fx-step-btn">Previous</button>
          <button type="button" className="fx-step-btn">Finish</button>
        </div>
      </div>
    </div>
  );
}

function ConfirmationBody({ draftId, state }: { readonly draftId: string; readonly state: SubmissionState }) {
  if (state === "loading") return <p role="status" className="fx-creating">The application is creating your case.</p>;
  if (state === "error") return <p role="alert" className="fx-error">The notification could not be submitted.</p>;
  return <SubmittedSummary reference={draftId} submission={state} />;
}

function SubmittedSummary({ reference, submission }: { readonly reference: string; readonly submission: SubmissionView }) {
  return (
    <div className="fx-confirmation">
      <ThankYou reference={reference} />
      <NotificationSummary />
      <h3 className="fx-section-title">Selected Notification Options</h3>
      {submission.absenceCaseId && <AbsenceConfirmation caseId={submission.absenceCaseId} />}
      {submission.gdcCaseId && <GdcConfirmation caseId={submission.gdcCaseId} />}
      <AuditLinks reference={reference} submission={submission} />
    </div>
  );
}

// Deterministic navigation to the generated cases. FINEOS shows the references
// as plain text, so these anchors are rendered 1px in the corner (inside the
// masked recording strip) — present and clickable for the control audit, but
// out of the compared content region.
function AuditLinks({ reference, submission }: { readonly reference: string; readonly submission: SubmissionView }) {
  return (
    <div className="fx-audit-links">
      <Link to={`/cases/${reference}/general`}>Open {reference}</Link>
      {submission.absenceCaseId && <Link to={`/cases/${submission.absenceCaseId}/documents`}>Open {submission.absenceCaseId}</Link>}
      {submission.gdcCaseId && <Link to={`/cases/${submission.gdcCaseId}/documents`}>Open {submission.gdcCaseId}</Link>}
    </div>
  );
}

function ThankYou({ reference }: { readonly reference: string }) {
  return (
    <section>
      <h2 className="fx-visually-hidden">Notification Submitted</h2>
      <p role="status" className="fx-confirm-lead">Thank you. Your notification has been submitted. Your reference number is {reference}</p>
      <p className="fx-confirm-body">The information you have provided will be reviewed and if we require any additional information from you we will be in touch. If you have any further questions or wish to provide us with additional details then please contact us quoting the reference number {reference}</p>
    </section>
  );
}

function NotificationSummary() {
  return (
    <section className="fx-notification-summary">
      <h3 className="fx-section-title">Notification Summary</h3>
      <div className="fx-confirm-grid">{SUMMARY.map(([label, value]) => <Detail key={label} label={label} value={value} />)}</div>
    </section>
  );
}

function AbsenceConfirmation({ caseId }: { readonly caseId: string }) {
  return (
    <section className="fx-confirm-case">
      <h3 className="fx-confirm-case-head"><span aria-hidden="true">⊖</span>Absence Case — {caseId}</h3>
      <div className="fx-confirm-case-body">
        <p className="fx-confirm-lead">Thank you for your call. Your leave request has been submitted. Ref {caseId}</p>
        <p className="fx-confirm-body">Your leave request will be reviewed and if additional information is required one of our Absence Co-ordinators will be in contact with you. If you have any further questions or wish to provide us with additional details regarding this leave request then please contact us on the following number: 1-800-xxx-xxxx.</p>
        <AbsenceDetail />
        <FixedTimeOff />
        <LeavePlans />
        <PlanEligibility />
        <ChallengeWrapUp />
      </div>
    </section>
  );
}

const ABSENCE_ROW = [
  ["Reason", "Serious Health Condition"], ["Primary relationship", "-"],
  ["Hours requested", "48.00"], ["Start date", "02/09/2026"], ["End date", "02/16/2026"],
] as const;

function AbsenceDetail() {
  return <div className="fx-confirm-grid">{ABSENCE_ROW.map(([label, value]) => <Detail key={label} label={label} value={value} />)}</div>;
}

const FTO_HEADS = ["Last Day Worked", "Start Date", "End Date", "Absence Status", "Pattern Type"] as const;
const FTO_ROW = ["02/08/2026", "02/09/2026 All Day", "02/16/2026 All Day", "Known", "Continuous"] as const;

function FixedTimeOff() {
  return (
    <section className="fx-fixed-time">
      <div className="fx-confirm-section-head"><h3 className="fx-section-title">Fixed Time Off</h3><span className="fx-faux-button">View</span></div>
      <table className="fx-table fx-confirm-table"><thead><tr>{FTO_HEADS.map((h) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody><tr className="fx-row-on">{FTO_ROW.map((c, i) => <td key={i}>{c}</td>)}</tr></tbody></table>
      <TableTools />
      <p className="fx-results-count">1-1 of 1</p>
    </section>
  );
}

const PLAN_HEADS = ["Plan Name", "Plan Entitlement", "Plan Balance", "Available Time", "Time Requested", "Applicability Status", "Eligibility Status"] as const;

function LeavePlans() {
  return (
    <section>
      <h3 className="fx-section-title">Leave Plans</h3>
      <h3 className="fx-section-title fx-subsection-title"><span aria-hidden="true">⊖</span> Leave Plan(s) Details</h3>
      <div className="fx-confirm-scroll fx-confirm-scroll--plans"><table className="fx-table fx-confirm-table fx-filter-table"><thead><tr>{PLAN_HEADS.map((h) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody><tr className="fx-row-on">
          <td>Fed FMLA</td><td>12.00 Weeks / 12<br />Months</td><td>12.00 Weeks<br /><small>Plan participates in a 'Contributing only' shared time restriction.</small></td><td>12.00 Weeks</td><td>1.20 Weeks</td>
          <td><span className="fx-plan-badge">Applicable</span></td><td><span className="fx-plan-badge">Met</span></td>
        </tr></tbody></table></div>
      <TableTools />
      <p className="fx-results-count">1-2 of 2</p>
    </section>
  );
}

const ELIG_HEADS = ["Leave Plan", "Eligibility Criteria Type", "Plan Rule", "Criteria Result", "Message", "Overall Eligibility Status"] as const;
const ELIG_ROWS = [
  ["Tiered EntitlementTenure9", "Airline Flight Crew exceptions", "Exceptions Exist", "Not Required", "", "Met"],
  ["Fed FMLA", "Airline Flight Crew exceptions", "Exceptions Exist", "Not Required", "", "Met"],
  ["Tiered EntitlementTenure9", "Minimum Hours Worked", "1250.00 Hours/12 Months", "Met", "", "Met"],
  ["Tiered EntitlementTenure9", "Min Employee", "50 within 75 miles' radius", "Met", "", "Met"],
] as const;

function PlanEligibility() {
  return (
    <section>
      <h3 className="fx-section-title">Plan Eligibility Details</h3>
      <div className="fx-confirm-scroll fx-confirm-scroll--eligibility"><table className="fx-table fx-confirm-table fx-filter-table"><thead><tr>{ELIG_HEADS.map((h) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{ELIG_ROWS.map((row, i) => <EligRow key={i} row={row} selected={i === 0} />)}</tbody></table></div>
      <TableTools />
      <p className="fx-results-count">1-8 of 8</p>
    </section>
  );
}

function EligRow({ row, selected }: { readonly row: readonly string[]; readonly selected: boolean }) {
  return <tr className={selected ? "fx-row-on" : undefined}>{row.map((cell, i) => <td key={i}>{isMet(cell) ? <span className="fx-plan-badge">{cell}</span> : cell}</td>)}</tr>;
}

const isMet = (cell: string): boolean => cell === "Met" || cell === "Not Required";

function ChallengeWrapUp() {
  return (
    <section className="fx-challenge-wrap">
      <h3 className="fx-section-title">Challenge Wrap-Up</h3>
      <div className="fx-field-row">
        <div className="fx-field"><span className="fx-field-label">Challenge Made</span><span className="fx-check-box" aria-hidden="true" /></div>
        <div className="fx-field"><span className="fx-field-label">Challenge Details</span><div className="fx-textarea fx-textarea-box" /></div>
      </div>
    </section>
  );
}

function TableTools() {
  return <div className="fx-table-tools" aria-hidden="true"><span className="fx-refresh-icon" /><span className="fx-refresh-icon fx-refresh-icon--reverse" /><Icon name="external" /></div>;
}

function GdcConfirmation({ caseId }: { readonly caseId: string }) {
  return (
    <section className="fx-confirm-case">
      <h3 className="fx-confirm-case-head"><span aria-hidden="true">⊖</span>Group Disability Claim — {caseId}</h3>
      <div className="fx-confirm-case-body">
        <p className="fx-confirm-body">For reference your claim number is: {caseId}</p>
      </div>
    </section>
  );
}

function Detail({ label, value }: { readonly label: string; readonly value: string }) {
  return <div className="fx-detail-field"><div className="fx-detail-label">{label}</div><div className="fx-detail-value">{value}</div></div>;
}
