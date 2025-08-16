# LAPLACE Fulfiller

Multi-provider automated fulfillment service that syncs third-party warehouse order shipments to Shopify.

## Features

- **Multi-Provider Support**: Extensible architecture supporting multiple fulfillment providers
- **Automated Monitoring**: Checks provider orders every 5 minutes
- **Smart Fulfillment**: Only fulfills orders for specific provider warehouse locations
- **Duplicate Prevention**: SQLite database tracks fulfilled orders across all providers
- **Provider-Specific Logic**: Each provider can have custom order extraction and tracking logic
- **Built-in Providers**:
  - Rouzao (柔造) - Chinese fulfillment provider

## Prerequisites

- [Bun](https://bun.sh) runtime
- API credentials for your fulfillment provider(s)
- Shopify store with API access
- Shopify locations matching your provider warehouses

## Installation

```bash
bun install
```

## Configuration

Create a `.env` file in the project root with the following variables:

```env
# Shopify API Configuration (Required)
SHOPIFY_API_KEY=your_shopify_api_key_here
SHOPIFY_API_SECRET=your_shopify_api_secret_here
SHOPIFY_ACCESS_TOKEN=your_shopify_access_token_here
SHOPIFY_SHOP_DOMAIN=yourshop.myshopify.com
SHOPIFY_APP_URL=https://your-app-url.com

# Database Configuration (Optional - defaults to fulfillments.db)
DB_FILE_NAME=fulfillments.db

# Provider API Configurations
# Rouzao (automatically enabled when ROUZAO_TOKEN is set)
ROUZAO_TOKEN=your_rouzao_token_here

# Add more providers as needed
# PROVIDER2_API_KEY=your_api_key
# PROVIDER2_API_SECRET=your_secret
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

Each provider must have corresponding locations in Shopify. The provider will only fulfill orders from its registered locations.

**For Rouzao**: Create a location named "Rouzao" or "柔造"
**For other providers**: Check the provider's `locationIds` or location name patterns

## Running

### Development

```bash
# Run with cron (continuous mode)
bun run start

# Run once and exit
bun run once

# Or with the flag directly
bun run src/index.ts --once
```

### Production

```bash
# Continuous mode with cron
bun run src/index.ts

# One-time run (useful for testing or manual triggers)
bun run src/index.ts --once
```

For production deployment, consider using a process manager like PM2:

```bash
pm2 start --interpreter ~/.bun/bin/bun src/index.ts --name laplace-fulfiller
```

## How It Works

1. **Provider Registration**: On startup, all enabled providers are registered and initialized
2. **Order Monitoring**: Every 5 minutes, the service fetches orders from all enabled providers
3. **Shipped Order Detection**: Each provider filters its orders based on shipped status
4. **Order Details**: For each shipped order, fetches detailed information including tracking
5. **Shopify Order Lookup**: Each provider extracts the Shopify order number using its own logic
6. **Smart Fulfillment**: Only fulfills items assigned to the provider's specific warehouse locations
7. **Duplicate Prevention**: Records fulfilled orders in SQLite database with provider context

## Database

The service uses SQLite with Drizzle ORM (`fulfillments.db`) to track fulfilled orders across all providers:

**Schema**:

- `provider` - Provider identifier (e.g., 'rouzao')
- `provider_order_id` - Provider's order ID
- `shopify_order_number` - Shopify order number
- `shopify_order_id` - Shopify order ID
- `fulfilled_at` - Fulfillment timestamp
- `created_at` - Record creation timestamp

**Features**:

- Unique constraint on `(provider, provider_order_id)` prevents duplicates
- Indexed by provider and Shopify order number for fast lookups
- Old records (>30 days) are automatically cleaned up daily at midnight
- Type-safe queries with Drizzle ORM

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
bun run src/scripts/diagnose.ts
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
├── src/
│   ├── index.ts              # Main application entry point
│   ├── db.ts                 # SQLite database operations (Drizzle ORM)
│   ├── db/
│   │   └── schema.ts         # Database schema definition
│   ├── shopify.ts            # Shopify GraphQL API integration
│   ├── queries.graphql.ts    # GraphQL queries for type generation
│   ├── providers/
│   │   ├── types.ts          # Provider interface definitions
│   │   ├── registry.ts       # Provider registration and management
│   │   ├── rouzao.ts         # Rouzao provider implementation
│   │   └── example.ts        # Example provider template
│   ├── scripts/
│   │   └── diagnose.ts       # GraphQL diagnostic tool
│   └── types.ts              # TypeScript type definitions
├── types/                    # Generated GraphQL types
├── drizzle/                  # Database migrations
├── .graphqlrc.ts             # GraphQL code generation config
├── drizzle.config.ts         # Drizzle ORM configuration
└── fulfillments.db           # SQLite database (auto-created)
```

### Multi-Provider Architecture

The application uses a provider-based architecture that makes it easy to add support for new fulfillment providers.

#### Provider Interface

Each provider must implement the `Provider` interface:

```typescript
interface Provider {
  id: string // Unique provider identifier
  name: string // Human-readable name
  locationIds: string[] // Shopify location IDs managed by this provider

  // Check if a location belongs to this provider
  isProviderLocation(locationName: string, locationId: string): boolean

  // Fetch shipped orders from the provider
  fetchShippedOrders(): Promise<ProviderOrder[]>

  // Fetch detailed order information
  fetchOrderDetail(orderId: string): Promise<ProviderOrderDetail | null>

  // Extract Shopify order number from provider's data
  extractShopifyOrderNumber(orderDetail: ProviderOrderDetail): string | null

  // Get tracking information
  getTrackingInfo(orderDetail: ProviderOrderDetail): TrackingInfo
}
```

#### Adding a New Provider

1. **Copy the example template**:

   ```bash
   cp src/providers/example.ts src/providers/myprovider.ts
   ```

2. **Implement your provider logic**:
   - Update API endpoints and authentication
   - Map your provider's data structure
   - Configure carrier mappings and tracking URLs
   - Add your Shopify location IDs

3. **Register the provider** in `src/providers/registry.ts`:

   ```typescript
   import { myProvider } from './myprovider'

   // In the constructor
   this.register(myProvider, true)
   ```

4. **Add environment variables** to `.env`:

   ```env
   MYPROVIDER_API_KEY=your-api-key
   MYPROVIDER_API_SECRET=your-secret
   ```

5. **Run the application** - your provider will be automatically included!

#### Provider Features

- **Automatic order tracking**: Each provider's orders are tracked separately
- **Custom business logic**: Providers can implement their own order number extraction patterns
- **Carrier mapping**: Map provider-specific carrier codes to Shopify carriers
- **Tracking URLs**: Generate tracking URLs based on carrier and tracking number
- **Error isolation**: Errors in one provider don't affect others

#### Provider Configuration

Providers are automatically enabled or disabled based on their configuration:

**Automatic Detection**:

- If required environment variables are set → Provider is enabled
- If required environment variables are missing → Provider is disabled

For example:

```env
# Rouzao will be enabled (has required token)
ROUZAO_TOKEN=abc123

# Example provider will be disabled (missing required key)
# EXAMPLE_API_KEY=
```

**How it Works**:
Each provider implements an `isConfigured()` method that checks for required environment variables:

```typescript
class MyProvider implements Provider {
  isConfigured(): boolean {
    return !!process.env['MYPROVIDER_API_KEY']
  }
}
```

**Benefits**:

- No manual enable/disable flags needed
- Prevents runtime errors from missing credentials
- Easy to temporarily disable a provider (just comment out its env vars)
- Clear logs show which providers are configured

Unconfigured providers:

- Won't fetch orders
- Won't process shipments
- Won't consume API quotas
- Show as "not configured" in startup logs

### Adding Features

- To modify the polling interval, change the cron expression in `index.ts`
- To process more orders, increase the `page_size` parameter
- To support additional carriers, update the mapping in `rouzao.ts`

This project was created using `bun init` in bun v1.2.20. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
