# Changelog

## 2.0.1 (2026-10-12)

### Fixed

- The bundle size badge in the README showed "rate limited by upstream service". It takes the minified and gzipped size from bundlejs.com instead of bundlephobia now.

## 2.0.0 (2026-10-10)

### Breaking changes

- **Dates, regular expressions and binary data are cloned.** `Date`, `RegExp`, `ArrayBuffer`, typed arrays and `DataView` were returned as is, so the clone and the original shared them: changing a date or the bytes of a typed array of the clone changed the original, a regular expression shared `lastIndex`. A `SharedArrayBuffer` stays shared.
- **Subclasses of `Map` and `Set` are cloned.** They were returned as is.
- **Prototypes are kept.** Class instances, objects without a prototype (`Object.create(null)`) and subclasses of `Array` were cloned into plain objects and arrays.
- **Renamed exports.** The types `MergeableObject`, `MergeableArray`, `MergeableMap`, `MergeableSet` and `Mergeable` are `CloneableObject`, `CloneableArray`, `CloneableMap`, `CloneableSet` and `Cloneable` now. `isMergeable` is replaced with `isCloneable`, which checks whether `deeplyClone` copies a value: it also accepts dates, regular expressions, binary data and subclasses of `Map` and `Set`.
- **Type declarations moved** from `dist/index.d.ts` to `dist/mjs/index.d.ts` and `dist/cjs/index.d.ts`. Imports of `deeply-clone` resolve them automatically.

### Fixed

- Sparse arrays lost their holes: `[1, , 3]` was cloned into `[1, 3]`.
- An own `__proto__` key (e.g. from `JSON.parse`) replaced the prototype of the clone and was lost. It's an own property of the clone now. `Object.prototype` was never changed.
- Nesting deeper than ~2000 levels threw "Maximum call stack size exceeded". Any nesting depth is supported now.
- Result types:
  - `deeplyClone(1)` is a `number`, not an object type with the methods of `Number`;
  - maps, sets, dates, typed arrays, functions and subclasses of arrays keep their types;
  - `null`, `undefined`, unions with primitives, `unknown` and instances of classes with private members are accepted.

  The types are tested with TypeScript 4.9–7.x.
- Type declarations for CommonJS: `require("deeply-clone")` used declarations in the ES module format, and the `types` condition was the last one in `exports`.
- README: the package has named exports, `require("deeply-clone").deeplyClone`.

### Changed

- The package is marked as side effect free (`"sideEffects": false`) for bundlers.
- Arrays of primitives are cloned about 9 times faster, other values at the same speed or faster.
- Releases are published from GitHub Actions with npm provenance.

## 1.0.9 and earlier

See [GitHub releases](https://github.com/ichernetskii/deeply-clone/releases).
