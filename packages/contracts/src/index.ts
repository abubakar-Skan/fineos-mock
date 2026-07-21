export * from "./result";
export * from "./party";
export * from "./notification";
export * from "./case-execution";
export * from "./api-errors";
export * from "./intake-sections";

export type ApiResult<T, E extends string> =
  | { ok: true; value: T }
  | { ok: false; error: E; message: string };
