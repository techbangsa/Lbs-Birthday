import "server-only";

import { z } from "zod";

const envSchema = z.object({
  SHOPIFY_ACCESS_TOKEN: z.string().trim().min(1),
  SHOPIFY_STORE_URL: z.string().trim().min(1),
  DATABASE_URL: z.string().trim().min(1),
  CRON_SECRET: z.string().trim().min(1),
  SHOPIFY_API_VERSION: z.string().trim().min(1).default("2026-04"),
});

function normalizeStoreUrl(value: string) {
  return value.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
}

const parsedEnv = envSchema.safeParse({
  ...process.env,
  SHOPIFY_STORE_URL: process.env.SHOPIFY_STORE_URL
    ? normalizeStoreUrl(process.env.SHOPIFY_STORE_URL)
    : process.env.SHOPIFY_STORE_URL,
});

if (!parsedEnv.success) {
  console.error("Invalid environment configuration", parsedEnv.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration.");
}

export const env = parsedEnv.data;

export function getShopifyAdminApiUrl() {
  return `https://${env.SHOPIFY_STORE_URL}/admin/api/${env.SHOPIFY_API_VERSION}/graphql.json`;
}