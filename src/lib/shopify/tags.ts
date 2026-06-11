import "server-only";

import { shopifyAdminRequest } from "@/lib/shopify/admin";

type TagsAddResponse = {
  tagsAdd: {
    node: {
      id: string;
    } | null;
    userErrors: Array<{
      field: string[] | null;
      message: string;
    }>;
  };
};

type TagsRemoveResponse = {
  tagsRemove: {
    node: {
      id: string;
    } | null;
    userErrors: Array<{
      field: string[] | null;
      message: string;
    }>;
  };
};

const ADD_CUSTOMER_TAG_MUTATION = `#graphql
  mutation AddCustomerTag($id: ID!, $tags: [String!]!) {
    tagsAdd(id: $id, tags: $tags) {
      node {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const REMOVE_CUSTOMER_TAG_MUTATION = `#graphql
  mutation RemoveCustomerTag($id: ID!, $tags: [String!]!) {
    tagsRemove(id: $id, tags: $tags) {
      node {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export async function addCustomerTag(customerId: string, tag: string) {
  const data = await shopifyAdminRequest<
    TagsAddResponse,
    {
      id: string;
      tags: string[];
    }
  >(ADD_CUSTOMER_TAG_MUTATION, {
    id: customerId,
    tags: [tag],
  });

  if (data.tagsAdd.userErrors.length > 0) {
    throw new Error(data.tagsAdd.userErrors.map((error) => error.message).join("; "));
  }

  if (!data.tagsAdd.node) {
    throw new Error("Shopify did not confirm the tag update.");
  }

  return data.tagsAdd.node;
}

export async function removeCustomerTag(customerId: string, tag: string) {
  const data = await shopifyAdminRequest<
    TagsRemoveResponse,
    {
      id: string;
      tags: string[];
    }
  >(REMOVE_CUSTOMER_TAG_MUTATION, {
    id: customerId,
    tags: [tag],
  });

  if (data.tagsRemove.userErrors.length > 0) {
    throw new Error(data.tagsRemove.userErrors.map((error) => error.message).join("; "));
  }

  if (!data.tagsRemove.node) {
    throw new Error("Shopify did not confirm the tag removal.");
  }

  return data.tagsRemove.node;
}
