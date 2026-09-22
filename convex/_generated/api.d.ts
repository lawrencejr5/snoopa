/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as auth from "../auth.js";
import type * as brave from "../brave.js";
import type * as chat from "../chat.js";
import type * as crons from "../crons.js";
import type * as feedback from "../feedback.js";
import type * as firecrawl from "../firecrawl.js";
import type * as firehose from "../firehose.js";
import type * as http from "../http.js";
import type * as log from "../log.js";
import type * as migrations from "../migrations.js";
import type * as monitored_sources from "../monitored_sources.js";
import type * as notifications from "../notifications.js";
import type * as openrouter from "../openrouter.js";
import type * as session from "../session.js";
import type * as snoops from "../snoops.js";
import type * as tavily from "../tavily.js";
import type * as trending from "../trending.js";
import type * as users from "../users.js";
import type * as utils from "../utils.js";
import type * as waitlist from "../waitlist.js";
import type * as watchlist from "../watchlist.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  auth: typeof auth;
  brave: typeof brave;
  chat: typeof chat;
  crons: typeof crons;
  feedback: typeof feedback;
  firecrawl: typeof firecrawl;
  firehose: typeof firehose;
  http: typeof http;
  log: typeof log;
  migrations: typeof migrations;
  monitored_sources: typeof monitored_sources;
  notifications: typeof notifications;
  openrouter: typeof openrouter;
  session: typeof session;
  snoops: typeof snoops;
  tavily: typeof tavily;
  trending: typeof trending;
  users: typeof users;
  utils: typeof utils;
  waitlist: typeof waitlist;
  watchlist: typeof watchlist;
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
