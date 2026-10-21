import { CatalogItem } from './types.js';

export const SERVER_CATALOG: Record<string, CatalogItem> = {
  ads_basic: {
    id: 'ads_basic',
    name: 'Ads Campaign - Basic',
    description: '10,000 targeted sponsored ad impressions in developer feeds',
    unitPrice: 10.0,
    currency: 'USD',
    category: 'ADVERTISING',
    active: true,
  },
  ads_pro: {
    id: 'ads_pro',
    name: 'Ads Campaign - Pro',
    description: '30,000 targeted sponsored ad impressions with analytics dashboard',
    unitPrice: 25.0,
    currency: 'USD',
    category: 'ADVERTISING',
    active: true,
  },
  cloud_starter: {
    id: 'cloud_starter',
    name: 'Cloud Sandbox Environment',
    description: '1 month dedicated developer sandbox instance',
    unitPrice: 15.0,
    currency: 'USD',
    category: 'INFRASTRUCTURE',
    active: true,
  },
  ai_credits_micro: {
    id: 'ai_credits_micro',
    name: 'AI Agent Token Pack (100k)',
    description: '100,000 inference tokens for autonomous test tasks',
    unitPrice: 5.0,
    currency: 'USD',
    category: 'AI_SERVICES',
    active: true,
  },
  enterprise_addon: {
    id: 'enterprise_addon',
    name: 'Enterprise High-Volume Tier',
    description: 'Custom high-volume billing tier (exceeds default policy cap for testing)',
    unitPrice: 250.0,
    currency: 'USD',
    category: 'ENTERPRISE',
    active: true,
  },
};

export function getCatalogItem(catalogId: string): CatalogItem | undefined {
  return SERVER_CATALOG[catalogId];
}

export function listCatalogItems(): CatalogItem[] {
  return Object.values(SERVER_CATALOG).filter((item) => item.active);
}
