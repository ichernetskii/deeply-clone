# [Deeply-Clone](https://www.npmjs.com/package/deeply-clone)

<a href="https://www.npmjs.com/package/deeply-clone">![GitHub package.json version](https://img.shields.io/github/package-json/v/ichernetskii/deeply-clone?logo=npm)</a>
<a href="https://bundlephobia.com/package/deeply-clone@latest">![npm bundle size](https://img.shields.io/bundlephobia/minzip/deeply-clone)</a>
![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/ichernetskii/deeply-clone/publish.yml)
<a href="https://ichernetskii.testspace.com/spaces/224041">![Testspace pass ratio](https://img.shields.io/testspace/pass-ratio/ichernetskii/ichernetskii:deeply-clone/master?label=passed%20tests)</a>
[![Coverage Status](https://coveralls.io/repos/github/ichernetskii/deeply-clone/badge.svg?branch=ci)](https://coveralls.io/github/ichernetskii/deeply-clone?branch=ci)
<a href="https://github.com/ichernetskii/deeply-clone/blob/master/LICENSE.md">[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://img.shields.io/github/license/ichernetskii/deeply-clone)</a>

Deep fast clone JavaScript objects with circular references handling and TypeScript support

## Installation

```sh
# Install with npm
npm install deeply-clone
```
```sh
# Install with yarn
yarn add deeply-clone
```

## Usage

Once the package is installed, you can import the library using import or require approach:

```js
import { deeplyClone } from "deeply-clone";
```

or

```js
const deeplyClone = require("deeply-clone");
```

## Features

* Clones deeply objects
* Supports Object, Array, Map or Set cloning
* Objects can have any circular references
* Fast algorithm with caching
* Strongly typed merged result with TypeScript
* No dependencies
* Small size
* Works in browser and Node.js

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

const bookCopy = deeply-clone(book);
console.log(bookCopy === book); // false

//  const bookCopy = {
//    title: "Harry Potter",
//    price: {
//      value: 69,
//      currency: "USD"
//    }
//  };
```

### *Circular references*

```typescript
const book = {
    title: "Harry Potter",
    price: 49,
    author: {
        name: "Joanne Rowling",
        books: [] // → [book]
    }
};
book.author.books.push(book); // add circular reference

const bookCopy = deeply-clone(book);
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
