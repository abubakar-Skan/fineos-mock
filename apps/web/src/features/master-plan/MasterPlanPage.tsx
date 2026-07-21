import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppShell } from "../../components/fineos/AppShell";
import { DataTable, EmptyState, type Column } from "../../components/fineos/DataTable";
import { RecordShell } from "../../components/fineos/RecordShell";

interface Member {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly partyId?: string;
}

interface Filters {
  readonly lastName: string;
  readonly firstName: string;
  readonly memberId: string;
}

const PLAN_TABS = ["Details", "Classes", "Members", "Admin", "Tasks", "Contacts", "Documents", "Notes", "Alerts"] as const;
const PLAN_ACTIONS = ["Add Policy", "Correspondence", "Add Activity", "Add eForm", "Add Participant", "Copy Case"] as const;
const EMPTY_FILTERS: Filters = { lastName: "", firstName: "", memberId: "" };
const MEMBERS: readonly Member[] = [
  { id: "MemID323452", firstName: "Laura", lastName: "Adams" },
  { id: "MemID323636", firstName: "Kimberly", lastName: "Aguirre" },
  { id: "MemID323346", firstName: "Brittany", lastName: "Alexander" },
  { id: "MemID323290", firstName: "Jacob", lastName: "Alexander" },
  { id: "MemID323357", firstName: "Kyle", lastName: "Ali" },
  { id: "MemID323633", firstName: "Patricia", lastName: "Allen" },
  { id: "MemID323395", firstName: "Karen", lastName: "Allison" },
  { id: "MemID323371", firstName: "Victor", lastName: "Alvarado" },
  { id: "MemID323580", firstName: "Danny", lastName: "Alvarez" },
  { id: "MemID323619", firstName: "Allison", lastName: "Andersen" },
  { id: "MemID80937", firstName: "Erica", lastName: "Alexander", partyId: "PTY-80937" },
  { id: "MemID323620", firstName: "James", lastName: "Anderson" },
  { id: "MemID323621", firstName: "Maria", lastName: "Andrews" },
  { id: "MemID323622", firstName: "Louis", lastName: "Anthony" },
  { id: "MemID323623", firstName: "Diane", lastName: "Armstrong" },
  { id: "MemID323624", firstName: "Kirk", lastName: "Arnold" },
  { id: "MemID323625", firstName: "Susan", lastName: "Atkins" },
  { id: "MemID323626", firstName: "John", lastName: "Austin" },
  { id: "MemID323627", firstName: "Amy", lastName: "Baker" },
  { id: "MemID323628", firstName: "Robert", lastName: "Barnes" },
];

export function MasterPlanPage() {
  const { planId = "18489" } = useParams();
  return <AppShell><MasterPlanRecord planId={planId} /></AppShell>;
}

function MasterPlanRecord({ planId }: { readonly planId: string }) {
  const [tab, setTab] = useState<string>("Members");
  const [notice, setNotice] = useState<string | null>(null);
  const navigate = useNavigate();
  return <RecordShell title={`Master Plan ${planId}`} subtitleLabel="Plan Sponsor" subtitleValue={<PlanSubtitle onSelect={setNotice} />}
    headerActions={<button type="button" className="fx-dark" onClick={() => navigate("/dashboard")}>Close</button>}
    actions={<PlanActions onSelect={setNotice} />} tabs={PLAN_TABS} activeTab={tab} onTab={setTab}>
    {notice && <p role="status" className="fx-notice">{notice}</p>}<PlanPanel tab={tab} />
  </RecordShell>;
}

function PlanSubtitle({ onSelect }: { readonly onSelect: (message: string) => void }) {
  return <span className="fx-plan-subtitle"><button type="button" className="fx-link"
    onClick={() => onSelect("Plan sponsor selected.")}>Fifth Third Bank National Association</button>
    <span className="fx-plan-status"><strong>Status</strong> Open <span aria-hidden="true">◯</span></span></span>;
}

function PlanActions({ onSelect }: { readonly onSelect: (message: string) => void }) {
  return (
    <>
      {PLAN_ACTIONS.map((action) => (
        <button key={action} type="button" className="fx-action" onClick={() => onSelect(`${action} started.`)}>{action}</button>
      ))}
    </>
  );
}

function PlanPanel({ tab }: { readonly tab: string }) {
  if (tab === "Members") return <MembersPanel />;
  return <EmptyState label={`${tab} — no data available`} />;
}

function MembersPanel() {
  const list = useMemberList();
  const [selected, setSelected] = useState<Member | null>(null);
  const navigate = useNavigate();
  return (
    <div className="fx-member-layout">
      <section aria-label="Member list"><MemberFilters list={list} /><MemberTable rows={list.rows} onMember={(member) => openMember(member, navigate, setSelected)} /><Pagination list={list} /></section>
      <MemberDetails member={selected} />
    </div>
  );
}

const useMemberList = () => {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const filtered = filterMembers(filters);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);
  return { filters, setFilters, page, setPage, pageSize, setPageSize, pages, rows, count: filtered.length };
};

type MemberList = ReturnType<typeof useMemberList>;

function MemberFilters({ list }: { readonly list: MemberList }) {
  return (
    <div className="fx-member-filters">
      <FilterField label="Last Name" name="lastName" value={list.filters.lastName} onChange={(value) => changeFilter(list, "lastName", value)} />
      <FilterField label="First Name" name="firstName" value={list.filters.firstName} onChange={(value) => changeFilter(list, "firstName", value)} />
      <FilterField label="Member ID" name="memberId" value={list.filters.memberId} onChange={(value) => changeFilter(list, "memberId", value)} />
      <button type="button" className="fx-ghost" onClick={() => resetFilters(list)}>Reset</button>
    </div>
  );
}

function FilterField(props: { readonly label: string; readonly name: string; readonly value: string; readonly onChange: (value: string) => void }) {
  const placeholder = props.name === "lastName" ? "e.g. Doe" : props.name === "firstName" ? "e.g. John" : "e.g. 123456...";
  return (
    <label className="fx-field">
      <span className="fx-field-label">{props.label}</span>
      <input className="fx-input" name={props.name} placeholder={placeholder} value={props.value} onChange={(event) => props.onChange(event.target.value)} />
    </label>
  );
}

const changeFilter = (list: MemberList, key: keyof Filters, value: string): void => {
  list.setFilters({ ...list.filters, [key]: value });
  list.setPage(1);
};

const resetFilters = (list: MemberList): void => {
  list.setFilters(EMPTY_FILTERS);
  list.setPage(1);
};

const filterMembers = (filters: Filters): readonly Member[] => MEMBERS.filter((member) =>
  matches(member.lastName, filters.lastName) &&
  matches(member.firstName, filters.firstName) &&
  matches(member.id, filters.memberId));

const matches = (value: string, term: string): boolean =>
  value.toLowerCase().includes(term.trim().toLowerCase());

function MemberTable({ rows, onMember }: { readonly rows: readonly Member[]; readonly onMember: (member: Member) => void }) {
  return <DataTable rows={rows} rowKey={(member) => member.id} columns={memberColumns(onMember)} />;
}

const memberColumns = (onMember: (member: Member) => void): readonly Column<Member>[] => [
  { key: "last", header: "Last Name", render: (member) => <MemberButton member={member} onSelect={onMember} /> },
  { key: "first", header: "First Name", render: (member) => member.firstName },
  { key: "id", header: "Member ID", render: (member) => member.id },
];

function MemberButton({ member, onSelect }: { readonly member: Member; readonly onSelect: (member: Member) => void }) {
  return <button type="button" className="fx-result" aria-label={`${member.firstName} ${member.lastName}`} onClick={() => onSelect(member)}>{member.lastName}</button>;
}

const openMember = (member: Member, navigate: (to: string) => void, select: (member: Member) => void): void =>
  member.partyId ? navigate(`/parties/${member.partyId}`) : select(member);

function Pagination({ list }: { readonly list: MemberList }) {
  return (
    <nav className="fx-pagination" aria-label="Member pages">
      <span>{list.count} items</span>
      <button type="button" aria-label="Previous page" disabled={list.page === 1} onClick={() => list.setPage(list.page - 1)}>‹</button>
      <span className="fx-visually-hidden">Page {list.page} of {list.pages}</span>
      <span className="fx-page-on">{list.page}</span><span>2</span><span>3</span><span>…</span><span>102</span>
      <button type="button" aria-label="Next page" disabled={list.page === list.pages} onClick={() => list.setPage(list.page + 1)}>›</button>
      <PageSize list={list} />
    </nav>
  );
}

function PageSize({ list }: { readonly list: MemberList }) {
  return (
    <select aria-label="Members per page" value={list.pageSize} onChange={(event) => changePageSize(list, Number(event.target.value))}>
      <option value={10}>10 / page</option>
      <option value={20}>20 / page</option>
    </select>
  );
}

const changePageSize = (list: MemberList, size: number): void => {
  list.setPageSize(size);
  list.setPage(1);
};

function MemberDetails({ member }: { readonly member: Member | null }) {
  return (
    <section className="fx-member-details" aria-label="Member details">
      {member ? <><h2>Member Details</h2><p>{member.firstName} {member.lastName}</p><p>{member.id}</p></> : <MemberSkeleton />}
    </section>
  );
}

function MemberSkeleton() {
  return <div className="fx-member-skeleton" aria-hidden="true"><div className="fx-member-summary">
    {["Last name", "First name", "Member ID", "Current occupation", "Date of birth", "Social Security number", "Customer number", "Previous occupation(s)"].map((label) =>
      <span key={label}><small>{label}</small><b>-</b></span>)}</div>
    <div className="fx-member-meta"><span><small>Member information effective on</small><b>02/14/2026</b></span>
      <span><small>Member status</small><b>-</b></span><strong>Actions⌄</strong></div>
    <div className="fx-member-cover"><span>⌄ &nbsp; Member Cover</span><button type="button" disabled>Waived Premium</button></div></div>;
}
