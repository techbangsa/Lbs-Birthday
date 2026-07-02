import "server-only";

import type { CustomerListResponseDto } from "@/lib/birthdays/contracts";
import { shopifyAdminRequest } from "@/lib/shopify/admin";

export type ShopifyBirthdayCustomer = {
  id: string;
  displayName: string;
  email: string | null;
  birthdayValue: string | null;
  tags: string[];
};

type CustomersQueryResponse = {
  customers: {
    nodes: Array<{
      id: string;
      displayName: string;
      defaultEmailAddress: {
        emailAddress: string;
      } | null;
      tags: string[];
      metafield: {
        value: string;
      } | null;
    }>;
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
  };
};

export type ShopifyBirthdayCustomerListItem = {
  id: string;
  displayName: string;
  email: string | null;
  birthdayValue: string | null;
  tags: string[];
};

const BIRTHDAY_CUSTOMERS_QUERY = `#graphql
  query BirthdayCustomers($first: Int!, $after: String, $namespace: String!, $key: String!) {
    customers(first: $first, after: $after, sortKey: ID) {
      nodes {
        id
        displayName
        defaultEmailAddress {
          emailAddress
        }
        tags
        metafield(namespace: $namespace, key: $key) {
          value
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export async function* iterateCustomers({
  namespace,
  key,
  pageSize = 100,
  pageLimit,
}: {
  namespace: string;
  key: string;
  pageSize?: number;
  pageLimit?: number;
}): AsyncGenerator<ShopifyBirthdayCustomer> {
  let after: string | null = null;
  let hasNextPage = true;
  let pageCount = 0;

  while (hasNextPage && (pageLimit === undefined || pageCount < pageLimit)) {
    const data: CustomersQueryResponse = await shopifyAdminRequest<
      CustomersQueryResponse,
      {
        first: number;
        after: string | null;
        namespace: string;
        key: string;
      }
    >(BIRTHDAY_CUSTOMERS_QUERY, {
      first: pageSize,
      after,
      namespace,
      key,
    });

    for (const customer of data.customers.nodes) {
      yield {
        id: customer.id,
        displayName: customer.displayName,
        email: customer.defaultEmailAddress?.emailAddress ?? null,
        birthdayValue: customer.metafield?.value ?? null,
        tags: customer.tags,
      };
    }

    pageCount += 1;
    hasNextPage = data.customers.pageInfo.hasNextPage;
    after = data.customers.pageInfo.endCursor;
  }
}

export async function getCustomersPage({
  namespace,
  key,
  after = null,
  pageSize = 25,
}: {
  namespace: string;
  key: string;
  after?: string | null;
  pageSize?: number;
}): Promise<CustomerListResponseDto> {
  const data: CustomersQueryResponse = await shopifyAdminRequest<
    CustomersQueryResponse,
    {
      first: number;
      after: string | null;
      namespace: string;
      key: string;
    }
  >(BIRTHDAY_CUSTOMERS_QUERY, {
    first: pageSize,
    after,
    namespace,
    key,
  });

  return {
    customers: data.customers.nodes.map((customer) => ({
      id: customer.id,
      displayName: customer.displayName,
      email: customer.defaultEmailAddress?.emailAddress ?? null,
      birthdayValue: customer.metafield?.value ?? null,
      tags: customer.tags,
    })),
    pageInfo: data.customers.pageInfo,
  };
}

export async function getBirthdayCustomers({
  namespace,
  key,
}: {
  namespace: string;
  key: string;
}): Promise<ShopifyBirthdayCustomer[]> {
  const customers: ShopifyBirthdayCustomer[] = [];
  for await (const customer of iterateCustomers({ namespace, key, pageSize: 250 })) {
    if (customer.birthdayValue) {
      customers.push(customer);
    }
  }
  return customers;
}