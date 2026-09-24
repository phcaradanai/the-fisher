import { describe, expect, it } from 'vitest';
import { CONTENT_CATALOGS } from './index';
import { validateContentCatalogs } from './validate';

describe('Chapter 1 content validation', () => {
  it('accepts the authored baseline catalogs', () => {
    expect(validateContentCatalogs()).toEqual([]);
  });

  it('reports an area link to a missing spot', () => {
    const catalogs = structuredClone(CONTENT_CATALOGS);
    catalogs.areas[0]!.spotIds.push('unknown-spot');

    expect(validateContentCatalogs(catalogs)).toContain('Area village-canal references missing spot "unknown-spot".');
  });

  it('reports duplicate fish IDs', () => {
    const catalogs = structuredClone(CONTENT_CATALOGS);
    catalogs.fish[1]!.id = catalogs.fish[0]!.id;

    expect(validateContentCatalogs(catalogs)).toContain('Duplicate fish id "river-minnow".');
  });
  it('reports fish artwork outside the asset directory', () => {
    const catalogs = structuredClone(CONTENT_CATALOGS);
    catalogs.fish[0]!.artwork = '/images/not-fish-art/missing.png';

    expect(validateContentCatalogs(catalogs)).toContain(
      'Fish river-minnow.artwork must reference a PNG under "/images/fish_art_a/".',
    );
  });

  it('reports duplicate fish artwork assignments', () => {
    const catalogs = structuredClone(CONTENT_CATALOGS);
    catalogs.fish[1]!.artwork = catalogs.fish[0]!.artwork;

    expect(validateContentCatalogs(catalogs)).toContain(
      `Fish reed-perch.artwork duplicates artwork "${catalogs.fish[0]!.artwork}".`,
    );
  });
});
