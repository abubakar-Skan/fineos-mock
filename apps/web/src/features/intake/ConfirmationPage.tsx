import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { AppShell } from "../../components/fineos/AppShell";
import { submitNotification, type SubmissionView } from "../../app/api";

type SubmissionState = "loading" | "error" | SubmissionView;

const EMPLOYER = "Fifth Third Bank National Association";
const SUMMARY_DETAILS = [
  ["Requester", "Erica Alexander"], ["Notifier", "—"],
  ["Employer", EMPLOYER], ["Job Title", "Test Engineer"],
] as const;

export function ConfirmationPage() {
  const { draftId } = useParams();
  const state = useSubmission(draftId);
  if (!draftId) return <Navigate to="/dashboard" replace />;
  return <AppShell><ConfirmationRecord draftId={draftId} state={state} /></AppShell>;
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
        <span className="fx-record-avatar" aria-hidden="true">◱</span>
        <h1>Erica Alexander</h1>
        <span className="fx-process-status">Process Status</span>
      </div>
      <ConfirmationBody draftId={draftId} state={state} />
    </>
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
      {submission.absenceCaseId && <AbsenceConfirmation caseId={submission.absenceCaseId} />}
      {submission.gdcCaseId && <GdcConfirmation caseId={submission.gdcCaseId} />}
    </div>
  );
}

function ThankYou({ reference }: { readonly reference: string }) {
  return (
    <section>
      <h2 className="fx-wizard-title">Notification Submitted</h2>
      <p role="status" className="fx-confirm-lead">
        Thank you. Your notification has been submitted. Your reference number is <strong>{reference}</strong>
      </p>
      <Link className="fx-link" to={`/cases/${reference}/general`}>Open {reference}</Link>
    </section>
  );
}

function NotificationSummary() {
  return (
    <section>
      <h3 className="fx-section-title">Notification Summary</h3>
      <div className="fx-detail-grid">
        {SUMMARY_DETAILS.map(([label, value]) => <Detail key={label} label={label} value={value} />)}
      </div>
    </section>
  );
}

function AbsenceConfirmation({ caseId }: { readonly caseId: string }) {
  return (
    <section className="fx-confirm-case">
      <h3 className="fx-section-title">Absence Case — {caseId}</h3>
      <p>Thank you for your call. Your leave request has been submitted. Ref {caseId}</p>
      <Link className="fx-link" to={`/cases/${caseId}/documents`}>Open {caseId}</Link>
    </section>
  );
}

function GdcConfirmation({ caseId }: { readonly caseId: string }) {
  return (
    <section className="fx-confirm-case">
      <h3 className="fx-section-title">Group Disability Claim — {caseId}</h3>
      <p>For reference your claim number is: {caseId}</p>
      <Link className="fx-link" to={`/cases/${caseId}/documents`}>Open {caseId}</Link>
    </section>
  );
}

function Detail({ label, value }: { readonly label: string; readonly value: string }) {
  return <div className="fx-detail-field"><div className="fx-detail-label">{label}</div><div className="fx-detail-value">{value}</div></div>;
}
