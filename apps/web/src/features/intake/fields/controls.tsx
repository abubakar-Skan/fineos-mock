import { useId, useState, type ReactNode } from "react";

interface TextFieldProps {
  readonly label: string;
  readonly value?: string;
  readonly placeholder?: string;
  readonly readOnly?: boolean;
  readonly onChange?: (value: string) => void;
}

export function TextField({ label, value, placeholder, readOnly, onChange }: TextFieldProps) {
  return (
    <label className="fx-field">
      <span className="fx-field-label">{label}</span>
      <input className="fx-input" value={value ?? ""} placeholder={placeholder} readOnly={readOnly}
        onChange={(event) => onChange?.(event.target.value)} />
    </label>
  );
}

interface SelectFieldProps {
  readonly label: string;
  readonly options: readonly string[];
  readonly value?: string;
  readonly open?: boolean;
  readonly onChange?: (value: string) => void;
}

export function SelectField({ label, options, value, open, onChange }: SelectFieldProps) {
  const selected = value ?? options[0] ?? "";
  return (
    <label className="fx-field">
      <span className="fx-field-label">{label}</span>
      <span className="fx-select-wrap">
        <select className="fx-select" value={selected} onChange={(event) => onChange?.(event.target.value)}>
          {options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        {open && <OpenListbox options={options} selected={selected} />}
      </span>
    </label>
  );
}

function OpenListbox({ options, selected }: { readonly options: readonly string[]; readonly selected: string }) {
  return (
    <ul className="fx-listbox" aria-hidden="true">
      {options.map((option) => (
        <li key={option} className={option === selected ? "fx-listbox--sel" : undefined}>{option}</li>
      ))}
    </ul>
  );
}

export function TextArea({ label, value, onChange }: TextFieldProps) {
  return (
    <label className="fx-field">
      <span className="fx-field-label">{label}</span>
      <textarea className="fx-textarea" value={value ?? ""} onChange={(event) => onChange?.(event.target.value)} />
    </label>
  );
}

interface CheckboxProps {
  readonly label: string;
  readonly checked?: boolean;
  readonly onChange?: (checked: boolean) => void;
}

export function CheckboxField({ label, checked, onChange }: CheckboxProps) {
  return (
    <label className="fx-checkbox">
      <input type="checkbox" checked={checked ?? false} onChange={(event) => onChange?.(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

interface ToggleProps {
  readonly label: string;
  readonly description?: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
}

export function ToggleField({ label, description, checked, onChange }: ToggleProps) {
  return (
    <div className={checked ? "fx-toggle-row fx-toggle-row--on" : "fx-toggle-row"}>
      <button type="button" role="switch" aria-checked={checked} aria-label={label}
        className={checked ? "fx-toggle fx-toggle--on" : "fx-toggle"} onClick={() => onChange(!checked)} />
      <div><div className="fx-toggle-label">{label}</div>{description && <p className="fx-toggle-desc">{description}</p>}</div>
    </div>
  );
}

interface RadioGroupProps {
  readonly legend: string;
  readonly options: readonly string[];
  readonly value: string;
  readonly onChange: (value: string) => void;
}

export function RadioGroup({ legend, options, value, onChange }: RadioGroupProps) {
  return (
    <fieldset className="fx-radiogroup">
      <legend className="fx-field-label">{legend}</legend>
      {options.map((option) => (
        <Radio key={option} name={legend} option={option} checked={option === value} onSelect={() => onChange(option)} />
      ))}
    </fieldset>
  );
}

interface RadioProps {
  readonly name: string;
  readonly option: string;
  readonly checked: boolean;
  readonly onSelect: () => void;
}

function Radio({ name, option, checked, onSelect }: RadioProps) {
  return (
    <label className="fx-radio">
      <input type="radio" name={name} checked={checked} onChange={onSelect} />
      <span>{option}</span>
    </label>
  );
}

export function FieldRow({ children }: { readonly children: ReactNode }) {
  return <div className="fx-field-row">{children}</div>;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

const DEFAULT_YEAR = 2026;
const DEFAULT_MONTH = 1;

interface DateFieldProps {
  readonly label: string;
  readonly value?: string;
  readonly onChange?: (value: string) => void;
}

export function DateField({ label, value, onChange }: DateFieldProps) {
  const inputId = useId();
  const [open, setOpen] = useState(false);
  return (
    <div className="fx-field fx-datefield">
      <label className="fx-field-label" htmlFor={inputId}>{label}</label>
      <DateInput id={inputId} value={value} open={open} onToggle={() => setOpen((v) => !v)} onChange={onChange} />
      {open && <Calendar label={label} onPick={(picked) => pickDate(picked, onChange, setOpen)} />}
    </div>
  );
}

const pickDate = (picked: string, onChange: ((v: string) => void) | undefined, close: (v: boolean) => void): void => {
  onChange?.(picked);
  close(false);
};

interface DateInputProps {
  readonly id: string;
  readonly value?: string;
  readonly open: boolean;
  readonly onToggle: () => void;
  readonly onChange?: (value: string) => void;
}

function DateInput({ id, value, open, onToggle, onChange }: DateInputProps) {
  return (
    <div className="fx-date-input">
      <input id={id} className="fx-input" placeholder="MM/DD/YYYY"
        value={value ?? ""} onChange={(event) => onChange?.(event.target.value)} />
      <button type="button" className="fx-date-btn" aria-label="Open calendar"
        aria-expanded={open} onClick={onToggle}>▦</button>
    </div>
  );
}

function Calendar({ label, onPick }: { readonly label: string; readonly onPick: (value: string) => void }) {
  const [year, setYear] = useState(DEFAULT_YEAR);
  const [month, setMonth] = useState(DEFAULT_MONTH);
  const shift = (delta: number): void => shiftMonth(year, month, delta, setYear, setMonth);
  return (
    <div className="fx-calendar" role="dialog" aria-label={`${label} calendar`}>
      <CalendarHead year={year} month={month} onShift={shift} />
      <CalendarGrid year={year} month={month} onPick={onPick} />
      <div className="fx-cal-foot"><span>TODAY</span><span>CLEAR</span></div>
    </div>
  );
}

const shiftMonth = (
  year: number, month: number, delta: number,
  setYear: (y: number) => void, setMonth: (m: number) => void,
): void => {
  const total = year * 12 + month + delta;
  setYear(Math.floor(total / 12));
  setMonth(((total % 12) + 12) % 12);
};

interface CalendarHeadProps {
  readonly year: number;
  readonly month: number;
  readonly onShift: (delta: number) => void;
}

function CalendarHead({ year, month, onShift }: CalendarHeadProps) {
  return (
    <div className="fx-cal-head">
      <span className="fx-cal-nav" aria-hidden="true">«</span>
      <button type="button" className="fx-cal-nav" aria-label="Previous month" onClick={() => onShift(-1)}>‹</button>
      <span className="fx-cal-title">{MONTHS[month]} {year}</span>
      <button type="button" className="fx-cal-nav" aria-label="Next month" onClick={() => onShift(1)}>›</button>
      <span className="fx-cal-nav" aria-hidden="true">»</span>
    </div>
  );
}

const firstWeekday = (year: number, month: number): number => new Date(year, month, 1).getDay();
const pad = (value: number): string => String(value).padStart(2, "0");
const formatDate = (year: number, month: number, day: number): string => `${pad(month + 1)}/${pad(day)}/${year}`;

interface CalendarCell { readonly day: number; readonly muted: boolean; readonly value: string; }

const buildCells = (year: number, month: number): readonly CalendarCell[] => {
  const lead = firstWeekday(year, month);
  const cells: CalendarCell[] = [];
  for (let i = 0; i < 42; i += 1) addCell(cells, year, month, i - lead + 1);
  return cells;
};

const addCell = (cells: CalendarCell[], year: number, month: number, offset: number): void => {
  const date = new Date(year, month, offset);
  cells.push({ day: date.getDate(), muted: date.getMonth() !== month, value: formatDate(date.getFullYear(), date.getMonth(), date.getDate()) });
};

interface CalendarGridProps {
  readonly year: number;
  readonly month: number;
  readonly onPick: (value: string) => void;
}

function CalendarGrid({ year, month, onPick }: CalendarGridProps) {
  return (
    <div className="fx-cal-grid" role="grid">
      {WEEKDAYS.map((day) => <span key={day} className="fx-cal-weekday">{day}</span>)}
      {buildCells(year, month).map((cell, index) => (
        cell.muted
          ? <span key={index} className="fx-cal-day fx-cal-day--muted" aria-hidden="true">{cell.day}</span>
          : <button key={index} type="button" className="fx-cal-day" onClick={() => onPick(cell.value)}>{cell.day}</button>
      ))}
    </div>
  );
}
