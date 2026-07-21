import type { ApiResult } from "@fineos/contracts";
import { apiErr, apiOk } from "./api-result";

// ponytail: deterministic mock sign-in, not a real identity provider. Upgrade path:
// replace the shared secret with a Cognito/OIDC verifier when a real IdP exists.
const MOCK_PASSWORD = "fineos";

export interface Credentials {
  readonly username: string;
  readonly password: string;
}

export interface Session {
  readonly token: string;
  readonly username: string;
}

export const authenticate = (
  input: Credentials,
): ApiResult<Session, "invalid_credentials"> =>
  input.password === MOCK_PASSWORD
    ? apiOk({ token: `session-${input.username}`, username: input.username })
    : apiErr("invalid_credentials", "The supplied credentials were not recognized.");
