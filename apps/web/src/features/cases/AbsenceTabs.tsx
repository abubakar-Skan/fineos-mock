import { useState } from "react";
import { Link } from "react-router-dom";
import type {
  AbsenceCalendar,
  AbsenceConditionDetails,
  AbsenceHub as AbsenceHubData,
  LeavePlan,
  LeaveRequest,
  ReturnToWorkDetails,
} from "@fineos/contracts";
import type { PanelContext } from "./CasePage";
import { FieldView, PanelList } from "./dossier-ui";

export function AbsenceHub({ ctx }: { readonly ctx: PanelContext }) {
  const absence = ctx.details.dossier.absence;
  if (!absence) return <AbsenceMissing />;
  return <section className="fx-absence-hub">
    <AbsenceSummary hub={absence.hub} />
    <AbsenceCalendarView calendar={absence.hub.calendar} />
  </section>;
}

function AbsenceMissing() {
  return <section><h2 className="fx-section-title">Absence Summary</h2>
    <p className="fx-empty-inline">No absence details available.</p></section>;
}

function AbsenceSummary({ hub }: { readonly hub: AbsenceHubData }) {
  return <div className="fx-hub-panel"><h2 className="fx-section-title">⊖ Absence Summary</h2>
    <div className="fx-hub-decision"><strong>DECISION PROGRESS</strong>
      <span className="fx-badge fx-badge--adjudication">{hub.decisionProgress}</span></div>
    {hub.overdue && <div className="fx-hub-overdue"><strong>{hub.overdue.label}</strong>
      <b>⚠ {hub.overdue.days}<small> Days</small></b><span>{hub.overdue.date}</span></div>}
    <p className="fx-hub-note"><strong>First notified on</strong><br />{hub.firstNotifiedOn}</p>
    <ReturnToWork rtw={hub.returnToWork} />
    <h3 className="fx-hub-label">SHARED NOTES</h3>
    <p className="fx-hub-note">{hub.sharedNotes}</p>
  </div>;
}

function ReturnToWork({ rtw }: { readonly rtw: ReturnToWorkDetails }) {
  return <div className="fx-hub-rtw"><h3 className="fx-hub-label">RETURN TO WORK DATES</h3>
    <p><strong>Expected return to work date</strong><br />{rtw.expectedDate}</p>
    <p><strong>Actual return to work date</strong><br />{rtw.actualDate}</p>
    <p><strong>Intend to return to work</strong><br />{rtw.intention}</p>
  </div>;
}

function AbsenceCalendarView({ calendar }: { readonly calendar: AbsenceCalendar }) {
  return <div className="fx-hub-panel"><h2 className="fx-section-title">⊖ {calendar.title}</h2>
    <div className="fx-cal-card"><p className="fx-cal-month">{calendar.month}</p>
      <div className="fx-cal-weekdays"><span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span></div>
      <ul className="fx-cal-rows">{calendar.entries.map((entry) => (
        <li key={entry.id}><span>{entry.label}</span><strong>{entry.status}&nbsp; | &nbsp;{entry.range}</strong></li>
      ))}</ul>
    </div>
  </div>;
}

export function LeaveDetails({ ctx }: { readonly ctx: PanelContext }) {
  const absence = ctx.details.dossier.absence;
  if (!absence) return <AbsenceMissing />;
  return <section className="fx-leave-details"><h2 className="fx-visually-hidden">Leave Details</h2>
    <div className="fx-detail-grid"><PanelList panels={absence.leavePanels} /></div>
    <LeaveRequests requests={absence.leaveRequests} />
    <LeavePlans plans={absence.leavePlans} caseId={ctx.caseId} />
    <ConditionDetails condition={absence.condition} />
  </section>;
}

export function EmploymentDetails({ ctx }: { readonly ctx: PanelContext }) {
  const absence = ctx.details.dossier.absence;
  return <section><h2 className="fx-section-title">Employment Details</h2>
    <PanelList panels={absence?.employmentPanels ?? []} />
  </section>;
}

function LeaveRequests({ requests }: { readonly requests: readonly LeaveRequest[] }) {
  return <div className="fx-leave-request"><h3 className="fx-section-title">Leave Requests</h3>
    {requests.map((request) => (
      <p key={request.id}>⌄ ID: {request.id}&nbsp; Requested from {request.requestedFrom} through {request.requestedThrough} - {leaveReasonLine(request)}</p>
    ))}
  </div>;
}

const leaveReasonLine = (request: LeaveRequest): string =>
  [request.reason, ...request.qualifiers].join(" | ");

function LeavePlans({ plans, caseId }: { readonly plans: readonly LeavePlan[]; readonly caseId: string }) {
  return <div className="fx-leave-plans">
    <nav><strong>Leave Plans</strong><span>Request Information</span><span>Requested Periods</span><span>Certification Periods</span>
      <Link className="fx-link" to={`/cases/${caseId}/employment-details`}>Employment Information</Link></nav>
    <table className="fx-table">
      <thead><tr><th>Plan Name</th><th>Selection Method</th><th>Applicability</th><th>Plan Evaluation</th></tr></thead>
      <tbody>{plans.map((plan) => (
        <tr key={plan.name}><td>{plan.name}</td><td>{plan.selectionMethod}</td><td>{plan.applicability}</td><td>{plan.evaluation}</td></tr>
      ))}</tbody>
    </table>
  </div>;
}

function ConditionDetails({ condition }: { readonly condition: AbsenceConditionDetails }) {
  const [open, setOpen] = useState(false);
  return <div className="fx-condition"><div className="fx-subhead"><h3 className="fx-section-title">Condition Details</h3>
    <button type="button" className="fx-ghost" aria-expanded={open} onClick={() => setOpen((value) => !value)}>Condition</button></div>
    {open && <div className="fx-detail-grid">{condition.fields.map((field) => <FieldView key={field.key} field={field} />)}</div>}
  </div>;
}
