import type { Provider } from '@/types'

import { hicustomProvider } from '@/lib/providers/hicustom'
import { rouzaoProvider } from '@/lib/providers/rouzao'

/**
 * Provider registry to manage all fulfillment providers
 */
class ProviderRegistry {
  private providers: Provider[] = []

  constructor() {
    /** Register default providers */
    this.register(rouzaoProvider)
    this.register(hicustomProvider)

    /**
     * Add more providers here
     * @example
     * this.register(provider3)
     */
  }

  /**
   * Register a provider in the registry
   * @param provider - The provider to register
   */
  register(provider: Provider): void {
    this.providers.push(provider)
    const status = provider.isConfigured() ? 'configured' : 'not configured'
    console.log(`[${new Date().toISOString()}] Registered provider: ${provider.name} (${status})`)
  }

  /**
   * Get all providers that have required configuration
   * @returns Array of configured providers
   */
  getEnabledProviders(): Provider[] {
    return this.providers.filter(provider => provider.isConfigured())
  }

  /**
   * Get a specific provider by ID
   * @param id - The provider ID to search for
   * @returns The provider if found, undefined otherwise
   */
  getProvider(id: string): Provider | undefined {
    return this.providers.find(provider => provider.id === id)
  }

  /**
   * Get all location IDs from all configured providers
   * @returns Array of unique location IDs
   */
  getAllLocationIds(): string[] {
    const locationIds: string[] = []
    for (const provider of this.getEnabledProviders()) {
      locationIds.push(...provider.locationIds)
    }
    return Array.from(new Set(locationIds)) // Remove duplicates
  }

  /**
   * Find provider by location from configured providers only
   * @param locationName - The location name to match
   * @param locationId - The location ID to match
   * @returns The provider managing this location, or undefined
   */
  findProviderByLocation(locationName: string, locationId: string): Provider | undefined {
    for (const provider of this.getEnabledProviders()) {
      if (provider.isProviderLocation(locationName, locationId)) {
        return provider
      }
    }
    return undefined
  }
}

/**
 * Singleton instance of the provider registry
 */
export const providerRegistry = new ProviderRegistry()
