const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const Version = require('../version');

describe('Version.parse', () => {
  it('splits major.minor.patch and keeps the raw string', () => {
    const v = Version.parse('1.2.3');
    assert.equal(v.major, '1');
    assert.equal(v.minor, '2');
    assert.equal(v.patch, '3');
    assert.equal(v.build, null);
    assert.equal(v.raw, '1.2.3');
  });

  it('reads a fourth part as build', () => {
    const v = Version.parse('1.2.3.4');
    assert.equal(v.patch, '3');
    assert.equal(v.build, '4');
  });

  it('defaults missing minor/patch to "0"', () => {
    const v = Version.parse('5');
    assert.equal(v.major, '5');
    assert.equal(v.minor, '0');
    assert.equal(v.patch, '0');
  });

  it('sanitizes non-version characters by default (mod_info.json mode)', () => {
    const v = Version.parse('v1.2.3');
    assert.equal(v.major, '1');
    assert.equal(v.minor, '2');
    assert.equal(v.patch, '3');
    // raw preserves what the author wrote
    assert.equal(v.raw, 'v1.2.3');
  });

  it('keeps letters when sanitizeInput is false (.version mode)', () => {
    const v = Version.parse('1.2.3b', { sanitizeInput: false });
    assert.equal(v.patch, '3b');
  });

  it('takes only the version before the first hyphen for the parts', () => {
    const v = Version.parse('1.2.3-RC2', { sanitizeInput: false });
    assert.equal(v.major, '1');
    assert.equal(v.minor, '2');
    assert.equal(v.patch, '3');
    assert.equal(v.raw, '1.2.3-RC2');
  });
});

describe('Version.toString / toStringFromParts', () => {
  it('toString prefers the raw string', () => {
    assert.equal(Version.parse('v1.2.0').toString(), 'v1.2.0');
  });
  it('toStringFromParts ignores raw and joins parts, keeping trailing zeros', () => {
    assert.equal(Version.parse('v1.2.0').toStringFromParts(), '1.2.0');
  });
  it('omits a null build part', () => {
    assert.equal(new Version({ major: '1', minor: '2', patch: '3' }).toStringFromParts(), '1.2.3');
  });
  it('includes a build part when present', () => {
    assert.equal(new Version({ major: '1', minor: '2', patch: '3', build: '4' }).toStringFromParts(), '1.2.3.4');
  });
});

describe('Version.zero', () => {
  it('is 0.0.0', () => {
    assert.equal(Version.zero().toStringFromParts(), '0.0.0');
  });
});

describe('compareVersions / compareTo', () => {
  const cmp = Version.compareVersions;

  it('treats identical strings as equal', () => {
    assert.equal(cmp('1.2.3', '1.2.3'), 0);
  });

  it('orders numerically, not lexically', () => {
    assert.equal(cmp('1.10', '1.9'), 1);
    assert.equal(cmp('1.9', '1.10'), -1);
    assert.equal(cmp('0.10.0', '0.9.1'), 1);
  });

  it('orders patch releases', () => {
    assert.equal(cmp('1.2.3', '1.2.4'), -1);
    assert.equal(cmp('2.0.0', '1.9.9'), 1);
  });

  it('ranks a known pre-release suffix below the release', () => {
    assert.equal(cmp('1.0.0-rc1', '1.0.0'), -1);
    assert.equal(cmp('1.0.0', '1.0.0-rc1'), 1);
  });

  it('orders pre-release suffixes among themselves (alpha < beta < rc)', () => {
    assert.equal(cmp('1.0.0-alpha', '1.0.0-beta'), -1);
    assert.equal(cmp('1.0.0-rc', '1.0.0-beta'), 1);
  });

  it('normalizes separators (hyphen/underscore) for the numeric comparison', () => {
    // The separator doesn't change which side is newer; the trailing number does.
    assert.equal(cmp('1.2-3', '1.2.4'), -1);
    assert.equal(cmp('1.2_5', '1.2.4'), 1);
  });

  it('drives compareTo and the comparison methods', () => {
    const a = Version.parse('1.2.0');
    const b = Version.parse('1.2.1');
    assert.equal(a.compareTo(b), -1);
    assert.ok(b.isGreaterThan(a));
    assert.ok(a.isLessThan(b));
    assert.ok(a.isLessOrEqual(Version.parse('1.2.0')));
    assert.ok(a.isGreaterOrEqual(Version.parse('1.2.0')));
  });

  it('compareTo treats null as smaller', () => {
    assert.equal(Version.parse('1.0.0').compareTo(null), -1);
  });
});

describe('equals / equalsSymbolic', () => {
  it('equals compares by ordering (raw-aware)', () => {
    assert.ok(Version.parse('1.2.3').equals(Version.parse('1.2.3')));
    assert.ok(!Version.parse('1.2.3').equals(Version.parse('1.2.4')));
  });

  it('equalsSymbolic ignores raw and compares parts', () => {
    const a = new Version({ raw: 'whatever', major: '1', minor: '2', patch: '3' });
    const b = new Version({ raw: 'different', major: '1', minor: '2', patch: '3' });
    assert.ok(a.equalsSymbolic(b));
    assert.ok(!a.equalsSymbolic(new Version({ major: '1', minor: '2', patch: '4' })));
  });
});
