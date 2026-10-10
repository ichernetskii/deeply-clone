// Runs in a temporary project with the packed package installed, see scripts/smoke.mjs
const assert = require("node:assert/strict");
const test = require("node:test");

test("require resolves to the CJS build of the installed package", () => {
	assert.match(require.resolve("deeply-clone"), /[\\/]node_modules[\\/]deeply-clone[\\/]dist[\\/]cjs[\\/]index\.js$/u);
});

test("require(\"deeply-clone\").deeplyClone clones deeply", () => {
	const { deeplyClone } = require("deeply-clone");
	const source = { a: { b: [1, 2] }, map: new Map([["c", { d: 1 }]]) };
	source.self = source;
	const clone = deeplyClone(source);
	assert.notEqual(clone, source);
	assert.deepEqual(clone, source);
	assert.equal(clone.self, clone);
	assert.notEqual(clone.a, source.a);
});

test("the named exports are available", () => {
	assert.deepEqual(Object.keys(require("deeply-clone")).sort(), ["deeplyClone", "isArray", "isCloneable", "isMap", "isObject", "isReferenceType", "isSet"]);
});

test("package.json is exported", () => {
	assert.equal(require("deeply-clone/package.json").name, "deeply-clone");
});
