/**
 * Type tests. They are checked by the compiler (`yarn test:types`) and never executed.
 */
import { type Cloneable, deeplyClone, isCloneable } from "../index.js";
import { expectTypeOf } from "expect-type";

// objects: the clone of a readonly object is mutable at the top level
expectTypeOf(deeplyClone({ a: 1, b: { c: "x" } })).toEqualTypeOf<{ a: number; b: { c: string; }; }>();
expectTypeOf(deeplyClone({ a: 1, b: [1, "x"] } as const)).toEqualTypeOf<{ a: 1; b: readonly [1, "x"]; }>();
interface Config { readonly id: number; name: string; nested: { readonly value: number; }; }
declare const config: Readonly<Config>;
expectTypeOf(deeplyClone(config)).toEqualTypeOf<Config>();

// arrays and tuples
declare const numbers: number[];
declare const readonlyNumbers: readonly number[];
expectTypeOf(deeplyClone(numbers)).toEqualTypeOf<number[]>();
expectTypeOf(deeplyClone(readonlyNumbers)).toEqualTypeOf<readonly number[]>();
expectTypeOf(deeplyClone([1, "a"] as [number, string])).toEqualTypeOf<[number, string]>();
expectTypeOf(deeplyClone([1, { a: 1 }] as const)).toEqualTypeOf<readonly [1, { readonly a: 1; }]>();
class Stack<T> extends Array<T> {
	peek(): T | undefined {
		return this[this.length - 1];
	}
}
declare const stack: Stack<number>;
expectTypeOf(deeplyClone(stack)).toEqualTypeOf<Stack<number>>();

// maps, sets and other built-in objects keep their types
expectTypeOf(deeplyClone(new Map<string, { x: number; }>())).toEqualTypeOf<Map<string, { x: number; }>>();
expectTypeOf(deeplyClone(new Set<number>())).toEqualTypeOf<Set<number>>();
declare const readonlyMap: ReadonlyMap<string, number>;
expectTypeOf(deeplyClone(readonlyMap)).toEqualTypeOf<ReadonlyMap<string, number>>();
expectTypeOf(deeplyClone(new Date())).toEqualTypeOf<Date>();
expectTypeOf(deeplyClone(/a/u)).toEqualTypeOf<RegExp>();
declare const bytes: Uint8Array;
expectTypeOf(deeplyClone(bytes)).toEqualTypeOf<Uint8Array>();

// class instances
class Point {
	x = 1;
	length(): number {
		return this.x;
	}
}
expectTypeOf(deeplyClone(new Point())).toEqualTypeOf<{ x: number; length: () => number; }>();
class WithPrivate {
	y = 2;
	private readonly secret = 1;
	getSecret(): number {
		return this.secret;
	}
}
expectTypeOf(deeplyClone(new WithPrivate())).toEqualTypeOf<WithPrivate>();

// primitives, null, undefined and functions
declare const num: number;
declare const str: string;
declare const bool: boolean;
expectTypeOf(deeplyClone(num)).toEqualTypeOf<number>();
expectTypeOf(deeplyClone(str)).toEqualTypeOf<string>();
expectTypeOf(deeplyClone(bool)).toEqualTypeOf<boolean>();
expectTypeOf(deeplyClone(null)).toBeNull();
expectTypeOf(deeplyClone(undefined)).toBeUndefined();
const fn = (): number => 1;
expectTypeOf(deeplyClone(fn)).toEqualTypeOf<() => number>();

// unions and unknown values
declare const numberOrObject: number | { a: 1; };
expectTypeOf(deeplyClone(numberOrObject)).toEqualTypeOf<number | { a: 1; }>();
declare const maybeObject: { a: number; } | null;
expectTypeOf(deeplyClone(maybeObject)).toEqualTypeOf<{ a: number; } | null>();
declare const value: unknown;
expectTypeOf(deeplyClone(value)).toBeUnknown();
export const passThrough = <T>(input: T): T => deeplyClone(input);

// type guards
expectTypeOf(isCloneable).guards.toEqualTypeOf<Cloneable>();
declare const unknownValue: unknown;
if (isCloneable(unknownValue)) {
	expectTypeOf(deeplyClone(unknownValue)).toEqualTypeOf<Cloneable>();
}

// negative cases
// @ts-expect-error -- the argument is required
void deeplyClone();
// @ts-expect-error -- the clone of a number is a number
expectTypeOf(deeplyClone(num)).toEqualTypeOf<string>();
// @ts-expect-error -- the clone of a map is a map
expectTypeOf(deeplyClone(new Map<string, number>())).toEqualTypeOf<Set<number>>();
// @ts-expect-error -- the clone of a class instance with private members keeps them
expectTypeOf(deeplyClone(new WithPrivate())).toEqualTypeOf<{ y: number; getSecret: () => number; }>();
// @ts-expect-error -- the clone of an unknown value is unknown
expectTypeOf(deeplyClone(value)).toEqualTypeOf<object>();
const settings = deeplyClone({ theme: "dark", nested: { size: 1 } } as const);
settings.theme = "dark";
// @ts-expect-error -- only the top level of a readonly object becomes mutable
settings.nested.size = 1;
// @ts-expect-error -- the clone of a readonly array stays readonly
deeplyClone(readonlyNumbers).push(1);
