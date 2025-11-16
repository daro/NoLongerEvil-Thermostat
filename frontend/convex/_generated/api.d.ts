/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as apiKeys from "../apiKeys.js";
import type * as crons from "../crons.js";
import type * as crypto_actions from "../crypto_actions.js";
import type * as device from "../device.js";
import type * as integrations from "../integrations.js";
import type * as integrations_actions from "../integrations_actions.js";
import type * as logs from "../logs.js";
import type * as sessions from "../sessions.js";
import type * as shares from "../shares.js";
import type * as users from "../users.js";
import type * as weather from "../weather.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  apiKeys: typeof apiKeys;
  crons: typeof crons;
  crypto_actions: typeof crypto_actions;
  device: typeof device;
  integrations: typeof integrations;
  integrations_actions: typeof integrations_actions;
  logs: typeof logs;
  sessions: typeof sessions;
  shares: typeof shares;
  users: typeof users;
  weather: typeof weather;
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
