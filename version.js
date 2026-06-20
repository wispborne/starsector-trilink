/*
 * Version — a JavaScript port of TriOS's canonical Dart `Version`
 * parser/comparator (lib/utils/version.dart). Kept faithful in behavior so a
 * version string produced here parses and orders identically to how TriOS reads
 * it: same sanitize rules, same separator/letter/suffix handling, same ordering.
 *
 * Pure and dependency-free; usable in the browser (window.Version) and in Node
 * for unit tests (module.exports), following the same UMD pattern as deeplink.js.
 *
 * JavaScript has no operator overloading, so Dart's `>`/`<`/`>=`/`<=`/`==`
 * become the methods isGreaterThan/isLessThan/isGreaterOrEqual/isLessOrEqual/
 * equals.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Version = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // --- small helpers mirroring the Dart extensions used by the original -------

  // List.getOrNull(i): the element at i, or null when out of range.
  function getOrNull(list, i) {
    return i >= 0 && i < list.length ? list[i] : null;
  }

  // Mirrors Dart's int.tryParse for the digit-only tokens this code produces:
  // returns an integer for a pure (optionally signed) integer string, else null.
  // Notably '1.2' and '' yield null, exactly as int.tryParse does.
  function tryParseInt(s) {
    return /^[+-]?\d+$/.test(s) ? parseInt(s, 10) : null;
  }

  // Iterable<String?>.nonNulls.join('.') — drop null/undefined parts, join on '.'.
  function joinNonNull(parts) {
    return parts.filter(function (p) { return p != null; }).join('.');
  }

  // code-unit lexical comparison, matching Dart String.compareTo for these tokens.
  function lexCompare(a, b) {
    return a < b ? -1 : (a > b ? 1 : 0);
  }

  // --- precompiled regex + suffix tables (mirror the Dart statics) ------------

  var GROUPING_REGEX = /(\d+|[a-zA-Z]+|[-.]+)/g;
  var SEP_REGEX = /[\s\-–_]+/g; // whitespace, hyphen, en-dash, underscore
  var IS_LETTER_REGEX = /[a-zA-Z]/;
  var SUFFIX_ORDER = ['dev', 'prerelease', 'preview', 'pre', 'alpha', 'beta', 'rc'];
  var SUFFIX_RANK = {};
  for (var si = 0; si < SUFFIX_ORDER.length; si++) SUFFIX_RANK[SUFFIX_ORDER[si]] = si;

  // --- small, bounded LRU caches (very conservative sizes) --------------------

  var MAX_CACHE_ENTRIES = 512;
  var normalizedCache = new Map();
  var tokensCache = new Map();

  function normalizeSeparatorsCached(s) {
    var cached = normalizedCache.get(s);
    if (cached !== undefined) return cached;
    var normalized = s.replace(SEP_REGEX, '.');
    if (normalizedCache.size >= MAX_CACHE_ENTRIES) {
      normalizedCache.delete(normalizedCache.keys().next().value);
    }
    normalizedCache.set(s, normalized);
    return normalized;
  }

  function tokenizeCached(s) {
    var cached = tokensCache.get(s);
    if (cached !== undefined) return cached;
    var tokens = s.match(GROUPING_REGEX) || [];
    if (tokensCache.size >= MAX_CACHE_ENTRIES) {
      tokensCache.delete(tokensCache.keys().next().value);
    }
    tokensCache.set(s, tokens);
    return tokens;
  }

  // Pad two tokenized version strings into aligned part lists so they can be
  // compared element-by-element. Mirrors _normalizeAndSplitStringsToCompare.
  function normalizeAndSplit(a, b) {
    var aParts = tokenizeCached(a);
    var bParts = tokenizeCached(b);

    var aResult = [];
    var bResult = [];

    var len = Math.max(aParts.length, bParts.length);
    for (var i = 0; i < len; i++) {
      var aPart = getOrNull(aParts, i) || '';
      var bPart = getOrNull(bParts, i) || '';

      var aIsNumber = tryParseInt(aPart) != null;
      var bIsNumber = tryParseInt(bPart) != null;
      var aIsLetter = IS_LETTER_REGEX.test(aPart);
      var bIsLetter = IS_LETTER_REGEX.test(bPart);

      // If one side is [0] and the other is [g], return [0] and [0,g]. Handles
      // e.g. [1.9.0] vs [1.9.g], where [0] should rank below [g].
      if (aIsLetter && bIsNumber) {
        aResult.push('0');
      } else if (bIsLetter && aIsNumber) {
        bResult.push('0');
      }
      // If one side is a number and the other is blank, zero-fill the blank side.
      else if (aPart === '' && bIsNumber) {
        aPart = '0';
      } else if (bPart === '' && aIsNumber) {
        bPart = '0';
      }
      // If one side is a period and the other is blank, period-fill it.
      else if (aPart === '' && bPart === '.') {
        aPart = '.';
      } else if (bPart === '' && aPart === '.') {
        bPart = '.';
      } else if (aPart === '' && bIsLetter) {
        // noop: a letter vs an empty string — skip the remaining else cases
      } else if (bPart === '' && aIsLetter) {
        // noop: a letter vs an empty string — skip the remaining else cases
      }
      // Anything not a period, number, or letter is a separator (hyphen, emdash…).
      else if (aPart === '' && bPart !== '') {
        aPart = bPart;
      } else if (bPart === '' && aPart !== '') {
        bPart = aPart;
      }

      aResult.push(aPart);
      bResult.push(bPart);
    }

    return [aResult, bResult];
  }

  // The comparison core. Pure and instance-independent (the Dart original is an
  // instance method but uses no instance state), so it's exposed as a static.
  function compareVersions(a, b) {
    if (a === b) return 0;

    var aOriginal = a;
    var bOriginal = b;
    var aPartsOriginal = tokenizeCached(a);
    var bPartsOriginal = tokenizeCached(b);

    a = normalizeSeparatorsCached(a);
    b = normalizeSeparatorsCached(b);

    var split = normalizeAndSplit(a, b);
    var aParts = split[0];
    var bParts = split[1];

    var len = Math.max(aParts.length, bParts.length);
    for (var i = 0; i < len; i++) {
      var aPart = getOrNull(aParts, i) || '';
      var bPart = getOrNull(bParts, i) || '';

      var aNum = tryParseInt(aPart);
      var bNum = tryParseInt(bPart);
      var aIsNumber = aNum != null;
      var bIsNumber = bNum != null;

      if (aIsNumber && bIsNumber) {
        if (aNum !== bNum) return aNum > bNum ? 1 : -1;
      } else if (aIsNumber && !bIsNumber) {
        return 1; // a number ranks before a letter/suffix
      } else if (!aIsNumber && bIsNumber) {
        return -1;
      } else {
        var aLow = aPart.toLowerCase();
        var bLow = bPart.toLowerCase();
        var ai = SUFFIX_RANK[aLow];
        var bi = SUFFIX_RANK[bLow];
        if (ai != null && bi != null) {
          if (ai !== bi) return ai > bi ? 1 : -1;
        } else if (ai != null) {
          return -1; // a known pre-release suffix ranks below anything unknown
        } else if (bi != null) {
          return 1;
        }

        if (aPart !== bPart) {
          var cmp = lexCompare(aPart, bPart);
          return cmp > 0 ? 1 : -1;
        }
      }
    }

    // Equal through the shared length: a longer token list wins, then fall back
    // to a raw lexical compare so the ordering stays total and stable.
    var lenCmp = aPartsOriginal.length - bPartsOriginal.length;
    if (lenCmp !== 0) return lenCmp > 0 ? 1 : -1;

    var rawCmp = lexCompare(aOriginal, bOriginal);
    if (rawCmp !== 0) return rawCmp > 0 ? 1 : -1;

    return 0;
  }

  // --- the Version value type -------------------------------------------------

  // Construct from explicit parts: new Version({ raw?, major, minor, patch, build? }).
  // Prefer Version.parse() for a version *string*.
  function Version(opts) {
    opts = opts || {};
    this.raw = opts.raw != null ? String(opts.raw) : null;
    this.major = opts.major != null ? String(opts.major) : '0';
    this.minor = opts.minor != null ? String(opts.minor) : '0';
    this.patch = opts.patch != null ? String(opts.patch) : '0';
    this.build = opts.build != null ? String(opts.build) : null;
  }

  // Prefers the original `raw` string when present, else joins the parts.
  Version.prototype.toString = function () {
    return this.raw != null ? this.raw : joinNonNull([this.major, this.minor, this.patch, this.build]);
  };

  // Ignores `raw` even if it exists.
  Version.prototype.toStringFromParts = function () {
    return joinNonNull([this.major, this.minor, this.patch, this.build]);
  };

  Version.prototype.compareTo = function (other) {
    if (other == null) return -1;
    var a = this.raw != null ? this.raw : this.toString();
    var b = other.raw != null ? other.raw : other.toString();
    return compareVersions(a, b);
  };

  Version.prototype.isGreaterThan = function (other) { return this.compareTo(other) > 0; };
  Version.prototype.isLessThan = function (other) { return this.compareTo(other) < 0; };
  Version.prototype.isGreaterOrEqual = function (other) { return this.compareTo(other) >= 0; };
  Version.prototype.isLessOrEqual = function (other) { return this.compareTo(other) <= 0; };

  // Dart's `==`: another Version that compares equal.
  Version.prototype.equals = function (other) {
    return other instanceof Version && this.compareTo(other) === 0;
  };

  // Compares two versions without the `raw` string. Use for game versions.
  Version.prototype.equalsSymbolic = function (other) {
    return this.major === other.major &&
      this.minor === other.minor &&
      this.patch === other.patch &&
      this.build === other.build;
  };

  // - `sanitizeInput` should be true for `mod_info.json`, false for `.version`:
  //   whether to strip everything but digits and version symbols first.
  Version.parse = function (versionString, options) {
    var sanitizeInput = !options || options.sanitizeInput !== false; // default true

    var sanitizedString = sanitizeInput
      ? versionString.replace(/[^0-9.\-]/g, '')
      : versionString;

    // Split into version and release candidate (keep at most the first two).
    var parts = sanitizedString.split('-').slice(0, 2);

    // Split the version number by '.'.
    var versionParts = parts[0].split('.');

    return new Version({
      raw: versionString,
      major: versionParts.length > 0 ? versionParts[0] : '0',
      minor: versionParts.length > 1 ? versionParts[1] : '0',
      patch: versionParts.length > 2 ? versionParts[2] : '0',
      build: versionParts.length > 3 ? versionParts[3] : null,
    });
  };

  Version.zero = function () { return Version.parse('0.0.0', { sanitizeInput: true }); };

  // Exposed for callers that only need to order two raw strings.
  Version.compareVersions = compareVersions;

  return Version;
});
