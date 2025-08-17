/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as attachments from "../attachments.js";
import type * as auth from "../auth.js";
import type * as authDiagnostics from "../authDiagnostics.js";
import type * as createAdmin from "../createAdmin.js";
import type * as customPasswordProvider from "../customPasswordProvider.js";
import type * as debugUsers from "../debugUsers.js";
import type * as demoUsers from "../demoUsers.js";
import type * as departmentMocAccess from "../departmentMocAccess.js";
import type * as departments from "../departments.js";
import type * as emergencyPasswordReset from "../emergencyPasswordReset.js";
import type * as excel from "../excel.js";
import type * as fieldTracking from "../fieldTracking.js";
import type * as firstTimeAuth from "../firstTimeAuth.js";
import type * as http from "../http.js";
import type * as moc from "../moc.js";
import type * as mocExport from "../mocExport.js";
import type * as notifications from "../notifications.js";
import type * as passwordManagement from "../passwordManagement.js";
import type * as passwordMigration from "../passwordMigration.js";
import type * as passwordUtils from "../passwordUtils.js";
import type * as router from "../router.js";
import type * as simpleAuth from "../simpleAuth.js";
import type * as superAdmin from "../superAdmin.js";
import type * as userCreation from "../userCreation.js";
import type * as userDeletion from "../userDeletion.js";
import type * as userInternal from "../userInternal.js";
import type * as userSignup from "../userSignup.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  attachments: typeof attachments;
  auth: typeof auth;
  authDiagnostics: typeof authDiagnostics;
  createAdmin: typeof createAdmin;
  customPasswordProvider: typeof customPasswordProvider;
  debugUsers: typeof debugUsers;
  demoUsers: typeof demoUsers;
  departmentMocAccess: typeof departmentMocAccess;
  departments: typeof departments;
  emergencyPasswordReset: typeof emergencyPasswordReset;
  excel: typeof excel;
  fieldTracking: typeof fieldTracking;
  firstTimeAuth: typeof firstTimeAuth;
  http: typeof http;
  moc: typeof moc;
  mocExport: typeof mocExport;
  notifications: typeof notifications;
  passwordManagement: typeof passwordManagement;
  passwordMigration: typeof passwordMigration;
  passwordUtils: typeof passwordUtils;
  router: typeof router;
  simpleAuth: typeof simpleAuth;
  superAdmin: typeof superAdmin;
  userCreation: typeof userCreation;
  userDeletion: typeof userDeletion;
  userInternal: typeof userInternal;
  userSignup: typeof userSignup;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
