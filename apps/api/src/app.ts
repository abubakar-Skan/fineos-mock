import Fastify, { type FastifyInstance } from "fastify";
import type { Db } from "./infrastructure/database";
import {
  createCaseRepository,
  createNotificationRepository,
  createPartyRepository,
} from "./infrastructure/repositories";
import { createPartyService } from "./application/party-service";
import { createNotificationService } from "./application/notification-service";
import { createExecutionService } from "./application/execution-service";
import { registerSessionRoutes } from "./boundary/session-routes";
import { registerPartyRoutes } from "./boundary/party-routes";
import { registerNotificationRoutes } from "./boundary/notification-routes";
import { registerCaseRoutes } from "./boundary/case-routes";
import { registerTestRoutes } from "./boundary/test-routes";

interface AppOptions {
  readonly resetTestData?: () => void;
}

export const buildApp = (db: Db, options: AppOptions = {}): FastifyInstance => {
  const app = Fastify();
  const parties = createPartyRepository(db);
  const notifications = createNotificationRepository(db);
  const cases = createCaseRepository(db);
  registerSessionRoutes(app);
  registerPartyRoutes(app, createPartyService(parties));
  registerNotificationRoutes(app, createNotificationService({ parties, notifications }));
  registerCaseRoutes(app, createExecutionService({ notifications, cases, parties }));
  registerTestRoutes(app, options.resetTestData);
  return app;
};
