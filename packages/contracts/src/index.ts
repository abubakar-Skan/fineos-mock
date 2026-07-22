export * from "./result";
export * from "./party";
export * from "./notification";
export * from "./case-execution";
export * from "./case-dossier";
export * from "./target-state";
export * from "./api-errors";
export * from "./intake-sections";
export * from "./feature-flags";

export type ApiResult<T, E extends string> =
  | { ok: true; value: T }
  | { ok: false; error: E; message: string };
