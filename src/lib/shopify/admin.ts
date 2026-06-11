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

  const payload = (await response.json()) as GraphQlResponse<TData>;

  if (!response.ok) {
    throw new ShopifyAdminError(
      `Shopify Admin API request failed with status ${response.status}.`,
      payload.errors ?? [],
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