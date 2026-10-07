import { diffChanges, optionalText } from '../../../common/utils/record-changes.js';
import { buildLocationKey, locationLabel, locationLevel } from './location.util.js';
import { SLUG_PATTERN, slugify } from './slug.util.js';
import {
  ancestorsOf,
  buildTreeIndex,
  descendantIdsOf,
  isEffectivelyActive,
  nestTree,
  orderDepthFirst,
  wouldCreateCycle,
} from './tree.util.js';

const node = (id: string, parentId: string | null, sortOrder = 0, active = true) => ({
  id,
  parentId,
  name: id,
  active,
  sortOrder,
});

//   certification
//   └── management   (inactive)
//       └── iso
//   testing
//   └── water
const NODES = [
  node('iso', 'management', 1),
  node('testing', null, 2),
  node('certification', null, 1),
  node('management', 'certification', 1, false),
  node('water', 'testing', 1),
];

describe('tree utilities', () => {
  const index = buildTreeIndex(NODES);

  it('orders roots and children by sort order depth-first', () => {
    expect(orderDepthFirst(index).map(({ node: entry, depth }) => `${depth}:${entry.id}`)).toEqual([
      '0:certification',
      '1:management',
      '2:iso',
      '0:testing',
      '1:water',
    ]);
  });

  it('returns ancestors root-first and all descendants', () => {
    expect(ancestorsOf(index, 'iso').map((entry) => entry.id)).toEqual(['certification', 'management']);
    expect(descendantIdsOf(index, 'certification').sort()).toEqual(['iso', 'management']);
    expect(descendantIdsOf(index, 'water')).toEqual([]);
  });

  it('treats a node under an inactive ancestor as effectively inactive', () => {
    expect(isEffectivelyActive(index, 'certification')).toBe(true);
    expect(isEffectivelyActive(index, 'management')).toBe(false);
    expect(isEffectivelyActive(index, 'iso')).toBe(false);
    expect(isEffectivelyActive(index, 'water')).toBe(true);
    expect(isEffectivelyActive(index, 'missing')).toBe(false);
  });

  it('detects cycles when re-parenting', () => {
    expect(wouldCreateCycle(index, 'certification', 'certification')).toBe(true);
    expect(wouldCreateCycle(index, 'certification', 'iso')).toBe(true);
    expect(wouldCreateCycle(index, 'iso', 'testing')).toBe(false);
    expect(wouldCreateCycle(index, 'iso', null)).toBe(false);
  });

  it('keeps ancestors of matching nodes when nesting a filtered tree', () => {
    const tree = nestTree(index, (entry) => ({ id: entry.id }), (entry) => entry.id === 'iso');
    expect(tree).toEqual([{ id: 'certification', children: [{ id: 'management', children: [{ id: 'iso', children: [] }] }] }]);
  });

  it('does not loop forever on corrupted cyclic data', () => {
    const cyclic = buildTreeIndex([node('a', 'b'), node('b', 'a')]);
    expect(ancestorsOf(cyclic, 'a').map((entry) => entry.id)).toEqual(['b']);
    expect(isEffectivelyActive(cyclic, 'a')).toBe(true);
    expect(descendantIdsOf(cyclic, 'a')).toEqual(['b']);
  });
});

describe('slugify', () => {
  it('produces URL-safe slugs', () => {
    expect(slugify('ISO 9001 Certification')).toBe('iso-9001-certification');
    expect(slugify('  Food & Beverage ')).toBe('food-and-beverage');
    expect(slugify('Café Résumé')).toBe('cafe-resume');
    expect(slugify('***')).toBe('');
    expect(SLUG_PATTERN.test(slugify('Non-Destructive  Testing (NDT)'))).toBe(true);
  });
});

describe('location utilities', () => {
  it('builds case- and whitespace-insensitive keys', () => {
    expect(buildLocationKey({ countryCode: 'in', state: ' Haryana ', city: 'Gurugram' })).toBe('IN|haryana|gurugram|');
    expect(buildLocationKey({ countryCode: 'IN', state: 'HARYANA', city: 'gurugram' })).toBe(
      buildLocationKey({ countryCode: 'IN', state: 'Haryana', city: 'Gurugram' }),
    );
    expect(buildLocationKey({ countryCode: 'IN' })).toBe('IN|||');
  });

  it('labels locations by level', () => {
    expect(locationLevel({ countryCode: 'IN' })).toBe('COUNTRY');
    expect(locationLevel({ countryCode: 'IN', state: 'Delhi' })).toBe('STATE');
    expect(locationLevel({ countryCode: 'IN', state: 'Haryana', city: 'Gurugram' })).toBe('CITY');
    expect(locationLabel({ countryCode: 'IN', state: 'Haryana', city: 'Gurugram' })).toBe('Gurugram, Haryana, India');
    expect(locationLabel({ countryCode: 'IN' })).toBe('India');
  });
});

describe('record change helpers', () => {
  it('distinguishes "not provided" from "clear"', () => {
    expect(optionalText(undefined)).toBeUndefined();
    expect(optionalText('')).toBeNull();
    expect(optionalText(null)).toBeNull();
    expect(optionalText('text')).toBe('text');
  });

  it('only reports fields whose value changes', () => {
    const current = { name: 'A', active: true, endDate: new Date('2020-01-01'), description: 'x' as string | null };
    const { data, changes, changed } = diffChanges(current, {
      name: 'A',
      active: false,
      endDate: new Date('2020-01-01'),
      description: undefined,
    });
    expect(changed).toBe(true);
    expect(data).toEqual({ active: false });
    expect(changes).toEqual({ active: { from: true, to: false } });
    expect(diffChanges(current, { name: 'A' }).changed).toBe(false);
  });
});
