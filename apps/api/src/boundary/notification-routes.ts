import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  toPartyId,
  type ApiResult,
} from "@fineos/contracts";
import type {
  NotificationSectionInput,
  NotificationService,
} from "../application/notification-service";
import { apiErr, apiOk } from "../application/api-result";
import { parse, send } from "./http";

const OPTIONS_SECTION = "notificationOptions";
const draftSchema = z.object({
  source: z.string().min(1),
  notificationDate: z.string().min(1),
});

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const isoDateSchema = z.string().regex(ISO_DATE).refine(isCalendarDate);
const periodSchema = z.object({
  lastDayWorked: isoDateSchema,
  startDate: isoDateSchema,
  endDate: isoDateSchema,
});
const notificationDetailsSchema = z.object({
  source: z.string().min(1),
  notificationDate: isoDateSchema,
  notifiedBy: z.string().min(1),
});

const sectionSchema = z.object({
  leaveReason: z.enum(["serious_health_condition", "pregnancy", "other"]).optional(),
  conditionDescription: z.string().min(1).nullable().optional(),
  workState: z.string().min(1).optional(),
  periods: z.array(periodSchema).optional(),
  diagnosisCode: z.string().min(1).optional(),
  providerPartyId: z.string().min(1).optional(),
}).passthrough();

const optionsSchema = sectionSchema.extend({
  requestLeave: z.boolean(),
  requestAccommodation: z.boolean(),
  requestGdc: z.boolean(),
});

type SectionBody = z.infer<typeof sectionSchema>;
type OptionsBody = z.infer<typeof optionsSchema>;

export const registerNotificationRoutes = (
  app: FastifyInstance,
  notifications: NotificationService,
): void => {
  app.post("/api/parties/:partyId/notifications", (req, reply) => createDraft(req, reply, notifications));
  app.put("/api/notifications/:draftId/sections/:sectionKey", (req, reply) => saveSection(req, reply, notifications));
  app.post("/api/notifications/:draftId/submit", (req, reply) => send(reply, notifications.submit(draftParam(req))));
};

const createDraft = (req: FastifyRequest, reply: FastifyReply, notifications: NotificationService): void => {
  const body = parse(draftSchema, req.body);
  if (!body.ok) return send(reply, body);
  if (!isCalendarDate(body.value.notificationDate)) return send(reply, invalidDate());
  const { partyId } = req.params as { partyId: string };
  return send(reply, notifications.create(partyId, body.value), 201);
};

const saveSection = (req: FastifyRequest, reply: FastifyReply, notifications: NotificationService): void => {
  const { draftId, sectionKey } = req.params as { draftId: string; sectionKey: string };
  const body = parseSection(sectionKey, req.body);
  if (!body.ok) return send(reply, body);
  return send(reply, notifications.saveSection(draftId, sectionKey, body.value));
};

const parseSection = (
  key: string,
  body: unknown,
): ApiResult<NotificationSectionInput, "invalid_section" | "invalid_date" | "invalid_date_range"> => {
  if (key === "notificationDetails") return parseNotificationDetails(body);
  if (key === OPTIONS_SECTION) return parseOptions(body);
  if (key === "absencePeriods") return parsePeriods(body);
  const parsed = sectionSchema.safeParse(body);
  return parsed.success ? apiOk(toSectionInput(key, parsed.data)) : invalidSection();
};

const parseNotificationDetails = (
  body: unknown,
): ApiResult<NotificationSectionInput, "invalid_section"> => {
  const parsed = notificationDetailsSchema.safeParse(body);
  return parsed.success
    ? apiOk({ kind: "section", body: parsed.data, source: parsed.data.source, notificationDate: parsed.data.notificationDate })
    : invalidSection();
};

const parseOptions = (
  body: unknown,
): ApiResult<NotificationSectionInput, "invalid_section"> => {
  const parsed = optionsSchema.safeParse(body);
  return parsed.success ? apiOk(toOptionsInput(parsed.data)) : invalidSection();
};

const parsePeriods = (
  body: unknown,
): ApiResult<NotificationSectionInput, "invalid_date" | "invalid_date_range"> => {
  const parsed = sectionSchema.safeParse(body);
  if (!parsed.success) return invalidDate();
  if (parsed.data.periods?.some(isReversed)) return invalidDateRange();
  return apiOk(toSectionInput("absencePeriods", parsed.data));
};

const toSectionInput = (key: string, body: SectionBody): NotificationSectionInput => {
  if (key === "leaveReason") return { kind: "section", body, leaveReason: body.leaveReason, conditionDescription: body.conditionDescription };
  if (key === "workPattern") return { kind: "section", body, workState: body.workState };
  if (key === "absenceDetails") return { kind: "section", body, workState: body.workState, conditionDescription: body.conditionDescription };
  if (key === "absencePeriods") return { kind: "section", body, absencePeriods: body.periods };
  if (key === "diagnosis") return { kind: "section", body, diagnosisCode: body.diagnosisCode };
  if (key === "medicalDetails") return { kind: "section", body, diagnosisCode: body.diagnosisCode, providerPartyId: providerId(body) };
  if (key === "medicalProvider") return { kind: "section", body, providerPartyId: providerId(body) };
  return { kind: "section", body };
};

const toOptionsInput = (body: OptionsBody): NotificationSectionInput => ({
  kind: "notification_options",
  body,
  requestLeave: body.requestLeave,
  requestAccommodation: body.requestAccommodation,
  requestGdc: body.requestGdc,
});

const providerId = (body: SectionBody) =>
  body.providerPartyId ? toPartyId(body.providerPartyId) : undefined;

const isReversed = (period: z.infer<typeof periodSchema>): boolean =>
  period.endDate < period.startDate;

function isCalendarDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

const invalidSection = () => apiErr("invalid_section", "The section payload was invalid.");
const invalidDate = () => apiErr("invalid_date", "A date must be a valid ISO calendar date.");
const invalidDateRange = () => apiErr("invalid_date_range", "An absence period cannot end before it starts.");

const draftParam = (req: FastifyRequest): string =>
  (req.params as { draftId: string }).draftId;
