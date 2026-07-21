import {
  fail,
  succeed,
  type DomainResult,
  type IntakeComponentScope,
  type Notification,
  type NotificationDraftInput,
  type NotificationError,
  type Submission,
} from "@fineos/contracts";

export const createNotification = (
  input: NotificationDraftInput,
): DomainResult<Notification, NotificationError> => {
  const scope = resolveScope(input);
  if (!scope.ok) return scope;
  return succeed({ partyId: input.partyId, scope: scope.value });
};

export const submitNotification = (
  notification: Notification,
): DomainResult<Submission, NotificationError> =>
  succeed(buildSubmission(notification.scope));

const resolveScope = (
  input: NotificationDraftInput,
): DomainResult<IntakeComponentScope, NotificationError> => {
  const leave = input.requestLeave || input.requestAccommodation;
  if (leave && input.requestGdc) return succeed("leave_and_gdc");
  if (leave) return succeed("leave_only");
  if (input.requestGdc) return succeed("gdc_only");
  return fail(unsupportedScope());
};

const buildSubmission = (scope: IntakeComponentScope): Submission => ({
  scope,
  createsAbsenceCase: scope !== "gdc_only",
  createsGdcCase: scope !== "leave_only",
});

const unsupportedScope = (): NotificationError => ({
  kind: "UNSUPPORTED_COMPONENT_SCOPE",
  message: "At least one evidenced Leave or GDC intake section must be selected.",
});
