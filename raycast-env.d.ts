/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Supabase URL - Your Supabase project URL */
  "supabaseUrl": string,
  /** Supabase Anon Key - Your Supabase project anonymous key */
  "supabaseAnonKey": string,
  /** Supabase Service Role Key - Your Supabase project service role key */
  "supabaseServiceRoleKey": string,
  /** Clockify API Key - Your Clockify API key */
  "clockifyApiKey": string,
  /** Supabase Functions URL - Your Supabase Functions URL (e.g., https://your-project.supabase.co/functions/v1) */
  "supabaseFunctionsUrl": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `index` command */
  export type Index = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `index` command */
  export type Index = {}
}

