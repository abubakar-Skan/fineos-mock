import type {
  CaseId,
  IntakeComponentScope,
  IntakeType,
  LeaveReason,
  PartyId,
  Process2Dossier,
  Process2PartyProfile,
  ProviderDetails,
  ScenarioExpectation,
} from "@fineos/contracts";
import type { PartyType } from "../../../application/ports";

export type NotificationStatus = "DRAFT" | "SUBMITTED";

// The seeder serializes details into party.details_json. Optional SQL columns use
// undefined; an omitted component or field never doubles as a business failure.
export interface PartySeedRow<
  Details extends Process2PartyProfile | ProviderDetails =
    Process2PartyProfile | ProviderDetails,
> {
  readonly id: PartyId;
  readonly fullName: string;
  readonly partyType: PartyType;
  readonly details: Details;
  readonly customerNumber?: string;
  readonly dateOfBirth?: string;
  readonly employer?: string;
  readonly phone?: string;
  readonly homePhone?: string;
  readonly email?: string;
}

// sections_json is intentionally absent: the seeder serializes `dossier` into it,
// keeping the dossier the single source of truth for the persisted case record.
export interface NotificationSeedRow {
  readonly id: CaseId;
  readonly partyId: PartyId;
  readonly source: string;
  readonly notificationDate: string;
  readonly intakeType: IntakeType;
  readonly status: NotificationStatus;
  readonly scope?: IntakeComponentScope;
}

export interface AbsenceCaseSeedRow {
  readonly id: CaseId;
  readonly notificationId: CaseId;
  readonly employeePartyId: PartyId;
  readonly status: string;
  readonly leaveReason?: LeaveReason;
  readonly conditionDescription?: string;
  readonly workState?: string;
}

export interface AbsencePeriodSeedRow {
  readonly id: string;
  readonly absenceCaseId: CaseId;
  readonly lastDayWorked: string;
  readonly startDate: string;
  readonly endDate: string;
}

export interface GdcCaseSeedRow {
  readonly id: CaseId;
  readonly notificationId: CaseId;
  readonly claimantPartyId: PartyId;
  readonly status: string;
  readonly providerPartyId?: PartyId;
  readonly diagnosisCode?: string;
}

export interface Process2CaseSeed {
  readonly party: PartySeedRow<Process2PartyProfile>;
  readonly notification: NotificationSeedRow;
  readonly dossier: Process2Dossier;
  readonly scenario: ScenarioExpectation;
  readonly absenceCase?: AbsenceCaseSeedRow;
  readonly absencePeriods?: readonly AbsencePeriodSeedRow[];
  readonly gdcCase?: GdcCaseSeedRow;
  readonly providers?: readonly PartySeedRow<ProviderDetails>[];
}
