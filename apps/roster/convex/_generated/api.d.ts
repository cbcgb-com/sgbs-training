/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as attendanceStatus from "../attendanceStatus.js";
import type * as auth from "../auth.js";
import type * as authEmail from "../authEmail.js";
import type * as demo from "../demo.js";
import type * as groupCoverage from "../groupCoverage.js";
import type * as homework from "../homework.js";
import type * as instructors from "../instructors.js";
import type * as migrations from "../migrations.js";
import type * as students from "../students.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  attendanceStatus: typeof attendanceStatus;
  auth: typeof auth;
  authEmail: typeof authEmail;
  demo: typeof demo;
  groupCoverage: typeof groupCoverage;
  homework: typeof homework;
  instructors: typeof instructors;
  migrations: typeof migrations;
  students: typeof students;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
