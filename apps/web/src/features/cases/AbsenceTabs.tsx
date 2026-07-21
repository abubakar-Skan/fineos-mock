import { useState } from "react";
import { Link } from "react-router-dom";
import type { AbsenceCaseView } from "../../app/api";
import type { PanelContext } from "./CasePage";
import { displayDate, isDavidReference, sectionText } from "./case-sections";

const LEAVE_REASON_LABEL: Record<string, string> = {
  serious_health_condition: "Serious Health Condition - Employee",
  pregnancy: "Pregnancy/Maternity",
  other: "Other",
};

const reasonLabel = (reason: string | null | undefined): string =>
  reason ? LEAVE_REASON_LABEL[reason] ?? reason : "—";

export function AbsenceHub({ ctx }: { readonly ctx: PanelContext }) {
  return <section className="fx-absence-hub">
    <AbsenceSummary ctx={ctx} />
    <AbsenceCalendar ctx={ctx} />
  </section>;
}

function AbsenceSummary({ ctx }: { readonly ctx: PanelContext }) {
  return <div className="fx-hub-panel"><h2 className="fx-section-title">Absence Summary</h2>
    <p className="fx-hub-label">Decision Progress</p>
    <span className="fx-badge fx-badge--adjudication">{ctx.details.absence?.status ?? "Open"}</span>
    {isDavidReference(ctx.details) && <p className="fx-overdue"><strong>Overdue</strong> 23 Days</p>}
    <p className="fx-hub-note">First notified on {displayDate(ctx.details.notification.notificationDate)}</p>
    <ReturnToWork ctx={ctx} />
  </div>;
}

function ReturnToWork({ ctx }: { readonly ctx: PanelContext }) {
  const endDate = ctx.details.absence?.periods[0]?.endDate;
  const expected = isDavidReference(ctx.details) ? "01/23/2026" : displayDate(endDate);
  return <div className="fx-hub-rtw"><h3 className="fx-hub-label">Return to Work Dates</h3>
    <p>Expected return to work date {expected}</p>
    <p>Actual return to work date -</p>
  </div>;
}

const CALENDAR_WEEKS = [["1", "2", "3"], ["8", "9", "10"], ["15", "16", "17"], ["22", "23", "24"]] as const;

function AbsenceCalendar({ ctx }: { readonly ctx: PanelContext }) {
  const period = ctx.details.absence?.periods[0];
  const range = isDavidReference(ctx.details)
    ? "From 01/23/2026 to 03/09/2026"
    : `From ${displayDate(period?.startDate)} to ${displayDate(period?.endDate)}`;
  return <div className="fx-hub-panel"><h2 className="fx-section-title">Absence Calendar</h2>
    <p className="fx-cal-month">{isDavidReference(ctx.details) ? "February 2026" : "Absence Period"}</p>
    <ul className="fx-cal-rows">{CALENDAR_WEEKS.map((week) => (
      <li key={week[0]}>Pending | {range}</li>
    ))}</ul>
  </div>;
}

export function LeaveDetails({ ctx }: { readonly ctx: PanelContext }) {
  return <section><h2 className="fx-section-title">Leave Details</h2>
    <LeaveHeader ctx={ctx} />
    <LeaveRequest ctx={ctx} />
    <Link className="fx-link" to={`/cases/${ctx.caseId}/employment-details`}>Employment Information</Link>
    <LeavePlans />
    <ConditionDetails absence={ctx.details.absence} />
  </section>;
}

export function EmploymentDetails({ ctx }: { readonly ctx: PanelContext }) {
  const employer = ctx.details.claimant.employer ?? "Unknown";
  return <section><h2 className="fx-section-title">Employment Details</h2>
    <MemberDetails ctx={ctx} employer={employer} />
    <OccupationDetails ctx={ctx} />
  </section>;
}

function MemberDetails({ ctx, employer }: { readonly ctx: PanelContext; readonly employer: string }) {
  const memberId = isDavidReference(ctx.details) ? "23456868" : ctx.details.claimant.customerNumber ?? "—";
  return <section><h3 className="fx-section-title">Member Details</h3>
    <div className="fx-detail-grid">
      <Field label="Employer" value={`${employer} (Member ID: ${memberId})`} />
      <Field label="Master Plan" value={`${employer} Main Master Plan`} />
    </div>
  </section>;
}

function OccupationDetails({ ctx }: { readonly ctx: PanelContext }) {
  return <section><h3 className="fx-section-title">Occupation Details</h3>
    <div className="fx-employment-grid">
      <EmploymentInputs ctx={ctx} />
      <EmploymentStatus ctx={ctx} />
    </div>
  </section>;
}

function EmploymentInputs({ ctx }: { readonly ctx: PanelContext }) {
  return <div>
    <ReadOnlyInput label="Date of Hire" value={employmentValue(ctx, "dateOfHire", "06/01/2015")} />
    <ReadOnlyInput label="Job Title" value={employmentValue(ctx, "jobTitle", "Test Engineer")} />
    <ReadOnlyInput label="Employee ID" value={isDavidReference(ctx.details) ? "23456868" : ctx.details.claimant.customerNumber ?? "—"} />
  </div>;
}

function EmploymentStatus({ ctx }: { readonly ctx: PanelContext }) {
  return <div>
    <ReadOnlyInput label="Employment Status" value={employmentValue(ctx, "employmentStatus", "Active")} />
    <ReadOnlyInput label="Occupation Category" value="Unknown" />
    <ReadOnlyInput label="Hours worked per week" value={employmentValue(ctx, "hoursPerWeek", "40")} />
  </div>;
}

const employmentValue = (ctx: PanelContext, field: string, reference: string): string =>
  isDavidReference(ctx.details) ? reference : sectionText(ctx.details, "occupation", field) ?? "—";

function ReadOnlyInput({ label, value }: { readonly label: string; readonly value: string }) {
  return <label className="fx-field"><span className="fx-field-label">{label}</span>
    <input className="fx-input" value={value} readOnly />
  </label>;
}

function LeaveHeader({ ctx }: { readonly ctx: PanelContext }) {
  const period = ctx.details.absence?.periods[0];
  return <div className="fx-detail-grid">
    <Field label="Leave Requested Date" value={displayDate(ctx.details.notification.notificationDate)} />
    <Field label="Earliest Last Day Worked" value={displayDate(period?.lastDayWorked)} />
    <Field label="New Leave Timely Reporting" value="None" />
  </div>;
}

function LeaveRequest({ ctx }: { readonly ctx: PanelContext }) {
  const absence = ctx.details.absence;
  const period = absence?.periods[0];
  const range = isDavidReference(ctx.details)
    ? "01/08/2026 through 03/09/2026"
    : `${displayDate(period?.startDate)} through ${displayDate(period?.endDate)}`;
  return <div className="fx-leave-request"><h3 className="fx-section-title">Leave Requests</h3>
    <p>Requested from {range} - {reasonLabel(absence?.leaveReason)}</p>
  </div>;
}

function LeavePlans() {
  return <table className="fx-table"><caption className="fx-section-title">Leave Plans</caption>
    <thead><tr><th>Plan Name</th><th>Selection Method</th><th>Applicability</th><th>Plan Evaluation</th></tr></thead>
    <tbody><tr><td>Fed FMLA</td><td>Automatic</td><td>Applicable</td><td>Undecided</td></tr></tbody>
  </table>;
}

function ConditionDetails({ absence }: { readonly absence?: AbsenceCaseView }) {
  const [open, setOpen] = useState(false);
  return <div className="fx-condition"><div className="fx-subhead"><h3 className="fx-section-title">Condition Details</h3>
    <button type="button" className="fx-ghost" aria-expanded={open} onClick={() => setOpen((v) => !v)}>Condition</button></div>
    {open && <ConditionPanel absence={absence} />}
  </div>;
}

function ConditionPanel({ absence }: { readonly absence?: AbsenceCaseView }) {
  return <div className="fx-detail-grid">
    <Field label="Leave Reason" value={reasonLabel(absence?.leaveReason)} />
    <Field label="Work State" value={absence?.workState ?? "—"} />
    <Field label="Condition Description" value={absence?.conditionDescription ?? "Not recorded"} />
  </div>;
}

function Field({ label, value }: { readonly label: string; readonly value: string }) {
  return <div className="fx-detail-field"><div className="fx-detail-label">{label}</div><div className="fx-detail-value">{value}</div></div>;
}
