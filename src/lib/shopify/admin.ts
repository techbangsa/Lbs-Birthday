import "server-only";

import { env, getShopifyAdminApiUrl } from "@/lib/env";

type GraphQlError = {
  message: string;
  path?: Array<string | number>;
  extensions?: Record<string, unknown>;
};

type GraphQlResponse<TData> = {
  data?: TData;
  errors?: GraphQlError[];
};

export class ShopifyAdminError extends Error {
  constructor(
    message: string,
    readonly details: GraphQlError[] = [],
    readonly status?: number,
  ) {
    super(message);
    this.name = "ShopifyAdminError";
  }
}

export async function shopifyAdminRequest<TData, TVariables extends Record<string, unknown> | undefined = undefined>(
  query: string,
  variables?: TVariables,
) {
  const response = await fetch(getShopifyAdminApiUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": env.SHOPIFY_ACCESS_TOKEN,
    },
    cache: "no-store",
    body: JSON.stringify({ query, variables }),
  });

  const contentType = response.headers.get("content-type");
  const isJson = contentType && contentType.includes("application/json");

  let payload: GraphQlResponse<TData> | null = null;
  if (isJson) {
    try {
      payload = (await response.json()) as GraphQlResponse<TData>;
    } catch {
      // JSON parsing failed despite header
    }
  }

  if (!response.ok) {
    throw new ShopifyAdminError(
      `Shopify Admin API request failed with status ${response.status}.`,
      payload?.errors ?? [],
      response.status,
    );
  }

  if (!payload) {
    const responseText = await response.text().catch(() => "");
    throw new ShopifyAdminError(
      `Shopify Admin API returned non-JSON response (Status ${response.status}): ${responseText.substring(0, 200)}`,
      [],
      response.status,
    );
  }

  if (payload.errors?.length) {
    throw new ShopifyAdminError("Shopify Admin API returned GraphQL errors.", payload.errors, response.status);
  }

  if (!payload.data) {
    throw new ShopifyAdminError("Shopify Admin API returned an empty response.", [], response.status);
  }

  return payload.data;
}