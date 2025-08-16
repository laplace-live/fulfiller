# LAPLACE Fulfiller

Multi-provider automated fulfillment service that syncs third-party warehouse order shipments to Shopify using GraphQL Admin API.

## Features

- **Multi-Provider Support**: Extensible architecture supporting multiple fulfillment providers
- **Automated Monitoring**: Checks provider orders every 5 minutes
- **Smart Fulfillment**: Only fulfills orders for specific provider warehouse locations
- **Duplicate Prevention**: SQLite database tracks fulfilled orders across all providers
- **Provider-Specific Logic**: Each provider can have custom order extraction and tracking logic
- **Type-Safe GraphQL**: Uses Shopify's GraphQL Admin API (2025-07) with automatic type generation
- **Modern Architecture**: Clean code organization with path aliasing (`@/`) and JSDoc documentation
- **Built-in Providers**:
  - Rouzao (柔造) - Chinese fulfillment provider
  - HiCustom (指纹科技) - Chinese POD fulfillment provider

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
ROUZAO_LOCATION_IDS=location_id_1,location_id_2  # Optional: Comma-separated Shopify location IDs
# If not set, defaults to Rouzao's warehouse location IDs

# HiCustom (automatically enabled when API_KEY and API_SECRET are set)
HICUSTOM_API_KEY=your_hicustom_api_key
HICUSTOM_API_SECRET=your_hicustom_api_secret
HICUSTOM_LOCATION_IDS=location_id_1,location_id_2  # Optional: Comma-separated Shopify location IDs
# HICUSTOM_API_URL=https://api.hicustom.com  # Optional: Override API base URL

# Add more providers as needed
# PROVIDER3_API_KEY=your_api_key
# PROVIDER3_API_SECRET=your_secret
```

### Getting Rouzao Token

1. Log in to Rouzao (https://www.rouzao.com)
2. Open browser developer tools (F12)
3. Go to Network tab
4. Perform any action that calls the API
5. Look for the `Rouzao-Token` header in the request

### Getting HiCustom Credentials

1. Log in to HiCustom (https://www.hicustom.com)
2. Navigate to API settings or developer section
3. Create a new application or API client
4. Copy the API Key and API Secret
5. Note your Shopify location IDs that HiCustom will fulfill from

The HiCustom integration uses their OAuth API with automatic token refresh. See their API documentation:

- [获取access_token](http://xiaoyaoji.cn/project/1jPL8Hr5Xf7/1jUEaURCXKK)
- [刷新access_token](http://xiaoyaoji.cn/project/1jPL8Hr5Xf7/1kErqGf2swS)

### Setting up Shopify API Access

1. Create a private app in your Shopify admin
2. Grant the following permissions:
   - Read orders (`read_orders`)
   - Write orders (`write_orders`)
   - Read locations (`read_locations`) - optional, but recommended
   - Read merchant-managed fulfillment orders (`read_merchant_managed_fulfillment_orders`)
   - Write merchant-managed fulfillment orders (`write_merchant_managed_fulfillment_orders`)
3. Copy the API credentials

**Important**: The fulfillment order permissions are required for the app to work properly. Without these permissions, you'll receive 403 Forbidden errors when attempting to process orders.

### Shopify Location Setup

Each provider must have corresponding locations in Shopify. The provider will only fulfill orders from its registered locations.

**For Rouzao**:

- Set specific location IDs in `ROUZAO_LOCATION_IDS` environment variable
- Or use the default warehouse locations (automatically configured)
- Or create locations with names containing "Rouzao" or "柔造"

**For HiCustom**:

- Set specific location IDs in `HICUSTOM_LOCATION_IDS` environment variable
- Or create locations with names containing "HiCustom"

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
bun run diagnose
```

This will test:

- Environment variable configuration
- Shopify API authentication
- Access scopes granted to your app
- Locations API access (lists all warehouse locations)
- Orders and Fulfillment Orders API access
- Rouzao location availability

## Development

### Tech Stack

- **Runtime**: Bun (fast all-in-one JavaScript runtime)
- **Language**: TypeScript with strict mode
- **Database**: SQLite with Drizzle ORM
- **API**: Shopify GraphQL Admin API (2025-07)
- **Type Generation**: GraphQL Code Generator with Shopify preset
- **Scheduling**: Croner for cron jobs
- **Code Quality**: Prettier with import sorting

### GraphQL Type Generation

The project automatically generates TypeScript types from GraphQL queries:

```bash
# Generate types once
bun run graphql-codegen

# Watch mode for development (not configured)
# bun run graphql-codegen:watch
```

Generated types are stored in `src/types/admin.generated.d.ts` and should not be edited manually.

### Database Management

Using Drizzle ORM for type-safe database operations:

```bash
# Generate migrations
bun run db:generate

# Apply migrations
bun run db:migrate

# Push schema changes directly (development)
bun run db:push

# Open Drizzle Studio (visual database browser)
bun run db:studio
```

### Code Style

The project uses Prettier with automatic import sorting. All code is formatted consistently with JSDoc block comments for better IDE support.

### TypeScript Configuration

The project uses a strict TypeScript configuration with:

- Path aliasing: `@/` maps to `./src/` for clean imports
- Strict mode enabled for better type safety
- Bundler module resolution for modern tooling
- No unused locals/parameters warnings (for flexibility during development)

### Project Structure

```
├── src/
│   ├── index.ts                    # Main application entry point
│   ├── lib/
│   │   ├── carriers.ts            # Centralized carrier configuration
│   │   ├── db/
│   │   │   ├── client.ts          # Database client and operations
│   │   │   └── schema.ts          # Drizzle ORM schema definition
│   │   ├── providers/
│   │   │   ├── registry.ts        # Provider registration and management
│   │   │   ├── rouzao.ts          # Rouzao provider implementation
│   │   │   ├── hicustom.ts        # HiCustom provider implementation
│   │   │   └── example.ts         # Example provider template
│   │   ├── queries.graphql.ts     # GraphQL queries and mutations
│   │   └── shopify.ts             # Shopify GraphQL API integration
│   ├── scripts/
│   │   └── diagnose.ts            # Diagnostic tool
│   ├── types/
│   │   ├── index.ts               # Provider interfaces and types
│   │   ├── rouzao.ts              # Rouzao-specific types
│   │   ├── hicustom.ts            # HiCustom-specific types
│   │   └── admin.generated.d.ts   # Auto-generated GraphQL types
│   └── utils/                     # Utility functions
├── drizzle/                        # Database migrations
├── references/                     # Reference implementations (gitignored)
├── package.json
├── tsconfig.json                   # TypeScript config with path aliases
├── drizzle.config.ts              # Drizzle ORM configuration
├── .graphqlrc.ts                  # GraphQL code generation config
├── .prettierrc.mjs                # Code formatting config
└── fulfillments.db                # SQLite database (auto-created)
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

  // Check if provider has required configuration
  isConfigured(): boolean

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
   cp src/lib/providers/example.ts src/lib/providers/myprovider.ts
   ```

2. **Implement your provider logic**:
   - Update API endpoints and authentication
   - Map your provider's data structure
   - Configure carrier mappings and tracking URLs
   - Add your Shopify location IDs

3. **Register the provider** in `src/lib/providers/registry.ts`:

   ```typescript
   import { myProvider } from './myprovider'

   // In the constructor
   this.register(myProvider)
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
- **Centralized carrier system**: All providers share a unified carrier configuration
- **Flexible carrier aliases**: Different providers can use different codes for the same carrier
- **Automatic tracking URLs**: Generate tracking URLs based on carrier and tracking number
- **Error isolation**: Errors in one provider don't affect others

#### Centralized Carrier Configuration

The application uses a centralized carrier system (`src/lib/carriers.ts`) that:

1. **Defines carriers once**: Each carrier has a name and tracking URL template
2. **Supports multiple aliases**: Different providers can use different codes/names for the same carrier
3. **Provides unified lookup**: All providers use the same functions to get carrier info

Example:

```typescript
// Rouzao uses 'sf' for SF Express
// HiCustom uses '顺丰速运' for SF Express
// Both resolve to the same carrier with tracking URL

const trackingDetails = getTrackingDetails('sf', '123456')
// or
const trackingDetails = getTrackingDetails('顺丰速运', '123456')

// Both return:
// {
//   carrierName: 'SF Express',
//   trackingUrl: 'https://www.sf-express.com/.../123456'
// }
```

To add support for a new carrier or alias:

1. Edit `src/lib/carriers.ts`
2. Find the carrier in the `CARRIERS` array
3. Add your provider's code/name to the `aliases` array

#### Provider Configuration

Providers are automatically enabled or disabled based on their configuration:

**Automatic Detection**:

- If required environment variables are set → Provider is enabled
- If required environment variables are missing → Provider is disabled

For example:

```env
# Rouzao will be enabled (has required token)
ROUZAO_TOKEN=abc123
ROUZAO_LOCATION_IDS=gid://shopify/Location/123,gid://shopify/Location/456  # Optional

# HiCustom will be enabled (has required credentials)
HICUSTOM_API_KEY=client123
HICUSTOM_API_SECRET=secret456
HICUSTOM_LOCATION_IDS=gid://shopify/Location/789,gid://shopify/Location/101  # Optional

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

- To modify the polling interval, change the cron expression in `src/index.ts`
- To add new GraphQL queries, edit `src/lib/queries.graphql.ts` and run `bun run graphql-codegen`
- To support additional carriers, update the mapping in your provider implementation
- All imports use the `@/` path alias (e.g., `import { Provider } from '@/types'`)

This project was created using `bun init` in bun v1.2.20. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
