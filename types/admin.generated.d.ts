/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
import type * as AdminTypes from './admin.types';

export type GetShopQueryVariables = AdminTypes.Exact<{ [key: string]: never; }>;


export type GetShopQuery = { shop: (
    Pick<AdminTypes.Shop, 'name' | 'email' | 'currencyCode'>
    & { primaryDomain: Pick<AdminTypes.Domain, 'url'> }
  ) };

export type GetLocationsQueryVariables = AdminTypes.Exact<{ [key: string]: never; }>;


export type GetLocationsQuery = { locations: { edges: Array<{ node: Pick<AdminTypes.Location, 'id' | 'name' | 'isActive'> }> } };

export type GetRecentOrderQueryVariables = AdminTypes.Exact<{ [key: string]: never; }>;


export type GetRecentOrderQuery = { orders: { edges: Array<{ node: (
        Pick<AdminTypes.Order, 'id' | 'name' | 'displayFulfillmentStatus'>
        & { fulfillmentOrders: { edges: Array<{ node: (
              Pick<AdminTypes.FulfillmentOrder, 'id' | 'status'>
              & { assignedLocation: { location?: AdminTypes.Maybe<Pick<AdminTypes.Location, 'id' | 'name'>> } }
            ) }> } }
      ) }> } };

export type GetAccessScopesQueryVariables = AdminTypes.Exact<{ [key: string]: never; }>;


export type GetAccessScopesQuery = { shop: Pick<AdminTypes.Shop, 'id'>, appInstallation?: AdminTypes.Maybe<{ accessScopes: Array<Pick<AdminTypes.AccessScope, 'handle'>> }> };

export type FindOrderByNameQueryVariables = AdminTypes.Exact<{
  query: AdminTypes.Scalars['String']['input'];
}>;


export type FindOrderByNameQuery = { orders: { edges: Array<{ node: (
        Pick<AdminTypes.Order, 'id' | 'name' | 'displayFulfillmentStatus'>
        & { fulfillmentOrders: { edges: Array<{ node: (
              Pick<AdminTypes.FulfillmentOrder, 'id' | 'status'>
              & { assignedLocation: { location?: AdminTypes.Maybe<Pick<AdminTypes.Location, 'id' | 'name'>> }, lineItems: { edges: Array<{ node: (
                    Pick<AdminTypes.FulfillmentOrderLineItem, 'id' | 'remainingQuantity'>
                    & { lineItem: Pick<AdminTypes.LineItem, 'id' | 'name' | 'requiresShipping'> }
                  ) }> } }
            ) }> } }
      ) }> } };

export type FulfillmentCreateMutationVariables = AdminTypes.Exact<{
  fulfillment: AdminTypes.FulfillmentInput;
}>;


export type FulfillmentCreateMutation = { fulfillmentCreate?: AdminTypes.Maybe<{ fulfillment?: AdminTypes.Maybe<(
      Pick<AdminTypes.Fulfillment, 'id' | 'status'>
      & { trackingInfo: Array<Pick<AdminTypes.FulfillmentTrackingInfo, 'number' | 'company' | 'url'>> }
    )>, userErrors: Array<Pick<AdminTypes.UserError, 'field' | 'message'>> }> };

interface GeneratedQueryTypes {
  "#graphql\n  query getShop {\n    shop {\n      name\n      email\n      currencyCode\n      primaryDomain {\n        url\n      }\n    }\n  }\n": {return: GetShopQuery, variables: GetShopQueryVariables},
  "#graphql\n  query getLocations {\n    locations(first: 50) {\n      edges {\n        node {\n          id\n          name\n          isActive\n        }\n      }\n    }\n  }\n": {return: GetLocationsQuery, variables: GetLocationsQueryVariables},
  "#graphql\n  query getRecentOrder {\n    orders(first: 1) {\n      edges {\n        node {\n          id\n          name\n          displayFulfillmentStatus\n          fulfillmentOrders(first: 10) {\n            edges {\n              node {\n                id\n                status\n                assignedLocation {\n                  location {\n                    id\n                    name\n                  }\n                }\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n": {return: GetRecentOrderQuery, variables: GetRecentOrderQueryVariables},
  "#graphql\n  query getAccessScopes {\n    shop {\n      id\n    }\n    appInstallation {\n      accessScopes {\n        handle\n      }\n    }\n  }\n": {return: GetAccessScopesQuery, variables: GetAccessScopesQueryVariables},
  "#graphql\n  query findOrderByName($query: String!) {\n    orders(first: 1, query: $query) {\n      edges {\n        node {\n          id\n          name\n          displayFulfillmentStatus\n          fulfillmentOrders(first: 10) {\n            edges {\n              node {\n                id\n                status\n                assignedLocation {\n                  location {\n                    id\n                    name\n                  }\n                }\n                lineItems(first: 100) {\n                  edges {\n                    node {\n                      id\n                      remainingQuantity\n                      lineItem {\n                        id\n                        name\n                        requiresShipping\n                      }\n                    }\n                  }\n                }\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n": {return: FindOrderByNameQuery, variables: FindOrderByNameQueryVariables},
}

interface GeneratedMutationTypes {
  "#graphql\n  mutation fulfillmentCreate($fulfillment: FulfillmentInput!) {\n    fulfillmentCreate(fulfillment: $fulfillment) {\n      fulfillment {\n        id\n        status\n        trackingInfo {\n          number\n          company\n          url\n        }\n      }\n      userErrors {\n        field\n        message\n      }\n    }\n  }\n": {return: FulfillmentCreateMutation, variables: FulfillmentCreateMutationVariables},
}
declare module '@shopify/admin-api-client' {
  type InputMaybe<T> = AdminTypes.InputMaybe<T>;
  interface AdminQueries extends GeneratedQueryTypes {}
  interface AdminMutations extends GeneratedMutationTypes {}
}
