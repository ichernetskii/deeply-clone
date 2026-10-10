// Runs in a temporary project with the packed package installed, see scripts/smoke.mjs
import * as library from "deeply-clone";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { deeplyClone } from "deeply-clone";
import test from "node:test";

const require = createRequire(import.meta.url);

test("import resolves to the ESM build of the installed package", () => {
	assert.match(import.meta.resolve("deeply-clone"), /\/node_modules\/deeply-clone\/dist\/mjs\/index\.js$/u);
});

test("the named exports are available", () => {
	assert.deepEqual(Object.keys(library).sort(), ["deeplyClone", "isArray", "isCloneable", "isMap", "isObject", "isReferenceType", "isSet"]);
});

test("deeplyClone clones deeply", () => {
	class Point {
		constructor(x) {
			this.x = x;
		}
	}
	const source = { point: new Point(1), list: [1, { a: 2 }], map: new Map([["b", { c: 3 }]]), set: new Set([{ d: 4 }]) };
	source.self = source;
	const clone = deeplyClone(source);
	assert.notEqual(clone, source);
	assert.deepEqual(clone, source);
	assert.equal(clone.self, clone);
	assert.ok(clone.point instanceof Point);
	assert.notEqual(clone.list[1], source.list[1]);
	assert.notEqual(clone.map.get("b"), source.map.get("b"));
});

test("the ESM and CJS builds produce the same result", () => {
	const cjs = require("deeply-clone");
	assert.notEqual(cjs.deeplyClone, deeplyClone);
	// eslint-disable-next-line no-sparse-arrays -- holes are tested on purpose
	const source = { a: [1, , { b: 2 }], c: new Set([1]) };
	assert.deepEqual(cjs.deeplyClone(source), deeplyClone(source));
});
