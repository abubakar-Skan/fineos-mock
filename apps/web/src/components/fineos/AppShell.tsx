import { useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SearchDialog } from "../../features/search/SearchDialog";

const NAV_ITEMS = [
  { key: "home", label: "Home", glyph: "⌂", to: "/dashboard" },
  { key: "parties", label: "Parties", glyph: "⚇", to: "/parties/PTY-80937" },
  { key: "cases", label: "Cases", glyph: "▤", to: "/master-plans/18489/members" },
  { key: "queues", label: "Work Queues", glyph: "☰" },
  { key: "tasks", label: "Tasks", glyph: "▣" },
  { key: "library", label: "Library", glyph: "▦" },
] as const;

type NavItem = (typeof NAV_ITEMS)[number];

export function AppShell({ children }: { readonly children: ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  return (
    <div className="fx-app">
      <ProductHeader onSearch={() => setSearchOpen(true)} />
      <AppBody notice={notice} onUnsupported={(label) => setNotice(`${label} is not available in this mock.`)}>{children}</AppBody>
      {searchOpen && <SearchDialog onClose={() => setSearchOpen(false)} />}
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
      <button type="button" className="fx-search-btn" aria-label="Open search" onClick={onOpen}>⌕</button>
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
      <ToolToggle label="Open in new window" glyph="⧉" />
      <ToolToggle label="Theme" glyph="◑" />
      <LanguageSelect />
      <span className="fx-avatar" aria-hidden="true">JE</span>
    </div>
  );
}

function ToolToggle({ label, glyph }: { readonly label: string; readonly glyph: string }) {
  const [on, setOn] = useState(false);
  return (
    <button type="button" className="fx-tool" aria-label={label} aria-pressed={on} onClick={() => setOn((v) => !v)}>
      {glyph}
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

// ponytail: sidebar glyphs are placeholder unicode; exact FINEOS icon set is matched in Task 10.
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
      {item.glyph}
    </button>
  );
}
