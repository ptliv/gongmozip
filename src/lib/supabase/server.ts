/**
 * Supabase factories for server components, route handlers, and server actions.
 *
 * createServerClient uses the anon key and RLS for public reads.
 * createAdminClient uses the service role key for admin writes and maintenance.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `[Supabase] Missing environment variable "${key}". Check .env.local.`
    );
  }
  return value;
}

type NextFetchInit = RequestInit & {
  next?: {
    revalidate?: number | false;
    tags?: string[];
  };
};

const PUBLIC_DATA_REVALIDATE_SECONDS = Number(
  process.env.PUBLIC_DATA_REVALIDATE_SECONDS ?? 300
);

function uncachedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, {
    ...init,
    cache: "no-store",
  });
}

function cachedPublicFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const method = (init?.method ?? "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    return uncachedFetch(input, init);
  }

  const nextInit = init as NextFetchInit | undefined;
  return fetch(input, {
    ...nextInit,
    next: {
      ...nextInit?.next,
      revalidate: PUBLIC_DATA_REVALIDATE_SECONDS,
    },
  });
}

export function createServerClient() {
  return createClient<Database>(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      auth: { persistSession: false },
      global: { fetch: cachedPublicFetch },
    }
  );
}

export function createAdminClient() {
  return createClient<Database>(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: uncachedFetch },
    }
  );
}
