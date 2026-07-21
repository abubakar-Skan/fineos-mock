import type { PartyId } from "./party";

export type IntakeComponentScope = "leave_only" | "gdc_only" | "leave_and_gdc";

export type DraftComponentScope =
  | { readonly kind: "unselected" }
  | { readonly kind: "selected"; readonly value: IntakeComponentScope };

export interface NotificationDraftInput {
  readonly partyId: PartyId;
  readonly requestLeave: boolean;
  readonly requestAccommodation: boolean;
  readonly requestGdc: boolean;
}

export interface Notification {
  readonly partyId: PartyId;
  readonly scope: IntakeComponentScope;
}

export interface Submission {
  readonly scope: IntakeComponentScope;
  readonly createsAbsenceCase: boolean;
  readonly createsGdcCase: boolean;
}

export type NotificationErrorKind = "UNSUPPORTED_COMPONENT_SCOPE";

export interface NotificationError {
  readonly kind: NotificationErrorKind;
  readonly message: string;
}
