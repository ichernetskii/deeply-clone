import {
	deeplyClone,
	isArray,
	isCloneable,
	isMap,
	isObject,
	isReferenceType,
	isSet,
} from "../index.js";

describe("edge cases", () => {
	describe("type guards", () => {
		class Point {
			x = 1;
		}
		class CustomMap extends Map {}
		class CustomSet extends Set {}
		const values = {
			object: { a: 1 },
			nullPrototype: Object.create(null) as object,
			classInstance: new Point(),
			array: [1],
			arraySubclass: new (class extends Array {})(),
			map: new Map(),
			mapSubclass: new CustomMap(),
			set: new Set(),
			setSubclass: new CustomSet(),
			null: null,
			undefined,
			number: 1,
			string: "a",
			boolean: true,
			symbol: Symbol("a"),
			function: () => {},
			date: new Date(),
			regexp: /a/u,
			typedArray: new Uint8Array(1),
			error: new Error("error"),
			promise: Promise.resolve(),
			weakMap: new WeakMap(),
			toStringTag: { [Symbol.toStringTag]: "Tag" },
		};
		const accepted = (guard: (value: unknown) => boolean): string[] =>
			Object.entries(values).filter(([, value]) => guard(value)).map(([key]) => key);

		it("isObject should accept objects with the [object Object] tag", () => {
			expect(accepted(isObject)).toEqual(["object", "nullPrototype", "classInstance"]);
		});

		it("isArray should accept arrays and their subclasses", () => {
			expect(accepted(isArray)).toEqual(["array", "arraySubclass"]);
		});

		it("isMap and isSet should accept Map and Set but not their subclasses", () => {
			expect(accepted(isMap)).toEqual(["map"]);
			expect(accepted(isSet)).toEqual(["set"]);
		});

		it("isCloneable should accept the values that are cloned", () => {
			expect(accepted(isCloneable)).toEqual([
				"object", "nullPrototype", "classInstance", "array", "arraySubclass", "map", "mapSubclass", "set", "setSubclass", "date", "regexp", "typedArray",
			]);
		});

		it("isCloneable should accept exactly the values that deeplyClone copies", () => {
			const shared = new SharedArrayBuffer(2);
			const others = {
				buffer: new ArrayBuffer(2),
				sharedBuffer: shared,
				viewOfShared: new Uint8Array(shared),
				dataView: new DataView(new ArrayBuffer(2)),
				typedArrayWithoutPrototype: Object.setPrototypeOf(new Uint8Array(1), { [Symbol.toStringTag]: "Bytes" }) as object,
			};
			for (const [key, value] of Object.entries({ ...values, ...others })) {
				expect([key, isCloneable(value)]).toEqual([key, deeplyClone(value) !== value]);
			}
		});

		it("isReferenceType should accept objects and functions", () => {
			const references = Object.keys(values).filter(key => !["null", "undefined", "number", "string", "boolean", "symbol"].includes(key));
			expect(accepted(isReferenceType)).toEqual(references);
		});
	});

	describe("values returned as is", () => {
		it("should return primitives, null and undefined", () => {
			const symbol = Symbol("symbol");
			expect(deeplyClone(1)).toBe(1);
			expect(deeplyClone("a")).toBe("a");
			expect(deeplyClone(true)).toBe(true);
			expect(deeplyClone(BigInt(1))).toBe(BigInt(1));
			expect(deeplyClone(symbol)).toBe(symbol);
			expect(deeplyClone(null)).toBeNull();
			expect(deeplyClone(undefined)).toBeUndefined();
		});

		it("should return undefined without an argument", () => {
			// @ts-expect-error -- the argument is required
			expect(deeplyClone()).toBeUndefined();
		});

		it("should return functions and objects that can't be cloned by reference", () => {
			const values = {
				fn: (): number => 1,
				error: new Error("error"),
				promise: Promise.resolve(1),
				weakMap: new WeakMap(),
				weakSet: new WeakSet(),
				boxed: Object(1) as object,
				toStringTag: { [Symbol.toStringTag]: "Tag", nested: { a: 1 } },
			};
			const clone = deeplyClone(values);
			expect(clone).not.toBe(values);
			for (const [key, value] of Object.entries(values)) {
				expect([key, clone[key as keyof typeof values]]).toEqual([key, value]);
				expect(clone[key as keyof typeof values]).toBe(value);
			}
		});
	});

	describe("objects", () => {
		it("should clone symbol and non-enumerable keys as enumerable writable properties", () => {
			const symbol = Symbol("symbol");
			const source = Object.defineProperties({}, {
				hidden: { value: { a: 1 }, enumerable: false, writable: false },
				[symbol]: { value: { b: 2 }, enumerable: false },
			});
			const clone = deeplyClone(source);
			expect(Object.getOwnPropertyDescriptor(clone, "hidden")).toEqual({ value: { a: 1 }, writable: true, enumerable: true, configurable: true });
			expect(Object.getOwnPropertyDescriptor(clone, symbol)?.value).toEqual({ b: 2 });
			expect(Object.getOwnPropertyDescriptor(clone, symbol)?.enumerable).toBe(true);
		});

		it("should copy values of getters as data properties", () => {
			const getter = jest.fn(() => ({ a: 1 }));
			const source = Object.defineProperty({}, "value", { get: getter, enumerable: true });
			const clone = deeplyClone(source);
			expect(getter).toHaveBeenCalledTimes(1);
			expect(Object.getOwnPropertyDescriptor(clone, "value")).toEqual({ value: { a: 1 }, writable: true, enumerable: true, configurable: true });
		});

		it("should copy undefined for setters without getters", () => {
			const setter = jest.fn();
			// eslint-disable-next-line accessor-pairs -- a setter without a getter is tested on purpose
			const source = Object.defineProperty({}, "value", { set: (value: unknown): void => { setter(value); }, enumerable: true });
			const clone = deeplyClone(source);
			expect(Object.getOwnPropertyDescriptor(clone, "value")).toEqual({ value: undefined, writable: true, enumerable: true, configurable: true });
			expect(setter).not.toHaveBeenCalled();
		});

		it("should throw errors of getters", () => {
			const source = Object.defineProperty({}, "value", {
				get: () => { throw new Error("getter error"); },
				enumerable: true,
			});
			expect(() => deeplyClone(source)).toThrow("getter error");
		});

		it("should clone frozen objects into objects that aren't frozen", () => {
			const source = Object.freeze({ a: Object.freeze({ b: 1 }) });
			const clone = deeplyClone(source);
			expect(clone).toEqual(source);
			expect(Object.isFrozen(clone)).toBe(false);
			expect(Object.isFrozen(clone.a)).toBe(false);
		});

		it("should copy own properties of class instances, but not private fields", () => {
			class Counter {
				count = 1;
				readonly #secret = 42;
				get secret(): number {
					return this.#secret;
				}
			}
			const clone = deeplyClone(new Counter());
			expect(clone).toBeInstanceOf(Counter);
			expect(clone.count).toBe(1);
			expect(() => clone.secret).toThrow(TypeError);
		});
	});

	describe("arrays", () => {
		// listing the other own properties of arrays is several times slower than cloning their elements
		it("should clone only the elements of arrays", () => {
			const symbol = Symbol("symbol");
			const source = Object.assign([1, { a: 2 }], { extra: { b: 3 }, [symbol]: "symbol" });
			const clone = deeplyClone(source);
			expect(clone).toEqual([1, { a: 2 }]);
			expect(clone[1]).not.toBe(source[1]);
			expect(Object.keys(clone)).toEqual(["0", "1"]);
			expect(Object.getOwnPropertySymbols(clone)).toEqual([]);
		});

		it("should clone only the elements of regular expression matches", () => {
			const source = /b+/u.exec("abbc");
			const clone = deeplyClone(source);
			expect(clone).toEqual(["bb"]);
			expect(Object.keys(clone ?? {})).toEqual(["0"]);
		});

		it("should keep undefined elements", () => {
			const source = [undefined, { a: undefined }];
			const clone = deeplyClone(source);
			expect(clone).toStrictEqual(source);
			expect(0 in clone).toBe(true);
		});
	});

	describe("maps and sets", () => {
		it("should clone the values of maps but keep the keys", () => {
			const key = { id: 1 };
			const source = new Map<unknown, unknown>([[key, { a: 1 }], ["b", [1, { c: 2 }]]]);
			const clone = deeplyClone(source);
			expect(clone).toEqual(source);
			expect([...clone.keys()][0]).toBe(key);
			expect(clone.get(key)).not.toBe(source.get(key));
			expect(clone.get("b")).not.toBe(source.get("b"));
		});

		it("should clone the values of sets", () => {
			const value = { a: 1 };
			const source = new Set([value, 1]);
			const clone = deeplyClone(source);
			expect(clone).toEqual(source);
			expect(clone.has(value)).toBe(false);
			expect([...clone][0]).toEqual(value);
		});

		it("should clone references to the root and shared objects inside maps and sets", () => {
			const shared = { a: 1 };
			const map = new Map<string, unknown>([["shared", shared]]);
			const set = new Set<unknown>([shared]);
			map.set("self", map);
			map.set("set", set);
			set.add(map);
			set.add(set);
			const clone = deeplyClone({ map, set, shared });
			const clonedMap = clone.map;
			const clonedSet = clone.set;
			expect(clonedMap.get("self")).toBe(clonedMap);
			expect(clonedMap.get("set")).toBe(clonedSet);
			expect(clonedMap.get("shared")).toBe(clone.shared);
			expect(clonedSet.has(clonedMap)).toBe(true);
			expect(clonedSet.has(clonedSet)).toBe(true);
			expect(clonedSet.has(clone.shared)).toBe(true);
			expect(clone.shared).not.toBe(shared);
		});
	});

	describe("prototype pollution", () => {
		const emptyObject: Record<string, unknown> = {};

		it("should clone constructor and prototype keys as own properties", () => {
			const source = JSON.parse("{ \"constructor\": { \"prototype\": { \"polluted\": true } }, \"prototype\": { \"polluted\": true } }") as Record<string, unknown>;
			const clone = deeplyClone(source);
			expect(Object.keys(clone)).toEqual(["constructor", "prototype"]);
			expect(Object.getPrototypeOf(clone)).toBe(Object.prototype);
			expect(emptyObject["polluted"]).toBeUndefined();
		});

		it("should clone nested __proto__ keys from JSON as own properties", () => {
			const source = JSON.parse("{ \"a\": { \"__proto__\": { \"polluted\": true } }, \"b\": [{ \"__proto__\": { \"polluted\": true } }] }") as { a: object; b: object[]; };
			const clone = deeplyClone(source);
			expect(Object.getPrototypeOf(clone.a)).toBe(Object.prototype);
			expect(Object.keys(clone.a)).toEqual(["__proto__"]);
			expect(Object.getPrototypeOf(clone.b[0])).toBe(Object.prototype);
			expect(emptyObject["polluted"]).toBeUndefined();
		});
	});

	describe("isolation", () => {
		const createSource = () => {
			const source = {
				a: { b: [1, { c: 2 }] },
				map: new Map([["d", { e: 3 }]]),
				set: new Set([{ f: 4 }]),
				self: undefined as unknown,
			};
			source.self = source;
			return source;
		};

		it("shouldn't mutate the original value", () => {
			const source = createSource();
			deeplyClone(source);
			expect(source).toEqual(createSource());
		});

		it("shouldn't change the original value when the clone changes", () => {
			const source = createSource();
			const clone = deeplyClone(source);
			(clone.a.b[1] as { c: number; }).c = 42;
			clone.map.set("d", { e: 42 });
			clone.set.clear();
			clone.self = null;
			expect(source).toEqual(createSource());
		});
	});
});
