// Compares the speed of deeplyClone with structuredClone, lodash and rfdc on data that all of them support.
// Run `yarn bench`: it builds the package first. The results depend on the machine, compare them with each other.
import cloneDeep from "lodash/cloneDeep.js";
import createRfdc from "rfdc";
import { deeplyClone } from "../dist/mjs/index.js";

const rfdc = createRfdc();
const rfdcCircles = createRfdc({ circles: true });

const user = index => ({
	id: index,
	name: `user ${index}`,
	active: index % 2 === 0,
	tags: ["a", "b", "c"],
	address: { city: "Berlin", zip: "10115", location: { lat: 52.52, lng: 13.40 } },
	created: new Date(index * 1000),
});
const nested = depth => {
	const root = {};
	let current = root;
	for (let level = 0; level < depth; level++) {
		current.next = { level, values: [level, level + 1] };
		current = current.next;
	}
	return root;
};
const circular = () => {
	const users = Array.from({ length: 100 }, (_, index) => user(index));
	const group = { name: "group", users };
	for (const item of users) {
		item.group = group;
	}
	return group;
};

const cases = [
	["small object", user(1), 100_000],
	["1000 objects in an array", Array.from({ length: 1000 }, (_, index) => user(index)), 200],
	["100000 numbers in an array", Array.from({ length: 100_000 }, (_, index) => index), 100],
	["nesting of 500 levels", nested(500), 2000],
	["map and set of 1000 objects", { map: new Map(Array.from({ length: 1000 }, (_, index) => [index, user(index)])), set: new Set([user(1), user(2)]) }, 200],
	["circular references", circular(), 2000],
];
const libraries = [
	["deeply-clone", value => deeplyClone(value)],
	["structuredClone", value => structuredClone(value)],
	["lodash cloneDeep", value => cloneDeep(value)],
	["rfdc", value => rfdc(value)],
];

const measure = (clone, value, iterations) => {
	const start = performance.now();
	for (let i = 0; i < iterations; i++) {
		clone(value);
	}
	return (performance.now() - start) / iterations;
};

for (const [name, value, iterations] of cases) {
	const best = new Map(libraries.map(([library]) => [library, Infinity]));
	// the rounds alternate the libraries, the best time of each one is used
	for (let round = 0; round < 10; round++) {
		for (const [library, clone] of libraries) {
			const cloneValue = library === "rfdc" && name === "circular references" ? rfdcCircles : clone;
			best.set(library, Math.min(best.get(library), measure(cloneValue, value, Math.ceil(iterations / 10))));
		}
	}
	const fastest = Math.min(...best.values());
	console.log(`\n${name}`);
	for (const [library, time] of best) {
		console.log(`  ${library.padEnd(18)} ${(time * 1000).toFixed(2).padStart(10)} µs  ${(time / fastest).toFixed(2)}x`);
	}
}
