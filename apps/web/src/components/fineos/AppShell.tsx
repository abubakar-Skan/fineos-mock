import { useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SearchDialog } from "../../features/search/SearchDialog";
import { Icon, type IconName } from "./Icon";

const NAV_ITEMS = [
  { key: "home", label: "Home", icon: "home", to: "/dashboard" },
  { key: "parties", label: "Parties", icon: "parties", to: "/parties/PTY-80937" },
  { key: "cases", label: "Cases", icon: "cases", to: "/master-plans/18489/members" },
  { key: "queues", label: "Work Queues", icon: "queues" },
  { key: "tasks", label: "Tasks", icon: "tasks" },
  { key: "library", label: "Library", icon: "library" },
] as const;

type NavItem = (typeof NAV_ITEMS)[number];

export function AppShell({ children }: { readonly children: ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const { search } = useLocation();
  return (
    <div className="fx-app">
      <ProductHeader onSearch={() => setSearchOpen(true)} />
      <AppBody notice={notice} onUnsupported={(label) => setNotice(`${label} is not available in this mock.`)}>{children}</AppBody>
      <ShellFooter />
      {searchOpen && <SearchDialog popup={new URLSearchParams(search).get("search") === "popup"} onClose={() => setSearchOpen(false)} />}
    </div>
  );
}

interface AppBodyProps {
  readonly notice: string | null;
  readonly onUnsupported: (label: string) => void;
  readonly children: ReactNode;
}

function AppBody({ notice, onUnsupported, children }: AppBodyProps) {
  return <div className="fx-body"><SideNav onUnsupported={onUnsupported} />
    <main className="fx-content">{notice && <ShellNotice message={notice} />}{children}</main>
  </div>;
}

function ShellNotice({ message }: { readonly message: string }) {
  return <div className="fx-shell-notice" role="status" aria-live="polite">{message}</div>;
}

function ProductHeader({ onSearch }: { readonly onSearch: () => void }) {
  return (
    <header className="fx-header">
      <span className="fx-header-rail" aria-hidden="true" />
      <span className="fx-logo"><strong>FINEOS</strong> AdminSuite</span>
      <GlobalSearch onOpen={onSearch} />
      <HeaderTools />
    </header>
  );
}

function GlobalSearch({ onOpen }: { readonly onOpen: () => void }) {
  return (
    <div className="fx-search">
      <span className="fx-search-scope">All</span>
      <GlobalSearchInput onOpen={onOpen} />
      <button type="button" className="fx-search-btn" aria-label="Open search" onClick={onOpen}><Icon name="search" /></button>
    </div>
  );
}

function GlobalSearchInput({ onOpen }: { readonly onOpen: () => void }) {
  return <input className="fx-search-input" placeholder="Enter at least 3 characters"
    aria-label="Global search" readOnly onClick={onOpen} />;
}

function HeaderTools() {
  return (
    <div className="fx-tools">
      <ToolToggle label="Open in new window" icon="external" />
      <ToolToggle label="Theme" icon="theme" />
      <LanguageSelect />
      <span className="fx-avatar" aria-hidden="true">JE</span>
    </div>
  );
}

function ToolToggle({ label, icon }: { readonly label: string; readonly icon: IconName }) {
  const [on, setOn] = useState(false);
  return (
    <button type="button" className="fx-tool" aria-label={label} aria-pressed={on} onClick={() => setOn((v) => !v)}>
      <Icon name={icon} />
    </button>
  );
}

function LanguageSelect() {
  return (
    <select className="fx-lang" aria-label="Language" defaultValue="en">
      <option value="en">English</option>
      <option value="es">Español</option>
    </select>
  );
}

function SideNav({ onUnsupported }: { readonly onUnsupported: (label: string) => void }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const active = activeNav(pathname);
  return (
    <nav className="fx-sidenav" aria-label="Primary">
      {NAV_ITEMS.map((item) => (
        <NavIcon key={item.key} item={item} active={active === item.key} onSelect={() => selectNav(item, navigate, onUnsupported)} />
      ))}
    </nav>
  );
}

const activeNav = (pathname: string): string | undefined => {
  if (pathname === "/dashboard") return "home";
  if (pathname.startsWith("/parties/")) return "parties";
  if (pathname.startsWith("/master-plans/") || pathname.startsWith("/cases/")) return "cases";
  return undefined;
};

const selectNav = (item: NavItem, navigate: (to: string) => void, unsupported: (label: string) => void): void => {
  if ("to" in item && item.to) navigate(item.to);
  else unsupported(item.label);
};

interface NavIconProps {
  readonly item: NavItem;
  readonly active: boolean;
  readonly onSelect: () => void;
}

function NavIcon({ item, active, onSelect }: NavIconProps) {
  return (
    <button type="button" className="fx-navicon" aria-label={item.label} aria-current={active ? "page" : undefined} onClick={onSelect}>
      <Icon name={item.icon} />
    </button>
  );
}

function ShellFooter() {
  return <footer className="fx-footer"><span>Version: 25.4.4-UNUM-C2.0.7</span><span>About</span><span>Powered by FINEOS</span></footer>;
}
