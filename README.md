# [Deeply-Clone](https://www.npmjs.com/package/deeply-clone)

<a href="https://www.npmjs.com/package/deeply-clone">![GitHub package.json version](https://img.shields.io/github/package-json/v/ichernetskii/deeply-clone?logo=npm)</a>
<a href="https://bundlejs.com/?q=deeply-clone">![Minzipped size](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fdeno.bundlejs.com%2F%3Fq%3Ddeeply-clone&query=%24.size.compressedSize&label=minzipped%20size)</a>
![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/ichernetskii/deeply-clone/ci.yml)
<a href="https://ichernetskii.testspace.com/spaces/224049">![Testspace pass ratio](https://img.shields.io/testspace/pass-ratio/ichernetskii/ichernetskii:deeply-clone/224049?label=passed%20tests)</a>
![Coverage Status](https://img.shields.io/coverallsCoverage/github/ichernetskii/deeply-clone)
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/ichernetskii/deeply-clone/blob/master/LICENSE)

Deep fast clone JavaScript objects with circular references handling and TypeScript support

## Installation

```sh
npm install deeply-clone
```
```sh
yarn add deeply-clone
```
```sh
pnpm add deeply-clone
```

## Usage

The package supports both ES modules and CommonJS:

```js
import { deeplyClone } from "deeply-clone";
```

```js
const { deeplyClone } = require("deeply-clone");
```

## Features

* Clones objects deeply
* Supports objects, arrays, maps, sets, dates, regular expressions and binary data
* Objects can have any circular references and any nesting depth
* Keeps the prototypes of class instances and subclasses
* Fast algorithm with caching
* Strongly typed result with TypeScript
* No dependencies
* Small size
* Works in browser and Node.js, ES modules and CommonJS

## How values are cloned

* **Objects** are cloned with their own properties, including symbol and non-enumerable keys. The clone has the same prototype: class instances stay instances of their classes, objects created with `Object.create(null)` have no prototype.
  * Getters are called, and their values are copied as regular properties. All copied properties are enumerable and writable, and the clone of a frozen object isn't frozen.
  * An own `__proto__` key (e.g. from `JSON.parse`) is copied as a regular property, it never changes prototypes.
  * Private class fields (`#field`) can't be copied: methods that use them don't work on the clone.
* **Arrays** are cloned element by element, holes of sparse arrays stay holes.
* **Maps** are cloned with their values. The keys are the same objects as in the original map.
* **Sets** are cloned with their values.
* **Dates and regular expressions** are cloned, a regular expression keeps its `lastIndex`.
* **`ArrayBuffer`, typed arrays and `DataView`** are cloned with their data. Clones of views of the same buffer share the cloned buffer. A `SharedArrayBuffer` isn't copied: its memory stays shared.
* **Subclasses** of the classes above keep their prototypes. Their constructors and overridden methods aren't called.
* **Own properties** of arrays, maps, sets, dates, regular expressions and binary data aren't copied (e.g. `index` of a regular expression match or fields of subclasses).
* **Other values are returned as is**, without copying: primitives, functions, promises, errors, `WeakMap`, `WeakSet`, objects with `Symbol.toStringTag`. Maps, sets, dates and regular expressions from other realms (iframes, `node:vm`) are returned as is too.
* **Circular references and shared objects** are preserved: an object referenced several times (also from maps and sets) is cloned once.
* **The original value is never mutated**, and changes of the clone don't affect it (except for the values returned as is).

## Type guards

The package also exports type guards:

* `isCloneable(value)` checks whether `deeplyClone` copies a value (other values are returned as is).
* `isObject(value)`, `isArray(value)`, `isMap(value)`, `isSet(value)` check for objects with the `[object Object]` tag, arrays, maps and sets (not their subclasses).
* `isReferenceType(value)` checks for objects and functions.

## TypeScript

The type of the clone is the type of the original value. The clone of a readonly object (e.g. `as const`) is mutable at the top level:

```typescript
const settings = { theme: "dark", sizes: [1, 2] } as const;
const copy = deeplyClone(settings);

// const copy: {
//     theme: "dark";
//     sizes: readonly [1, 2];
// };
```

The types work with TypeScript 4.9 and newer.

## Examples

### *Objects*

```typescript
const book = {
    title: "Harry Potter",
    price: {
        value: 69,
        currency: "USD"
    }
};

const bookCopy = deeplyClone(book);
console.log(bookCopy === book); // false
console.log(bookCopy.price === book.price); // false

//  const bookCopy = {
//    title: "Harry Potter",
//    price: {
//      value: 69,
//      currency: "USD"
//    }
//  };
```

### *Class instances*

```typescript
class Point {
    constructor(public x: number, public y: number) {}

    length(): number {
        return Math.hypot(this.x, this.y);
    }
}

const pointCopy = deeplyClone(new Point(3, 4));
console.log(pointCopy instanceof Point); // true
console.log(pointCopy.length()); // 5
```

### *Circular references*

```js
const book = {
    title: "Harry Potter",
    price: 49,
    author: {
        name: "Joanne Rowling",
        books: [] // → [book]
    }
};
book.author.books.push(book); // add circular reference

const bookCopy = deeplyClone(book);
console.log(bookCopy === book); // false
console.log(bookCopy.author.books[0] === bookCopy); // true

//  const bookCopy = {
//    title: "Harry Potter",
//    price: 49,
//    author: {
//      name: "Joanne Rowling",
//      books: [bookCopy] // circular reference → [bookCopy]
//    }
//  };
```

## Changelog

See [CHANGELOG.md](CHANGELOG.md).
