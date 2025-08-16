// GraphQL queries and mutations for Shopify API
// These will be used by GraphQL Codegen to generate types

export const FIND_ORDER_BY_NAME = `#graphql
  query findOrderByName($query: String!) {
    orders(first: 1, query: $query) {
      edges {
        node {
          id
          name
          displayFulfillmentStatus
          fulfillmentOrders(first: 10) {
            edges {
              node {
                id
                status
                assignedLocation {
                  location {
                    id
                    name
                  }
                }
                lineItems(first: 100) {
                  edges {
                    node {
                      id
                      remainingQuantity
                      lineItem {
                        id
                        name
                        requiresShipping
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`

export const CREATE_FULFILLMENT = `#graphql
  mutation fulfillmentCreate($fulfillment: FulfillmentInput!) {
    fulfillmentCreate(fulfillment: $fulfillment) {
      fulfillment {
        id
        status
        trackingInfo {
          number
          company
          url
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`

export const GET_LOCATIONS = `#graphql
  query getLocations {
    locations(first: 50) {
      edges {
        node {
          id
          name
          isActive
        }
      }
    }
  }
`
