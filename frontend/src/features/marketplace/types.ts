export type MarketplaceService = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  categoryName: string;
  categorySlug: string;
  categoryType: string;
  categoryPath: string[];
  providerCount: number;
};

export type MarketplaceProvider = {
  id: string;
  name: string;
  headline: string | null;
  description?: string | null;
  providerType: string;
  verified: boolean;
  yearsInBusiness: number | null;
  services: { slug: string; name: string }[];
  locations: string[];
};

export type MarketplaceCategory = {
  id: string;
  slug: string;
  name: string;
  categoryType: string;
  tagline: string;
  serviceCount: number;
};

export type MarketplaceHome = {
  counts: { verifiedProviders: number; providers: number; services: number };
  categories: MarketplaceCategory[];
  popular: MarketplaceService[];
  providers: MarketplaceProvider[];
  industries: string[];
};

export type BuyerQuote = {
  id: string;
  providerId: string;
  providerName: string;
  amount: number;
  currency: string;
  scopeNotes: string;
  exclusions: string | null;
  timelineDays: number | null;
  createdAt: string;
};

export type BuyerRfq = {
  id: string;
  title: string;
  description: string;
  location: string;
  siteCount: number;
  employeeCount: number;
  timeline: string | null;
  status: string;
  createdAt: string;
  service: { id: string; name: string; slug: string };
  matches: { providerId: string; name: string; score: number; reasons: string[] }[];
  quotes: BuyerQuote[];
};

export type ProviderRfq = {
  id: string;
  title: string;
  description: string;
  location: string;
  siteCount: number;
  employeeCount: number;
  timeline: string | null;
  status: string;
  createdAt: string;
  service: { name: string; slug: string };
  matchReasons: string[];
  masked: string[];
  visible: string[];
  quote: {
    id: string;
    amount: number;
    currency: string;
    scopeNotes: string;
    exclusions: string | null;
    timelineDays: number | null;
    createdAt: string;
  } | null;
};

export const EMPTY_HOME: MarketplaceHome = {
  counts: { verifiedProviders: 0, providers: 0, services: 0 },
  categories: [],
  popular: [],
  providers: [],
  industries: [],
};

export function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString("en-IN")}`;
  }
}
