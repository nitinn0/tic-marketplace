import { locationMatches, rankProviders, scrubBuyerIdentity } from './rfq-matching.js';

describe('rfq matching', () => {
  it('ranks an exact verified local provider above a same-category provider', () => {
    const ranked = rankProviders([
      {
        providerId: 'related',
        offersService: false,
        sameCategory: true,
        verified: false,
        locationMatch: false,
        yearsInBusiness: null,
      },
      {
        providerId: 'exact',
        offersService: true,
        sameCategory: true,
        verified: true,
        locationMatch: true,
        yearsInBusiness: 12,
      },
      {
        providerId: 'unrelated',
        offersService: false,
        sameCategory: false,
        verified: true,
        locationMatch: true,
        yearsInBusiness: 20,
      },
    ]);

    expect(ranked.map((row) => row.providerId)).toEqual(['exact', 'related']);
    expect(ranked[0]?.score).toBeGreaterThan(ranked[1]?.score ?? 0);
    expect(ranked[0]?.reasons).toContain('Offers the requested service');
  });

  it('matches a city token and ignores short stop words', () => {
    expect(locationMatches('plants in Mumbai', ['Mumbai, Maharashtra, India'])).toBe(true);
    expect(locationMatches('and the', ['India'])).toBe(false);
  });

  it('hides emails and phone numbers typed into an RFQ', () => {
    const scrubbed = scrubBuyerIdentity('Contact priya@acme.com or +91 99909 92492 about Acme.');
    expect(scrubbed).not.toContain('priya@acme.com');
    expect(scrubbed).not.toContain('99909');
    expect(scrubbed).toContain('[hidden]');
  });
});
