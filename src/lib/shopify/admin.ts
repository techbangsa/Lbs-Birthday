import "server-only";

import { env, getShopifyAdminApiUrl } from "@/lib/env";

type GraphQlError = {
  message: string;
  path?: Array<string | number>;
  extensions?: { code?: string } & Record<string, unknown>;
};

type GraphQlCostExtensions = {
  cost?: {
    requestedQueryCost?: number;
    actualQueryCost?: number | null;
    throttleStatus?: {
      maximumAvailable?: number;
      currentlyAvailable?: number;
      restoreRate?: number;
    };
  };
};

type GraphQlResponse<TData> = {
  data?: TData;
  errors?: GraphQlError[];
  extensions?: GraphQlCostExtensions;
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

function describeGraphQlErrors(errors: GraphQlError[]) {
  return errors
    .map((error) => (error.extensions?.code ? `[${error.extensions.code}] ${error.message}` : error.message))
    .join("; ");
}

function isThrottled(errors: GraphQlError[]) {
  return errors.some((error) => error.extensions?.code === "THROTTLED");
}

/**
 * Shopify's GraphQL Admin API uses a cost-based leaky bucket: each store gets a
 * fixed point bucket that refills over time. Scanning thousands of customers
 * burns through it fast, so on THROTTLED errors we wait until enough points
 * have restored (per the API's own throttleStatus) before retrying, instead
 * of failing the whole run.
 */
function computeThrottleWaitMs(extensions: GraphQlCostExtensions | undefined) {
  const throttleStatus = extensions?.cost?.throttleStatus;
  const requestedCost = extensions?.cost?.requestedQueryCost;

  if (throttleStatus?.restoreRate && requestedCost !== undefined) {
    const deficit = requestedCost - (throttleStatus.currentlyAvailable ?? 0);
    if (deficit > 0) {
      const waitSeconds = deficit / throttleStatus.restoreRate;
      return Math.min(Math.max(waitSeconds * 1000, 500), 10_000);
    }
  }

  return 1500;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MAX_THROTTLE_RETRIES = 5;

export async function shopifyAdminRequest<TData, TVariables extends Record<string, unknown> | undefined = undefined>(
  query: string,
  variables?: TVariables,
) {
  for (let attempt = 0; attempt <= MAX_THROTTLE_RETRIES; attempt += 1) {
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

    // Shopify signals both HTTP 429 and a 200-with-THROTTLED GraphQL error
    // depending on where the request was rejected. Treat both as retryable.
    if (response.status === 429 || (payload?.errors?.length && isThrottled(payload.errors))) {
      if (attempt < MAX_THROTTLE_RETRIES) {
        const retryAfterHeader = response.headers.get("retry-after");
        const waitMs = retryAfterHeader
          ? Number(retryAfterHeader) * 1000
          : computeThrottleWaitMs(payload?.extensions);
        await sleep(waitMs);
        continue;
      }
    }

    if (!response.ok) {
      throw new ShopifyAdminError(
        `Shopify Admin API request failed with status ${response.status}${
          payload?.errors?.length ? `: ${describeGraphQlErrors(payload.errors)}` : "."
        }`,
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
      throw new ShopifyAdminError(
        `Shopify Admin API returned GraphQL errors: ${describeGraphQlErrors(payload.errors)}`,
        payload.errors,
        response.status,
      );
    }

    if (!payload.data) {
      throw new ShopifyAdminError("Shopify Admin API returned an empty response.", [], response.status);
    }

    return payload.data;
  }

  // Unreachable: the loop above always returns or throws, but TypeScript
  // needs an explicit exit path.
  throw new ShopifyAdminError("Shopify Admin API request exhausted retries.");
}