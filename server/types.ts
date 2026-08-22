// Shared TypeScript types used across controllers, routes, middleware and
// utils. Keeping these in one place avoids the duplicate/inline interface
// definitions that were previously scattered across db.ts, crud.ts and
// auth.ts, and gives every other module a single import to depend on.

/** A generic database row as returned by mysql2 (before/after JSON shaping). */
export type Row = Record<string, unknown>;

/** Roles recognized by the auth/role-gating middleware. */
export type UserRole =
  | "admin"
  | "manager"
  | "register_user"
  | "assessor"
  | "editor"
  | "reader"
  | "audit";

/** Minimal profile shape needed to sign a session token. */
export interface AuthProfile {
  id: string;
  email: string;
  role: UserRole;
}

/** Decoded session info attached to `req.auth` by `requireAuth`. */
export interface AuthContext {
  id: string;
  email: string;
  role: UserRole;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

/** Options accepted by `createCrudRouter` to customize a generic table router. */
export interface CrudRouterOptions {
  insertRoles?: UserRole[];
  updateRoles?: UserRole[];
  deleteRoles?: UserRole[];
  withDepartment?: boolean;
  withIpRelations?: boolean;
  autoAssetId?: boolean;
  autoCode?: boolean;
  afterInsert?: (connection: any, id: string, body: Row) => Promise<void>;
  afterUpdate?: (connection: any, id: string, body: Row) => Promise<void>;
  afterDelete?: (connection: any, id: string) => Promise<void>;
}

/** Input accepted by `sendMail`. */
export interface SendMailInput {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Per-router context shared between the CRUD route factory and the CRUD
 * controller handlers: which table/options this router instance serves,
 * plus a mutable holder for the table's column list (populated once,
 * asynchronously, right after the router is created - mirroring the
 * original `let columns: string[]` closure in crud.ts).
 */
export interface CrudContext {
  table: string;
  opts: CrudRouterOptions;
  columnsState: { columns: string[] };
}
