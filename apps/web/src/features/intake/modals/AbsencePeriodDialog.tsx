import { useState } from "react";
import { Dialog } from "../../../components/fineos/Dialog";
import { DateField, SelectField, CheckboxField, FieldRow } from "../fields/controls";

export interface AbsencePeriod {
  readonly lastDayWorked: string;
  readonly startDate: string;
  readonly endDate: string;
}

const ABSENCE_STATUS = ["Please Select", "Known", "Estimated"] as const;

interface AbsencePeriodDialogProps {
  readonly onAdd: (period: AbsencePeriod) => void;
  readonly onClose: () => void;
}

export function AbsencePeriodDialog({ onAdd, onClose }: AbsencePeriodDialogProps) {
  const [period, setPeriod] = useState<AbsencePeriod>({ lastDayWorked: "", startDate: "", endDate: "" });
  const patch = (part: Partial<AbsencePeriod>): void => setPeriod((current) => ({ ...current, ...part }));
  return (
    <Dialog title="Add Absence Period" onClose={onClose}>
      <div className="fx-dialog-head"><h1>Add Absence Period</h1></div>
      <AbsencePeriodForm period={period} onPatch={patch} onOk={() => confirmPeriod(period, onAdd, onClose)} />
    </Dialog>
  );
}

const confirmPeriod = (period: AbsencePeriod, onAdd: (p: AbsencePeriod) => void, onClose: () => void): void => {
  onAdd(period);
  onClose();
};

interface FormProps {
  readonly period: AbsencePeriod;
  readonly onPatch: (part: Partial<AbsencePeriod>) => void;
  readonly onOk: () => void;
}

function AbsencePeriodForm({ period, onPatch, onOk }: FormProps) {
  const [options, setOptions] = useState({ status: "Please Select", startAllDay: true, endAllDay: true });
  const setOption = (key: keyof typeof options, value: string | boolean): void => setOptions((current) => ({ ...current, [key]: value }));
  return (
    <div className="fx-modal-body">
      <h2 className="fx-section-title">Fixed Time Off</h2>
      <PeriodHeader period={period} status={options.status} onPatch={onPatch} onStatus={(v) => setOption("status", v)} />
      <PeriodDate label="Absence start date" value={period.startDate} allDay={options.startAllDay} onDate={(v) => onPatch({ startDate: v })} onAllDay={(v) => setOption("startAllDay", v)} />
      <PeriodDate label="Absence end date" value={period.endDate} allDay={options.endAllDay} onDate={(v) => onPatch({ endDate: v })} onAllDay={(v) => setOption("endAllDay", v)} />
      <div className="fx-form-actions"><button type="button" className="fx-dark" onClick={onOk}>OK</button></div>
    </div>
  );
}

interface PeriodDateProps {
  readonly label: string; readonly value: string; readonly allDay: boolean;
  readonly onDate: (value: string) => void; readonly onAllDay: (value: boolean) => void;
}

function PeriodHeader({ period, status, onPatch, onStatus }: Pick<FormProps, "period" | "onPatch"> & { readonly status: string; readonly onStatus: (value: string) => void }) {
  return <FieldRow>
    <SelectField label="Absence status" options={ABSENCE_STATUS} value={status} onChange={onStatus} />
    <DateField label="Last day worked" value={period.lastDayWorked} onChange={(v) => onPatch({ lastDayWorked: v })} />
  </FieldRow>;
}

function PeriodDate({ label, value, allDay, onDate, onAllDay }: PeriodDateProps) {
  return <FieldRow><DateField label={label} value={value} onChange={onDate} />
    <CheckboxField label="All day" checked={allDay} onChange={onAllDay} />
  </FieldRow>;
}
