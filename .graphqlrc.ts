// https://github.com/Shopify/shopify-app-js/blob/main/packages/apps/shopify-api/docs/guides/graphql-types.md
import { ApiType, shopifyApiProject } from '@shopify/api-codegen-preset'

export default {
  // For syntax highlighting (optional)
  schema: 'https://shopify.dev/admin-graphql-direct-proxy/2025-07',
  documents: ['src/**/*.ts'],
  projects: {
    default: shopifyApiProject({
      apiType: ApiType.Admin,
      apiVersion: '2025-07',
      documents: ['src/**/*.ts'],
      outputDir: './types',
    }),
  },
}
