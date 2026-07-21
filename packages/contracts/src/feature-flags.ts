// Master switch for the case-execution automation shortcuts: the frontend
// "Run Case Execution" button plus its POST /api/cases/:caseId/execute and
// GET /api/cases/:caseId/execution-runs/:runId endpoints.
//
// Default false = agent-first mode: the mock exposes only the manual case
// workflow (tabs, forms, provider/diagnosis lookups) and leaves every decision
// to the external Playwright agent. Nothing auto-fills or auto-runs the process.
//
// The ONLY supported way to enable the shortcuts in production is to change this
// constant to `true` in source and rebuild/restart. There is deliberately no
// env var, query string, localStorage, API, or UI toggle. API unit tests may
// pass an explicit code-level `automationShortcutsEnabled` option to buildApp.
export const AUTOMATION_SHORTCUTS_ENABLED = false;
