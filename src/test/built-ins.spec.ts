import { deeplyClone } from "../index.js";

describe("built-in objects", () => {
	describe("Date", () => {
		it("should clone dates", () => {
			const source = { date: new Date(2026, 9, 10) };
			const clone = deeplyClone(source);
			expect(clone.date).not.toBe(source.date);
			expect(clone.date).toBeInstanceOf(Date);
			expect(clone.date.getTime()).toBe(source.date.getTime());
			clone.date.setFullYear(2030);
			expect(source.date.getFullYear()).toBe(2026);
		});

		it("should keep invalid dates invalid", () => {
			expect(deeplyClone(new Date(Number.NaN)).getTime()).toBeNaN();
		});

		it("should keep the prototype of date subclasses", () => {
			class Day extends Date {
				isWeekend(): boolean {
					return this.getDay() === 0 || this.getDay() === 6;
				}
			}
			const source = new Day(2026, 9, 10);
			const clone = deeplyClone(source);
			expect(clone).not.toBe(source);
			expect(clone).toBeInstanceOf(Day);
			expect(clone.getTime()).toBe(source.getTime());
			expect(clone.isWeekend()).toBe(true);
		});
	});

	describe("RegExp", () => {
		it("should clone regular expressions with their flags and lastIndex", () => {
			const source = /a+/gu;
			source.lastIndex = 2;
			const clone = deeplyClone(source);
			expect(clone).not.toBe(source);
			expect(clone).toBeInstanceOf(RegExp);
			expect(clone.source).toBe("a+");
			expect(clone.flags).toBe("gu");
			expect(clone.lastIndex).toBe(2);
			clone.exec("bbaaa");
			expect(clone.lastIndex).toBe(5);
			expect(source.lastIndex).toBe(2);
		});

		it("should keep the prototype of regular expression subclasses", () => {
			class Pattern extends RegExp {
				matches(value: string): boolean {
					return this.test(value);
				}
			}
			const source = new Pattern("^a", "u");
			const clone = deeplyClone(source);
			expect(clone).not.toBe(source);
			expect(clone).toBeInstanceOf(Pattern);
			expect(clone.matches("abc")).toBe(true);
		});
	});

	describe("binary data", () => {
		it("should clone array buffers", () => {
			const source = new Uint8Array([1, 2, 3]).buffer;
			const clone = deeplyClone(source);
			expect(clone).not.toBe(source);
			expect(clone).toBeInstanceOf(ArrayBuffer);
			expect([...new Uint8Array(clone)]).toEqual([1, 2, 3]);
			new Uint8Array(clone)[0] = 42;
			expect(new Uint8Array(source)[0]).toBe(1);
		});

		it("should clone typed arrays and data views", () => {
			const source = {
				bytes: new Uint8Array([1, 2, 3]),
				floats: new Float64Array([1.5, 2.5]),
				view: new DataView(new ArrayBuffer(4)),
			};
			const clone = deeplyClone(source);
			expect(clone.bytes).not.toBe(source.bytes);
			expect(clone.bytes).toBeInstanceOf(Uint8Array);
			expect([...clone.bytes]).toEqual([1, 2, 3]);
			expect(clone.floats).toBeInstanceOf(Float64Array);
			expect([...clone.floats]).toEqual([1.5, 2.5]);
			expect(clone.view).toBeInstanceOf(DataView);
			expect(clone.view.byteLength).toBe(4);
			clone.bytes[0] = 42;
			clone.view.setUint8(0, 42);
			expect(source.bytes[0]).toBe(1);
			expect(source.view.getUint8(0)).toBe(0);
		});

		it("should keep the views of the same buffer on the same cloned buffer", () => {
			const buffer = new ArrayBuffer(8);
			const source = { buffer, bytes: new Uint8Array(buffer, 2, 4), view: new DataView(buffer, 1) };
			const clone = deeplyClone(source);
			expect(clone.buffer).not.toBe(buffer);
			expect(clone.bytes.buffer).toBe(clone.buffer);
			expect(clone.view.buffer).toBe(clone.buffer);
			expect(clone.bytes.byteOffset).toBe(2);
			expect(clone.bytes).toHaveLength(4);
			expect(clone.view.byteOffset).toBe(1);
			expect(clone.view.byteLength).toBe(7);
			clone.view.setUint8(1, 42);
			expect(clone.bytes[0]).toBe(42);
			expect(new Uint8Array(buffer)[2]).toBe(0);
		});

		it("should keep the prototype of typed array subclasses", () => {
			class Bytes extends Uint8Array {
				sum(): number {
					return this.reduce((total, value) => total + value, 0);
				}
			}
			const source = new Bytes(3);
			source.set([1, 2, 3]);
			const clone = deeplyClone(source);
			expect(clone).not.toBe(source);
			expect(clone).toBeInstanceOf(Bytes);
			expect(clone.sum()).toBe(6);
		});

		it("should return typed arrays without a built-in prototype as is", () => {
			const source = Object.setPrototypeOf(new Uint8Array([1]), { [Symbol.toStringTag]: "Bytes" }) as object;
			expect(deeplyClone(source)).toBe(source);
		});

		it("should keep shared array buffers shared", () => {
			const shared = new SharedArrayBuffer(4);
			const source = { shared, bytes: new Uint8Array(shared) };
			const clone = deeplyClone(source);
			expect(clone.shared).toBe(shared);
			expect(clone.bytes).not.toBe(source.bytes);
			expect(clone.bytes.buffer).toBe(shared);
		});
	});

	describe("subclasses of Map and Set", () => {
		it("should clone subclasses of Map and Set with their prototypes", () => {
			class Registry extends Map<string, { id: number; }> {
				ids(): number[] {
					return [...this.values()].map(value => value.id);
				}
			}
			class Tags extends Set<{ name: string; }> {
				names(): string[] {
					return [...this].map(tag => tag.name);
				}
			}
			const source = { registry: new Registry([["a", { id: 1 }]]), tags: new Tags([{ name: "x" }]) };
			const clone = deeplyClone(source);
			expect(clone.registry).not.toBe(source.registry);
			expect(clone.registry).toBeInstanceOf(Registry);
			expect(clone.registry.ids()).toEqual([1]);
			expect(clone.registry.get("a")).not.toBe(source.registry.get("a"));
			expect(clone.tags).not.toBe(source.tags);
			expect(clone.tags).toBeInstanceOf(Tags);
			expect(clone.tags.names()).toEqual(["x"]);
			expect([...clone.tags][0]).not.toBe([...source.tags][0]);
		});

		it("shouldn't call the overridden methods of the subclasses", () => {
			const calls: string[] = [];
			class LoggedMap extends Map<string, number> {
				override set(key: string, value: number): this {
					calls.push("set");
					return super.set(key, value);
				}

				override forEach(callback: (value: number, key: string, map: Map<string, number>) => void): void {
					calls.push("forEach");
					super.forEach(callback);
				}
			}
			const source = new LoggedMap([["a", 1]]);
			calls.length = 0;
			const clone = deeplyClone(source);
			expect(clone.get("a")).toBe(1);
			expect(calls).toEqual([]);
		});
	});

	it("should clone a built-in object referenced several times once", () => {
		const date = new Date(1);
		const bytes = new Uint8Array(2);
		const clone = deeplyClone({ a: date, b: date, c: bytes, d: [bytes] });
		expect(clone.a).toBe(clone.b);
		expect(clone.a).not.toBe(date);
		expect(clone.c).toBe(clone.d[0]);
		expect(clone.c).not.toBe(bytes);
	});
});
