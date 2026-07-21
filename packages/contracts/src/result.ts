export type DomainResult<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const succeed = <T>(value: T): DomainResult<T, never> => ({
  ok: true,
  value,
});

export const fail = <E>(error: E): DomainResult<never, E> => ({
  ok: false,
  error,
});
