import { deeplyClone } from "../index.js";

describe("regressions", () => {
	describe("prototypes", () => {
		it("should keep the prototype of class instances", () => {
			class Point {
				x = 3;
				y = { value: 4 };
				length(): number {
					return Math.hypot(this.x, this.y.value);
				}
			}
			const source = new Point();
			const clone = deeplyClone(source);
			expect(clone).not.toBe(source);
			expect(clone).toBeInstanceOf(Point);
			expect(clone.length()).toBe(5);
			expect(clone.y).not.toBe(source.y);
		});

		it("should keep a null prototype", () => {
			const source = Object.assign(Object.create(null) as Record<string, unknown>, { a: { b: 1 } });
			const clone = deeplyClone(source);
			expect(Object.getPrototypeOf(clone)).toBeNull();
			expect(clone.a).toEqual({ b: 1 });
			expect(clone.a).not.toBe(source.a);
		});

		it("should keep the prototype of array subclasses", () => {
			class Stack<T> extends Array<T> {
				peek(): T | undefined {
					return this[this.length - 1];
				}
			}
			const source = new Stack<unknown>();
			source.push(1, { a: 2 });
			const clone = deeplyClone(source);
			expect(clone).not.toBe(source);
			expect(clone).toBeInstanceOf(Stack);
			expect(Array.isArray(clone)).toBe(true);
			expect(clone.peek()).toEqual({ a: 2 });
			expect(clone.peek()).not.toBe(source.peek());
		});

		it("should copy own properties that shadow accessors of the prototype", () => {
			class Getter {
				// eslint-disable-next-line @typescript-eslint/class-literal-property-style -- an accessor is tested on purpose
				get value(): number {
					return 0;
				}
			}
			const source = Object.defineProperty(new Getter(), "value", { value: 42, enumerable: true, writable: true, configurable: true });
			const clone = deeplyClone(source);
			expect(clone).toBeInstanceOf(Getter);
			expect(clone.value).toBe(42);
		});
	});

	describe("__proto__ key", () => {
		const emptyObject: Record<string, unknown> = {};

		it("should clone an own __proto__ key as an own property", () => {
			const source = JSON.parse("{ \"__proto__\": { \"polluted\": true }, \"a\": 1 }") as Record<string, unknown>;
			const clone = deeplyClone(source);
			expect(Object.getPrototypeOf(clone)).toBe(Object.prototype);
			expect(Object.keys(clone)).toEqual(["__proto__", "a"]);
			expect(Object.getOwnPropertyDescriptor(clone, "__proto__")?.value).toEqual({ polluted: true });
			expect(clone["polluted"]).toBeUndefined();
			expect(emptyObject["polluted"]).toBeUndefined();
		});

		it("should keep a primitive __proto__ value", () => {
			const source = JSON.parse("{ \"__proto__\": 1 }") as Record<string, unknown>;
			const clone = deeplyClone(source);
			expect(Object.getOwnPropertyDescriptor(clone, "__proto__")?.value).toBe(1);
		});
	});

	describe("arrays", () => {
		it("should keep holes and the length of sparse arrays", () => {
			// eslint-disable-next-line no-sparse-arrays -- holes are tested on purpose
			const source = [1, , { a: 3 }, , ];
			const clone = deeplyClone(source);
			expect(clone).toHaveLength(4);
			expect(1 in clone).toBe(false);
			expect(3 in clone).toBe(false);
			expect(clone[2]).toEqual({ a: 3 });
			expect(clone).toStrictEqual(source);
		});
	});

	describe("deep nesting", () => {
		const depth = 50_000;

		it("should clone deeply nested objects", () => {
			type Node = { next?: Node; };
			const source: Node = {};
			let current = source;
			for (let i = 0; i < depth; i++) {
				current.next = {};
				current = current.next;
			}
			const clone = deeplyClone(source);
			let count = 0;
			for (let node: Node | undefined = clone.next; node !== undefined; node = node.next) {
				count++;
			}
			expect(count).toBe(depth);
		});

		it("should clone deeply nested arrays, maps and sets", () => {
			const source: unknown[] = [];
			let current: unknown[] = source;
			for (let i = 0; i < depth; i++) {
				const next: unknown[] = [];
				current.push(new Map([["set", new Set([next])]]));
				current = next;
			}
			expect(() => deeplyClone(source)).not.toThrow();
		});
	});
});
