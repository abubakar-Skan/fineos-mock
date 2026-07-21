import type { ApiResult } from "@fineos/contracts";

export const apiOk = <T>(value: T): ApiResult<T, never> => ({ ok: true, value });

export const apiErr = <E extends string>(
  error: E,
  message: string,
): ApiResult<never, E> => ({ ok: false, error, message });
