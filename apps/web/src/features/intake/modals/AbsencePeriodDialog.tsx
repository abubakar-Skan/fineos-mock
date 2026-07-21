import { useState } from "react";
import { Dialog } from "../../../components/fineos/Dialog";
import { DateField, SelectField } from "../fields/controls";

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
    <Dialog title="Add Absence Period" variant="wide" onClose={onClose}>
      <div className="fx-wide-modal-head">Add Absence Period</div>
      <AbsencePeriodForm period={period} onPatch={patch} onOk={() => confirmPeriod(period, onAdd, onClose)} />
      <div className="fx-wide-modal-foot"><button type="button" className="fx-dark" onClick={() => confirmPeriod(period, onAdd, onClose)}>OK</button></div>
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

function AbsencePeriodForm({ period, onPatch }: FormProps) {
  const [status, setStatus] = useState("Please Select");
  return (
    <div className="fx-wide-modal-body">
      <h2 className="fx-section-title">Fixed Time Off</h2>
      <div className="fx-abs-row">
        <SelectField label="Absence status" options={ABSENCE_STATUS} value={status} onChange={setStatus} />
        <DateField label="Last day worked" value={period.lastDayWorked} onChange={(v) => onPatch({ lastDayWorked: v })} />
      </div>
      <PeriodDate label="Absence start date" value={period.startDate} onDate={(v) => onPatch({ startDate: v })} />
      <PeriodDate label="Absence end date" value={period.endDate} onDate={(v) => onPatch({ endDate: v })} />
      <div className="fx-field fx-abs-question"><span className="fx-field-label">Are the days in between your last day worked and absence start date non-scheduled work days or unrelated to your leave reason/condition?</span>
        <div className="fx-input fx-abs-wide" /></div>
    </div>
  );
}

interface PeriodDateProps {
  readonly label: string; readonly value: string; readonly onDate: (value: string) => void;
}

function PeriodDate({ label, value, onDate }: PeriodDateProps) {
  return (
    <div className="fx-abs-row">
      <DateField label={label} value={value} onChange={onDate} />
      <label className="fx-field fx-abs-allday"><span className="fx-field-label">All day</span><input type="checkbox" /></label>
      <div className="fx-abs-time"><span className="fx-field-label">Time Absent</span>
        <span className="fx-abs-hhmm"><span className="fx-input">0</span> HH <span className="fx-input">0</span> MM</span></div>
    </div>
  );
}
