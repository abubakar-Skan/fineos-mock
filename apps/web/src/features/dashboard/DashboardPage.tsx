import { useState, type ReactNode } from "react";
import { AppShell } from "../../components/fineos/AppShell";
import { EmptyState } from "../../components/fineos/DataTable";

const TEAM_CASES = [
  { name: "Unassigned", count: 42706, bar: true },
  { name: "Josh Maxwell", count: 78 },
  { name: "Paul Cheng", count: 12 },
  { name: "Austin Lazowski", count: 4 },
  { name: "EST1", count: 4 },
  { name: "Kamala Vutukuri", count: 4 },
  { name: "Deborah Buco", count: 2 },
  { name: "Latasha Lyons", count: 2 },
] as const;

const WIDGETS = ["My Cases Listview", "Team Cases By User", "Tasks by Type"] as const;

export function DashboardPage() {
  return (
    <AppShell>
      <DashboardHeader />
      <DashboardGrid />
    </AppShell>
  );
}

function DashboardHeader() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  return (
    <div className="fx-page-head">
      <h1>Dashboard</h1>
      <DashboardTools settingsOpen={settingsOpen} onSettings={() => setSettingsOpen((value) => !value)} />
    </div>
  );
}

function DashboardTools({ settingsOpen, onSettings }: { readonly settingsOpen: boolean; readonly onSettings: () => void }) {
  return (
    <div className="fx-page-head-tools">
      <button type="button" className="fx-dark" aria-pressed={settingsOpen} onClick={onSettings}>Dashboard Settings ⚙</button>
      <RoleSelect />
      <CaseScopeSelect />
    </div>
  );
}

function RoleSelect() {
  return (
    <select className="fx-select" aria-label="Role" defaultValue="tl">
      <option value="tl">Team TL Eligibility Specialist</option>
      <option value="es">Eligibility Specialist</option>
    </select>
  );
}

function CaseScopeSelect() {
  return (
    <select className="fx-select" aria-label="Case scope" defaultValue="all">
      <option value="all">All Cases</option>
      <option value="mine">My Cases</option>
    </select>
  );
}

function DashboardGrid() {
  const [widgets, setWidgets] = useState<readonly string[]>(WIDGETS);
  const remove = (key: string): void => setWidgets((current) => current.filter((item) => item !== key));
  return (
    <div className="fx-dash-grid">
      {widgets.map((key) => (
        <Widget key={key} title={key} onClose={() => remove(key)}>{widgetBody(key)}</Widget>
      ))}
    </div>
  );
}

const widgetBody = (key: string): ReactNode =>
  key === "Team Cases By User" ? <TeamCases /> : <EmptyState label="No Data Available" />;

interface WidgetProps {
  readonly title: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
}

function Widget({ title, onClose, children }: WidgetProps) {
  return (
    <section className="fx-widget" role="region" aria-label={title}>
      <header className="fx-widget-head">
        <h2 className="fx-widget-title">{title}</h2>
        <button type="button" className="fx-widget-close" aria-label={`Close ${title}`} onClick={onClose}>×</button>
      </header>
      <div className="fx-widget-body">{children}</div>
    </section>
  );
}

function TeamCases() {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <div>
      <button type="button" className="fx-ghost" onClick={() => setSelected(null)}>Clear Filter</button>
      {TEAM_CASES.map((row) => (
        <TeamRow key={row.name} name={row.name} count={row.count} bar={"bar" in row} selected={selected === row.name} onSelect={() => setSelected(row.name)} />
      ))}
    </div>
  );
}

interface TeamRowProps {
  readonly name: string;
  readonly count: number;
  readonly bar: boolean;
  readonly selected: boolean;
  readonly onSelect: () => void;
}

function TeamRow({ name, count, bar, selected, onSelect }: TeamRowProps) {
  return (
    <button type="button" className="fx-team-row" aria-selected={selected} onClick={onSelect}>
      <div className="fx-team-name">{name}</div>
      {bar ? <div className="fx-team-bar">{count}</div> : <div className="fx-team-count">{count}</div>}
    </button>
  );
}
