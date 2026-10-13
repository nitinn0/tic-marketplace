export const MAX_MATCHED_PROVIDERS = 5;

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE = /(?:\+?\d[\d\s().-]{7,}\d)/g;
const STOP_WORDS = new Set(["and", "the", "for", "with", "from", "near", "area"]);

export type MatchInput = {
  providerId: string;
  offersService: boolean;
  sameCategory: boolean;
  verified: boolean;
  locationMatch: boolean;
  yearsInBusiness: number | null;
};

export type RankedMatch = {
  providerId: string;
  score: number;
  reasons: string[];
};

/** Rank public providers for an RFQ. Unrelated providers score zero and are dropped. */
export function rankProviders(candidates: MatchInput[]): RankedMatch[] {
  const ranked: RankedMatch[] = [];
  for (const candidate of candidates) {
    if (!candidate.offersService && !candidate.sameCategory) continue;
    const reasons: string[] = [];
    let score = 0;
    if (candidate.offersService) {
      score += 100;
      reasons.push("Offers the requested service");
    } else {
      score += 40;
      reasons.push("Works in the same service category");
    }
    if (candidate.verified) {
      score += 25;
      reasons.push("Verified profile");
    }
    if (candidate.locationMatch) {
      score += 20;
      reasons.push("Covers the requested location");
    }
    if (candidate.yearsInBusiness && candidate.yearsInBusiness > 0) {
      score += Math.min(candidate.yearsInBusiness, 15);
      reasons.push(`${candidate.yearsInBusiness} years in business`);
    }
    ranked.push({ providerId: candidate.providerId, score, reasons });
  }
  return ranked.sort((a, b) => b.score - a.score).slice(0, MAX_MATCHED_PROVIDERS);
}

/** True when a location token from the RFQ appears in a provider coverage label. */
export function locationMatches(requested: string, labels: string[]) {
  const tokens = requested
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
  if (tokens.length === 0) return false;
  const haystacks = labels.map((label) => label.toLowerCase());
  return tokens.some((token) => haystacks.some((hay) => hay.includes(token)));
}

/** Strip emails and phone numbers a buyer may have typed into free text. */
export function scrubBuyerIdentity(text: string) {
  return text.replace(EMAIL, "[hidden]").replace(PHONE, "[hidden]");
}

export function asReasonList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}
