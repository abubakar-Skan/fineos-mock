# FINEOS AdminSuite Mock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a visually faithful FINEOS AdminSuite mock with an end-to-end notification-intake and case-execution flow backed by a lightweight Fastify API and SQLite.

**Architecture:** A single npm workspace contains a React/Vite frontend, Fastify API, and shared TypeScript contracts. Domain rules remain pure, API boundaries validate external input, SQLite repositories persist mock records, and Playwright verifies behavior and source-image fidelity.

**Tech Stack:** TypeScript, React, Vite, React Router, Fastify, Zod, better-sqlite3, Vitest, Testing Library, Playwright, ESLint, plain CSS.

## Global Constraints

- Target project: `/Users/abubakar/Desktop/fineos-app`.
- UI sources: `/Users/abubakar/Desktop/fineos-mock/FINEOS_notification_intake_walkthrough.html` and `/Users/abubakar/Desktop/fineos-mock/FINEOS_case_execution_walkthrough.html`.
- Process source: `/Users/abubakar/Desktop/fineos-mock/aop-full/discovery_aop.json`.
- Match intake at `1500×945` and execution at `1450×905`; retain each special state’s captured dimensions in visual tests.
- Build semantic DOM/CSS; do not use screenshots as page backgrounds.
- Every visible control must have deterministic behavior.
- Do not add adjudication, payment, or closure screens after the provider step.
- Preserve exact Erica Alexander, David Hunter, Travis Larson, and `O80` reference fixtures; generated cases remain internally coherent.
- Functions remain at most 10 lines and nesting depth at most 3.
- Business failures use typed discriminated results, not thrown exceptions or `null`.
- Boundary → Control → Entity dependency direction is mandatory; domain modules import no Fastify or SQLite code.
- Tests use Given/When/Then, behavior-readable names, builders, and at least one negative scenario per aggregate.
- The target is not a Git repository; do not create commits.

---

### Task 1: Scaffold the TypeScript Workspace

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `eslint.config.js`
- Create: `.gitignore`
- Create: `apps/web/package.json`
- Create: `apps/web/index.html`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/src/main.tsx`
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `packages/contracts/package.json`
- Create: `packages/contracts/tsconfig.json`
- Create: `packages/contracts/src/index.ts`

**Interfaces:**
- Produces npm scripts: `dev`, `build`, `lint`, `test`, `test:e2e`, `test:visual`, `db:reset`.
- Produces workspace imports through `@fineos/contracts`.

- [ ] Write a workspace smoke test that imports `@fineos/contracts` from both applications.
- [ ] Run the smoke test and verify it fails because the workspace is unconfigured.
- [ ] Initialize npm workspaces and install the latest required packages using npm.
- [ ] Add strict TypeScript, ESLint, Vite, Vitest, and Playwright configuration.
- [ ] Add minimal web/API entry points and export `ApiResult<T, E>` from contracts:

```ts
export type ApiResult<T, E extends string> =
  | { ok: true; value: T }
  | { ok: false; error: E; message: string };
```

- [ ] Run `npm run build && npm run lint && npm test`.
- [ ] Expected: all workspace smoke checks pass.

### Task 2: Extract and Index the 64 Reference Screens

**Files:**
- Create: `scripts/extract-reference-images.mjs`
- Create: `tests/visual/reference/manifest.json`
- Create: `tests/visual/reference/intake/*.png`
- Create: `tests/visual/reference/execution/*.png`
- Create: `scripts/extract-reference-images.test.mjs`

**Interfaces:**
- Produces manifest entries `{ id, flow, step, state, width, height, caption, file }`.
- Consumes the two supplied walkthrough HTML files without modifying them.

- [ ] Write a failing extraction test asserting 37 intake and 27 execution PNGs with valid PNG signatures and dimensions.
- [ ] Run `node --test scripts/extract-reference-images.test.mjs`.
- [ ] Implement extraction with Node standard-library regex/base64 handling and deterministic filenames.
- [ ] Derive dimensions from PNG IHDR bytes and captions from each figure.
- [ ] Generate `manifest.json` and all 64 source PNGs.
- [ ] Re-run the extraction test.
- [ ] Expected: 64 images, unique IDs, valid dimensions, no wrapper chrome classified as AdminSuite UI.

### Task 3: Define Shared Contracts and Pure Domain Rules

**Files:**
- Create: `packages/contracts/src/result.ts`
- Create: `packages/contracts/src/party.ts`
- Create: `packages/contracts/src/notification.ts`
- Create: `packages/contracts/src/case-execution.ts`
- Create: `apps/api/src/domain/notification.ts`
- Create: `apps/api/src/domain/case-execution.ts`
- Create: `apps/api/test/builders.ts`
- Create: `apps/api/test/notification-domain.test.ts`
- Create: `apps/api/test/case-execution-domain.test.ts`

**Interfaces:**
- `createNotification(input): DomainResult<Notification, NotificationError>`
- `submitNotification(notification): DomainResult<Submission, NotificationError>`
- `executeCase(input): DomainResult<ExecutionOutcome, ExecutionError>`
- Component scopes: intake `leave_only | gdc_only | leave_and_gdc`; execution `absence_only | gdc_only | absence_and_gdc`.
- Terminal outcomes: `COMPLETED`, `ESCALATED_CASE_NOT_FOUND`, `ESCALATED_INELIGIBLE_INTAKE`, `ESCALATED_CONDITIONS_NOT_MET`.

- [ ] Write scenario tests for Leave-only, GDC-only, both, unsupported component scope, missing case, ineligible intake, missing condition, provider attach, and provider skip.
- [ ] Run domain tests and verify failures occur because domain functions are absent.
- [ ] Define immutable value types and typed error unions.
- [ ] Implement minimal pure factories/rules matching the full AOP’s decisions and activated-track joins.
- [ ] Re-run domain tests.
- [ ] Expected: all scenario tests pass without Fastify or SQLite imports in domain files.

### Task 4: Implement SQLite Persistence and Seed Fixtures

**Files:**
- Create: `apps/api/src/infrastructure/database.ts`
- Create: `apps/api/src/infrastructure/schema.sql`
- Create: `apps/api/src/infrastructure/repositories.ts`
- Create: `apps/api/src/infrastructure/seed.ts`
- Create: `apps/api/src/application/ports.ts`
- Create: `apps/api/test/database.test.ts`
- Create: `data/.gitkeep`

**Interfaces:**
- Tables: `party`, `notification`, `absence_case`, `absence_period`, `gdc_case`, `case_execution_run`.
- Repository ports reference aggregates by ID only.
- `resetDatabase(path): Database`
- `seedDatabase(db): void`

- [ ] Write failing tests for schema constraints, deterministic seed rows, generated ID allocation, duplicate-submit idempotency, and one in-flight execution per case.
- [ ] Run `npm test --workspace apps/api -- database`.
- [ ] Implement schema creation and repository functions with better-sqlite3 transactions.
- [ ] Seed Erica Alexander, David Hunter, Travis Larson, their exact screenshot cases, and an execution-negative missing ID.
- [ ] Add root `npm run db:reset`.
- [ ] Re-run database tests twice to prove deterministic reset.

### Task 5: Implement Fastify Boundaries and Application Controls

**Files:**
- Create: `apps/api/src/application/party-service.ts`
- Create: `apps/api/src/application/notification-service.ts`
- Create: `apps/api/src/application/execution-service.ts`
- Create: `apps/api/src/boundary/session-routes.ts`
- Create: `apps/api/src/boundary/party-routes.ts`
- Create: `apps/api/src/boundary/notification-routes.ts`
- Create: `apps/api/src/boundary/case-routes.ts`
- Create: `apps/api/src/app.ts`
- Create: `apps/api/src/server.ts`
- Create: `apps/api/test/api.test.ts`

**Interfaces:**
- `POST /api/session`
- `GET /api/parties/search`
- `GET /api/parties/:partyId`
- `PATCH /api/parties/:partyId/contact`
- `POST /api/parties/:partyId/notifications`
- `PUT /api/notifications/:draftId/sections/:sectionKey`
- `POST /api/notifications/:draftId/submit`
- `GET /api/cases/search`
- `GET /api/cases/:caseId`
- `POST /api/cases/:caseId/execute`
- `GET /api/cases/:caseId/execution-runs/:runId`

- [ ] Write failing Fastify injection tests for every endpoint and typed error response.
- [ ] Run `npm test --workspace apps/api -- api`.
- [ ] Implement Zod boundary parsing and services that handle every `DomainResult`.
- [ ] Keep transactions inside application controls; boundaries only translate HTTP input/output.
- [ ] Re-run API tests.
- [ ] Expected: success, 404, 409, and 422 scenarios match shared contracts.

### Task 6: Build the Shared FINEOS Shell and Access Screens

**Files:**
- Create: `apps/web/src/app/router.tsx`
- Create: `apps/web/src/app/api.ts`
- Create: `apps/web/src/styles/tokens.css`
- Create: `apps/web/src/styles/global.css`
- Create: `apps/web/src/components/fineos/AppShell.tsx`
- Create: `apps/web/src/components/fineos/RecordShell.tsx`
- Create: `apps/web/src/components/fineos/DataTable.tsx`
- Create: `apps/web/src/components/fineos/Dialog.tsx`
- Create: `apps/web/src/features/access/LoginPage.tsx`
- Create: `apps/web/src/features/dashboard/DashboardPage.tsx`
- Create: `apps/web/src/features/search/SearchDialog.tsx`
- Create: `apps/web/src/features/party/PartyPage.tsx`
- Create: `apps/web/src/features/access/access.test.tsx`

**Interfaces:**
- Routes: `/login`, `/dashboard`, `/parties/:partyId`.
- Shared controls expose semantic buttons, tabs, dialogs, tables, and status badges.

- [ ] Write failing component tests for login, search tabs/results, modal focus, party tabs, and visible button behavior.
- [ ] Run `npm test --workspace apps/web -- access`.
- [ ] Implement the shared shell and access routes using extracted references.
- [ ] Add deterministic behavior for every visible dashboard/search/party action.
- [ ] Re-run component tests at desktop viewport.

### Task 7: Build the Notification Intake Wizard

**Files:**
- Create: `apps/web/src/features/intake/intake-steps.ts`
- Create: `apps/web/src/features/intake/IntakeWizard.tsx`
- Create: `apps/web/src/features/intake/fields/*.tsx`
- Create: `apps/web/src/features/intake/modals/AbsencePeriodDialog.tsx`
- Create: `apps/web/src/features/intake/modals/ProviderDialog.tsx`
- Create: `apps/web/src/features/intake/ConfirmationPage.tsx`
- Create: `apps/web/src/features/intake/intake.test.tsx`

**Interfaces:**
- Route: `/notifications/:draftId/intake/:step`.
- Saves each step through `PUT /api/notifications/:draftId/sections/:sectionKey`.
- Submission navigates to `/notifications/:draftId/confirmation`.

- [ ] Write failing tests for all 14 stages, Previous/Next/Reset/Close, validation, dropdown states, date picker, absence-period modal, provider modal, conditional Leave/GDC stages, and confirmation IDs.
- [ ] Run `npm test --workspace apps/web -- intake`.
- [ ] Implement the wizard shell and data-driven stage registry.
- [ ] Implement all controls and deterministic unsupported-control behavior.
- [ ] Integrate draft save/submit APIs and generated-case links.
- [ ] Re-run intake tests.

### Task 8: Build Case Execution and Lookup Screens

**Files:**
- Create: `apps/web/src/features/cases/case-tabs.ts`
- Create: `apps/web/src/features/cases/CasePage.tsx`
- Create: `apps/web/src/features/cases/DocumentsTab.tsx`
- Create: `apps/web/src/features/cases/CaseMapTab.tsx`
- Create: `apps/web/src/features/cases/AbsenceTabs.tsx`
- Create: `apps/web/src/features/cases/GdcTabs.tsx`
- Create: `apps/web/src/features/cases/DiagnosisPanel.tsx`
- Create: `apps/web/src/features/cases/ProviderFlow.tsx`
- Create: `apps/web/src/features/lookups/LookupPage.tsx`
- Create: `apps/web/src/features/cases/cases.test.tsx`

**Interfaces:**
- Routes: `/cases/:caseId/:tab`, `/lookups/:source`.
- Execution consumes `POST /api/cases/:caseId/execute`.
- Every DEC/FORK/JOIN outcome has a deterministic UI state.

- [ ] Write failing tests for documents, case map, claimant contact, absence-only, GDC-only, both tracks, diagnosis lookup/entry, provider attach/skip, and all escalation terminals.
- [ ] Run `npm test --workspace apps/web -- cases`.
- [ ] Implement record shells, tabs, panels, lookup pages, status states, and provider flow.
- [ ] Preserve exact reference-fixture inconsistencies while rendering generated cases coherently.
- [ ] Re-run case tests.

### Task 9: Exercise Full E2E Behavior

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/full-lifecycle.spec.ts`
- Create: `tests/e2e/negative-branches.spec.ts`
- Create: `tests/e2e/control-audit.spec.ts`

**Interfaces:**
- Starts API and web applications through Playwright `webServer`.
- Resets SQLite before each suite.

- [ ] Write failing E2E scenarios for login → Erica intake → submit → generated case search → execution.
- [ ] Add negative scenarios for unsupported component scope, duplicate submit, missing case, ineligible intake, missing condition, provider skip, and concurrent execution.
- [ ] Add a control audit that clicks every visible button/tab/action and asserts a state change, dialog, navigation, or persisted mutation.
- [ ] Run `npm run test:e2e` and verify failures before all flows are wired.
- [ ] Complete route/API integration and deterministic reset hooks.
- [ ] Re-run E2E tests until all pass.

### Task 10: Match Every Reference Screen

**Files:**
- Create: `tests/visual/fineos.visual.spec.ts`
- Create: `tests/visual/visual-state-map.ts`
- Modify: frontend CSS/components identified by visual diffs.

**Interfaces:**
- Maps each manifest entry to `{ route, fixture, uiState, viewport }`.
- Produces screenshots and Playwright visual diffs.

- [ ] Write the visual test that visits every manifest state and compares it with the extracted source PNG.
- [ ] Run `npm run test:visual` and retain the first diff report.
- [ ] Fix shared shell geometry and typography before screen-specific details.
- [ ] Fix intake and execution screen families at their exact captured dimensions.
- [ ] Re-run all 64 comparisons.
- [ ] Expected: each comparison passes configured pixel thresholds; any source-only browser chrome difference is documented in `VISUAL_DIFFS.md`.

### Task 11: Final Verification and Handoff

**Files:**
- Create: `README.md`
- Create: `VISUAL_DIFFS.md`

- [ ] Document install, database reset, dev, build, test, E2E, and visual commands.
- [ ] Run `npm run db:reset`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Run `npm test`.
- [ ] Run `npm run test:e2e`.
- [ ] Run `npm run test:visual`.
- [ ] Start the app and manually exercise the full generated-case journey once.
- [ ] Verify every supplied screen has a manifest mapping and comparison result.
- [ ] Record only genuine, explained visual differences in `VISUAL_DIFFS.md`.
