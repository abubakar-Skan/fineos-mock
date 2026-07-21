import { useId, type KeyboardEvent, type ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

export interface TabOverflow {
  readonly label: string;
  readonly onSelect: () => void;
}

interface RecordShellProps {
  readonly title: string;
  readonly icon?: IconName;
  readonly processTitle?: string;
  readonly subtitleLabel: string;
  readonly subtitleValue: ReactNode;
  readonly bandKind?: "notification" | "absence" | "gdc" | "party";
  readonly headerActions?: ReactNode;
  readonly sidebar?: ReactNode;
  readonly actions: ReactNode;
  readonly tabs: readonly string[];
  readonly activeTab: string;
  readonly onTab: (tab: string) => void;
  readonly tabOverflow?: TabOverflow;
  // A sub-page (e.g. Choose the Party) hides the action bar and tab strip while
  // keeping the header, coloured band, and sidebar rail, matching the source.
  readonly chromeless?: boolean;
  readonly children: ReactNode;
}

export function RecordShell(props: RecordShellProps) {
  const tabsId = useId();
  const panelId = `${tabsId}-panel`;
  return (
    <section className={`fx-record${props.sidebar ? " fx-record--split" : ""}`}>
      <RecordHeader title={props.title} icon={props.icon} processTitle={props.processTitle}
        label={props.subtitleLabel} value={props.subtitleValue} bandKind={props.bandKind} actions={props.headerActions} />
      <RecordLayout sidebar={props.sidebar}>
        {!props.chromeless && <div className="fx-actions">{props.actions}</div>}
        {!props.chromeless && <TabBar id={tabsId} panelId={panelId} tabs={props.tabs} active={props.activeTab} onTab={props.onTab} overflow={props.tabOverflow} />}
        <TabPanel id={panelId} labelledBy={tabId(tabsId, props.activeTab)}>{props.children}</TabPanel>
      </RecordLayout>
    </section>
  );
}

function RecordLayout({ sidebar, children }: { readonly sidebar?: ReactNode; readonly children: ReactNode }) {
  if (!sidebar) return <>{children}</>;
  return <div className="fx-record-split">
    <aside className="fx-record-aside">{sidebar}</aside>
    <div className="fx-record-main">{children}</div>
  </div>;
}

function TabPanel({ id, labelledBy, children }: { readonly id: string; readonly labelledBy: string; readonly children: ReactNode }) {
  return <div id={id} className="fx-record-body" role="tabpanel" aria-labelledby={labelledBy}>{children}</div>;
}

interface HeaderProps {
  readonly title: string;
  readonly icon?: IconName;
  readonly processTitle?: string;
  readonly label: string;
  readonly value: ReactNode;
  readonly bandKind?: RecordShellProps["bandKind"];
  readonly actions?: ReactNode;
}

function RecordHeader({ title, icon = "record", processTitle, label, value, bandKind, actions }: HeaderProps) {
  return (
    <>
      <div className="fx-record-head">
        <span className="fx-record-avatar" aria-hidden="true"><Icon name={icon} /></span>
        <h1>{title}</h1>
        {processTitle && <span className="fx-record-process">{processTitle}</span>}
        {bandKind && bandKind !== "party" && <span className="fx-record-head-icons" aria-hidden="true"><i /><i /><i /></span>}
        {actions && <div className="fx-record-head-tools">{actions}</div>}
      </div>
      <div className={`fx-record-sub${bandKind ? ` fx-band--${bandKind}` : ""}`}><strong>{label}</strong>{value}</div>
    </>
  );
}

interface TabBarProps {
  readonly id: string;
  readonly panelId: string;
  readonly tabs: readonly string[];
  readonly active: string;
  readonly onTab: (tab: string) => void;
  readonly overflow?: TabOverflow;
}

export function TabBar({ id, panelId, tabs, active, onTab, overflow }: TabBarProps) {
  return (
    <div className="fx-tabs" role="tablist">
      {tabs.map((tab, index) => (
        <Tab key={tab} id={tabId(id, tab)} panelId={panelId} label={tab} selected={tab === active}
          onSelect={() => onTab(tab)} onKeyDown={(event) => moveTab(event, index, id, tabs, onTab)} />
      ))}
      {overflow && <button type="button" className="fx-tab-overflow" aria-label={overflow.label} onClick={overflow.onSelect}>…</button>}
    </div>
  );
}

interface TabProps {
  readonly id: string;
  readonly panelId: string;
  readonly label: string;
  readonly selected: boolean;
  readonly onSelect: () => void;
  readonly onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}

function Tab({ id, panelId, label, selected, onSelect, onKeyDown }: TabProps) {
  return <button id={id} type="button" role="tab" aria-selected={selected} aria-controls={panelId}
    tabIndex={selected ? 0 : -1} className={selected ? "fx-tab fx-tab--on" : "fx-tab"}
    onClick={onSelect} onKeyDown={onKeyDown}>
    {label}
  </button>;
}

const moveTab = (event: KeyboardEvent<HTMLButtonElement>, current: number, id: string, tabs: readonly string[], select: (tab: string) => void): void => {
  const next = nextTabIndex(event.key, current, tabs.length);
  if (next === undefined) return;
  const tab = tabs[next];
  if (!tab) return;
  event.preventDefault();
  select(tab);
  document.getElementById(tabId(id, tab))?.focus();
};

const nextTabIndex = (key: string, current: number, count: number): number | undefined => {
  if (key === "ArrowRight") return (current + 1) % count;
  if (key === "ArrowLeft") return (current - 1 + count) % count;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return undefined;
};

export const tabId = (groupId: string, label: string): string =>
  `${groupId}-tab-${label.toLowerCase().replaceAll(" ", "-")}`;
