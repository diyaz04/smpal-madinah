import type { QueryCounter } from "./db/queryCounter";
import type { Database } from "./db/client";
import type { PermissionScope } from "../shared/constants";
import type { AuthUser } from "../shared/types";

export type { AuthUser } from "../shared/types";

export type Env = {
  DB: D1Database;
  FILES: R2Bucket;
  ASSETS: Fetcher;
  ENVIRONMENT: string;
  SESSION_COOKIE_NAME: string;
  PASSWORD_PBKDF2_ITERATIONS: string;
  ACTIVITY_LOG_RETENTION_DAYS: string;
};

export interface SessionRecord {
  id: string;
  user_id: string;
  expires_at: string;
}

export type Variables = {
  db: Database;
  session: SessionRecord | null;
  user: AuthUser | null;
  queryCounter: QueryCounter;
  permissionScope: PermissionScope | null;
};

export type AppEnv = { Bindings: Env; Variables: Variables };
