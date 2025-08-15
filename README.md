# laplace-fulfiller

Automated fulfillment service that syncs Rouzao (柔造) order shipments to Shopify.

## Features

- Monitors Rouzao orders every 5 minutes
- Automatically detects shipped orders (已发货)
- Fetches tracking information from Rouzao
- Creates fulfillments in Shopify for the Rouzao warehouse location only
- Maintains a local SQLite database to prevent duplicate fulfillments
- Supports multiple warehouse locations in Shopify

## Prerequisites

- [Bun](https://bun.sh) runtime
- Rouzao API token
- Shopify store with API access
- Shopify location named "Rouzao" or "柔造"

## Installation

```bash
bun install
```

## Configuration

Create a `.env` file in the project root with the following variables:

```env
# Rouzao API Configuration
ROUZAO_TOKEN=your_rouzao_token_here

# Shopify API Configuration
SHOPIFY_API_KEY=your_shopify_api_key_here
SHOPIFY_API_SECRET=your_shopify_api_secret_here
SHOPIFY_ACCESS_TOKEN=your_shopify_access_token_here
SHOPIFY_SHOP_DOMAIN=yourshop.myshopify.com
SHOPIFY_APP_URL=https://your-app-url.com
```

### Getting Rouzao Token

1. Log in to Rouzao (https://www.rouzao.com)
2. Open browser developer tools (F12)
3. Go to Network tab
4. Perform any action that calls the API
5. Look for the `Rouzao-Token` header in the request

### Setting up Shopify API Access

1. Create a private app in your Shopify admin
2. Grant the following permissions:
   - Read orders (`read_orders`)
   - Write orders (`write_orders`)
   - Read fulfillments (`read_fulfillments`)
   - Write fulfillments (`write_fulfillments`)
   - Read locations (`read_locations`) - optional, but recommended
   - Read merchant-managed fulfillment orders (`read_merchant_managed_fulfillment_orders`)
   - Write merchant-managed fulfillment orders (`write_merchant_managed_fulfillment_orders`)
   - Read assigned fulfillment orders (`read_assigned_fulfillment_orders`)
   - Write assigned fulfillment orders (`write_assigned_fulfillment_orders`)
3. Copy the API credentials

**Important**: The fulfillment order permissions are required for the app to work properly. Without these permissions, you'll receive 403 Forbidden errors when attempting to process orders.

### Shopify Location Setup

Ensure you have a location in Shopify named "Rouzao" or "柔造". The app will only fulfill orders from this specific location.

## Running

### Development

```bash
bun run index.ts
```

### Production

```bash
bun run index.ts
```

For production deployment, consider using a process manager like PM2:

```bash
pm2 start --interpreter ~/.bun/bin/bun index.ts --name laplace-fulfiller
```

## How It Works

1. **Order Monitoring**: Every 5 minutes, the service fetches the latest 30 orders from Rouzao
2. **Shipped Order Detection**: Filters orders with status "已发货" (shipped)
3. **Order Details**: For each shipped order, fetches detailed information including tracking
4. **Shopify Order Lookup**: Extracts the Shopify order number from the `third_party_order_sn` field (format: `SUBSPACE#xxxx`)
5. **Fulfillment Creation**: Creates a fulfillment in Shopify with tracking information, but only for items assigned to the Rouzao warehouse
6. **Duplicate Prevention**: Records fulfilled orders in SQLite to avoid duplicate processing

## Database

The service creates a local SQLite database (`fulfillments.db`) to track fulfilled orders. The database includes:

- Rouzao order ID
- Shopify order number
- Shopify order ID
- Fulfillment timestamp
- Creation timestamp

Old records (>30 days) are automatically cleaned up daily at midnight.

## Logging

All activities are logged with ISO timestamps. Monitor the console output for:

- Order fetch results
- Shipped order processing
- Fulfillment success/failure
- Error messages

## Troubleshooting

### Common Issues

1. **"Rouzao location not found"**: Ensure you have a location named "Rouzao" or "柔造" in Shopify
2. **"Order already fulfilled"**: The order has already been processed or fulfilled in Shopify
3. **"Invalid third party order SN format"**: The order doesn't have a valid Shopify reference
4. **API errors**: Check your API tokens and network connectivity

### Debug Mode

To see more detailed logs, you can modify the console.log statements in the code or add additional logging.

### Diagnostic Tool

Run the diagnostic script to check your Shopify API permissions and connections:

```bash
# REST version (legacy)
bun run diagnose.ts

# GraphQL version (recommended)
bun run diagnose-graphql.ts
```

This will test:

- Environment variable configuration
- Shopify API authentication
- Access scopes granted to your app
- Locations API access (lists all warehouse locations)
- Orders and Fulfillment Orders API access
- Rouzao location availability

## Development

### GraphQL API Version

This project uses the Shopify GraphQL Admin API v9 with the modern `request` method. The GraphQL queries follow the [v9 migration guide](https://raw.githubusercontent.com/Shopify/shopify-app-js/refs/heads/main/packages/apps/shopify-api/docs/migrating-to-v9.md) best practices.

### Project Structure

```
├── index.ts               # Main application entry point (REST)
├── index-graphql.ts       # GraphQL version (recommended)
├── db.ts                  # SQLite database operations
├── shopify.ts             # Shopify REST API integration
├── shopify-graphql.ts     # Shopify GraphQL API integration (recommended)
├── rouzao.ts              # Rouzao API functions
├── types.ts               # TypeScript type definitions
├── diagnose.ts            # REST diagnostic tool
├── diagnose-graphql.ts    # GraphQL diagnostic tool (recommended)
├── queries.graphql.ts     # GraphQL queries for type generation
├── MIGRATION_GUIDE.md     # Guide for migrating from REST to GraphQL
└── fulfillments.db        # SQLite database (auto-created)
```

### REST vs GraphQL

**Important**: As of October 1, 2024, Shopify's REST Admin API is legacy. New implementations should use GraphQL.

This project includes both implementations:

- **REST** (`index.ts` + `shopify.ts`) - Legacy but functional
- **GraphQL** (`index-graphql.ts` + `shopify-graphql.ts`) - Recommended

To use the GraphQL version:

```bash
bun run index-graphql.ts
```

The GraphQL implementation uses Shopify's modern v9 API with the `request` method for better type safety and follows the [official migration guide](https://raw.githubusercontent.com/Shopify/shopify-app-js/refs/heads/main/packages/apps/shopify-api/docs/migrating-to-v9.md).

### Adding Features

- To modify the polling interval, change the cron expression in `index.ts`
- To process more orders, increase the `page_size` parameter
- To support additional carriers, update the mapping in `rouzao.ts`

This project was created using `bun init` in bun v1.2.20. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
