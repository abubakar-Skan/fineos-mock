import Fastify, { type FastifyInstance } from "fastify";
import fastifyStatic from "@fastify/static";
import { AUTOMATION_SHORTCUTS_ENABLED } from "@fineos/contracts";
import type { Db } from "./infrastructure/database";
import {
  createCaseRepository,
  createNotificationRepository,
  createPartyRepository,
} from "./infrastructure/repositories";
import { createPartyService } from "./application/party-service";
import { createNotificationService } from "./application/notification-service";
import { createExecutionService } from "./application/execution-service";
import { createTargetStateService } from "./application/target-state-service";
import { registerSessionRoutes } from "./boundary/session-routes";
import { registerPartyRoutes } from "./boundary/party-routes";
import { registerNotificationRoutes } from "./boundary/notification-routes";
import { registerCaseRoutes } from "./boundary/case-routes";
import { registerTargetStateRoutes } from "./boundary/target-state-routes";
import { registerTestRoutes } from "./boundary/test-routes";

interface AppOptions {
  readonly resetTestData?: () => void;
  readonly webRoot?: string;
  // Code-level override for API unit tests only; production passes nothing and
  // inherits the shared source constant. There is no runtime external override.
  readonly automationShortcutsEnabled?: boolean;
}

const API_PREFIX = "/api";

export const buildApp = (db: Db, options: AppOptions = {}): FastifyInstance => {
  const app = Fastify();
  const parties = createPartyRepository(db);
  const notifications = createNotificationRepository(db);
  const cases = createCaseRepository(db);
  registerSessionRoutes(app);
  registerPartyRoutes(app, createPartyService(parties));
  registerNotificationRoutes(app, createNotificationService({ parties, notifications }));
  registerCaseRoutes(
    app,
    createExecutionService({ notifications, cases, parties }),
    options.automationShortcutsEnabled ?? AUTOMATION_SHORTCUTS_ENABLED,
  );
  registerTargetStateRoutes(app, createTargetStateService({ notifications, cases }));
  registerTestRoutes(app, options.resetTestData);
  if (options.webRoot) serveWebApp(app, options.webRoot);
  return app;
};

// Single-container mode: serve the built SPA and fall back to index.html so
// client-side routes resolve, while unmatched /api paths still return 404.
const serveWebApp = (app: FastifyInstance, root: string): void => {
  app.register(fastifyStatic, { root });
  app.setNotFoundHandler((req, reply) => {
    if (req.method === "GET" && !req.url.startsWith(API_PREFIX)) return reply.sendFile("index.html");
    return reply.status(404).send({ error: "not_found" });
  });
};
