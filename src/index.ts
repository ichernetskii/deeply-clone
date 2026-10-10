export type CloneableObject = Record<PropertyKey, unknown>;
export type CloneableArray = unknown[];
export type CloneableMap = Map<unknown, unknown>;
export type CloneableSet = Set<unknown>;
/** The values that deeplyClone() copies, other values are returned as is */
export type Cloneable = CloneableObject | CloneableArray | CloneableMap | CloneableSet | Date | RegExp | ArrayBuffer | ArrayBufferView;

export const isObject = (obj: unknown): obj is CloneableObject =>
	Object.prototype.toString.call(obj) === "[object Object]";

export const isArray = (obj: unknown): obj is CloneableArray => Array.isArray(obj);
export const isMap = (obj: unknown): obj is CloneableMap => !!obj && Object.getPrototypeOf(obj) === Map.prototype;
export const isSet = (obj: unknown): obj is CloneableSet => !!obj && Object.getPrototypeOf(obj) === Set.prototype;
export const isReferenceType = (obj: unknown): boolean => obj !== null && ["object", "function"].includes(typeof obj);

type Primitive = string | number | boolean | bigint | symbol | null | undefined;

/**
 * Values whose clone has exactly the same type. Without a separate overload TypeScript infers them
 * through `Readonly<T>` as plain object types (e.g. `number` as an object with the methods of `Number`).
 */
type SameTypeValue =
	| Primitive
	| ((...args: never[]) => unknown)
	| readonly unknown[]
	| ReadonlyMap<unknown, unknown>
	| ReadonlySet<unknown>
	| Date
	| RegExp
	| WeakMap<object, unknown>
	| WeakSet<object>
	| Promise<unknown>
	| ArrayBuffer
	| ArrayBufferView;

type Pending<T> = Array<[source: T, target: T]>;

/** Defines an own data property: unlike an assignment it never calls setters or changes the prototype (`__proto__`) */
const defineProperty = (target: object, key: PropertyKey, value: unknown): void => {
	Object.defineProperty(target, key, { value, writable: true, enumerable: true, configurable: true });
};

const createObject = (prototype: object | null): CloneableObject => {
	if (prototype === Object.prototype) {
		return {};
	}
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return -- Object.create() is typed as returning `any`
	return Object.create(prototype);
};

/**
 * Gives a clone the prototype of the original value if it isn't the prototype of the built-in class.
 * Clones of subclasses are created with the built-in classes: the code of the subclasses isn't called.
 */
const withPrototype = <T extends object>(target: T, prototype: object | null, builtInPrototype: object): T => {
	if (prototype !== builtInPrototype) {
		Reflect.setPrototypeOf(target, prototype);
	}
	return target;
};

const getTag = (value: object): string => Object.prototype.toString.call(value);

type TypedArrayConstructor = (new (buffer: ArrayBufferLike, byteOffset: number, length: number) => ArrayBufferView) & {
	BYTES_PER_ELEMENT: number;
};

/**
 * Returns the prototype of the built-in class of a typed array (e.g. Uint8Array for its subclasses)
 * from the realm of the array: the prototypes of the built-in classes have their own `BYTES_PER_ELEMENT`.
 */
const getTypedArrayPrototype = (prototype: object | null): object | undefined => {
	for (let current = prototype; current !== null; current = Reflect.getPrototypeOf(current)) {
		if (Object.prototype.hasOwnProperty.call(current, "BYTES_PER_ELEMENT")) {
			return current;
		}
	}
	return undefined;
};

const isBuiltInCloneable = (obj: object): boolean => {
	if (obj instanceof Map || obj instanceof Set || obj instanceof Date || obj instanceof RegExp) {
		return true;
	}
	if (ArrayBuffer.isView(obj)) {
		return getTag(obj) === "[object DataView]" || getTypedArrayPrototype(Reflect.getPrototypeOf(obj)) !== undefined;
	}
	return getTag(obj) === "[object ArrayBuffer]";
};

/** Checks whether deeplyClone() copies a value: other values are returned as is */
export const isCloneable = (obj: unknown): obj is Cloneable =>
	typeof obj === "object" && obj !== null && (isArray(obj) || isObject(obj) || isBuiltInCloneable(obj));

/**
 * Deeply clones a value. Objects, arrays, maps, sets, dates, regular expressions and binary data are cloned,
 * other values (e.g. functions) are returned as is.
 * Circular references and objects referenced several times are cloned once.
 * @param objectToClone - The value to clone
 * @returns The cloned value
 * @example
 * const obj = { a: 1, nested: { b: 2 } };
 * obj.self = obj;
 * const clone = deeplyClone(obj); // { a: 1, nested: { b: 2 }, self: clone }
 */
export function deeplyClone<T extends SameTypeValue>(objectToClone: T): T;
export function deeplyClone<T>(objectToClone: Readonly<T>): T;
// eslint-disable-next-line @typescript-eslint/unified-signatures -- `Readonly<T> | T` infers other types: the overloads are tried in order
export function deeplyClone<T>(objectToClone: T): T;
export function deeplyClone(objectToClone: unknown): unknown {
	// clones of the traversed objects: `key` - original object, `value` - cloned object
	const clones = new Map<object, unknown>();
	// cloned objects whose content isn't cloned yet. A loop instead of recursion supports any nesting depth
	const objects: Pending<CloneableObject> = [];
	const arrays: Pending<CloneableArray> = [];
	const maps: Pending<CloneableMap> = [];
	const sets: Pending<CloneableSet> = [];

	// clones of array buffers, they are shared by the clones of typed arrays and data views
	const buffers = new Map<ArrayBufferLike, ArrayBufferLike>();
	const cloneBuffer = (buffer: ArrayBufferLike): ArrayBufferLike => {
		let target = buffers.get(buffer);
		if (target === undefined) {
			// SharedArrayBuffer has another tag. Binary data is detected in any realm (e.g. Jest replaces some globals)
			if (getTag(buffer) === "[object ArrayBuffer]") {
				target = withPrototype(new ArrayBuffer(buffer.byteLength), Reflect.getPrototypeOf(buffer), ArrayBuffer.prototype);
				new Uint8Array(target).set(new Uint8Array(buffer));
			} else {
				// the memory of a SharedArrayBuffer is shared on purpose
				target = buffer;
			}
			buffers.set(buffer, target);
		}
		return target;
	};

	// typed arrays and data views of any realm: the clones of the views of the same buffer share the cloned buffer
	const cloneView = (value: ArrayBufferView, prototype: object | null): unknown => {
		const buffer = cloneBuffer(value.buffer);
		if (getTag(value) === "[object DataView]") {
			return withPrototype(new DataView(buffer, value.byteOffset, value.byteLength), prototype, DataView.prototype);
		}
		const builtInPrototype = getTypedArrayPrototype(prototype);
		if (builtInPrototype === undefined) {
			// a typed array without a built-in prototype (e.g. after Object.setPrototypeOf())
			return value;
		}
		// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the constructor of a built-in typed array class
		const TypedArray = Reflect.get(builtInPrototype, "constructor") as TypedArrayConstructor;
		const length = value.byteLength / TypedArray.BYTES_PER_ELEMENT;
		return withPrototype(new TypedArray(buffer, value.byteOffset, length), prototype, builtInPrototype);
	};

	// subclasses of Map and Set, dates, regular expressions and binary data. Other objects are returned as is
	const cloneBuiltIn = (value: object, prototype: object | null): unknown => {
		if (value instanceof Map) {
			const target = withPrototype<CloneableMap>(new Map(), prototype, Map.prototype);
			maps.push([value, target]);
			return target;
		}
		if (value instanceof Set) {
			const target = withPrototype<CloneableSet>(new Set(), prototype, Set.prototype);
			sets.push([value, target]);
			return target;
		}
		if (value instanceof Date) {
			return withPrototype(new Date(Date.prototype.getTime.call(value)), prototype, Date.prototype);
		}
		if (value instanceof RegExp) {
			// the pattern and the flags are taken from the internal slots, not from the overridable getters
			// eslint-disable-next-line require-unicode-regexp -- the flags of the original are copied
			const target = withPrototype(new RegExp(value), prototype, RegExp.prototype);
			target.lastIndex = value.lastIndex;
			return target;
		}
		if (ArrayBuffer.isView(value)) {
			return cloneView(value, prototype);
		}
		if (getTag(value) === "[object ArrayBuffer]") {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the tag of an ArrayBuffer
			return cloneBuffer(value as ArrayBuffer);
		}
		return value;
	};

	const createClone = (value: object): unknown => {
		// the same checks as isMap() and isSet(), but the prototype is read once
		const prototype = Reflect.getPrototypeOf(value);
		if (prototype === Map.prototype) {
			const target: CloneableMap = new Map();
			// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the prototype is checked like in isMap()
			maps.push([value as CloneableMap, target]);
			return target;
		}
		if (prototype === Set.prototype) {
			const target: CloneableSet = new Set();
			// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the prototype is checked like in isSet()
			sets.push([value as CloneableSet, target]);
			return target;
		}
		if (isArray(value)) {
			const target = withPrototype<CloneableArray>([], prototype, Array.prototype);
			arrays.push([value, target]);
			return target;
		}
		if (isObject(value)) {
			const target = createObject(prototype);
			objects.push([value, target]);
			return target;
		}
		return cloneBuiltIn(value, prototype);
	};

	// returns the clone of a value, the content of a new clone is added later
	const clone = (value: unknown): unknown => {
		if (typeof value !== "object" || value === null) {
			return value;
		}
		let target = clones.get(value);
		if (target === undefined) {
			target = createClone(value);
			clones.set(value, target);
		}
		return target;
	};

	const fillObject = ([source, target]: [CloneableObject, CloneableObject]): void => {
		// an assignment is faster, but it can call setters of other prototypes or change the prototype
		const prototype = Reflect.getPrototypeOf(source);
		const canAssign = prototype === Object.prototype || prototype === null;
		// own properties and symbols (enumerable and non-enumerable)
		for (const key of Reflect.ownKeys(source)) {
			const value = clone(source[key]);
			if (canAssign && key !== "__proto__") {
				target[key] = value;
			} else {
				defineProperty(target, key, value);
			}
		}
	};

	// only the elements are cloned: listing other own properties of arrays is several times slower than cloning
	const fillArray = ([source, target]: [CloneableArray, CloneableArray]): void => {
		const { length } = source;
		for (let index = 0; index < length; index++) {
			const value = source[index];
			// holes of sparse arrays stay holes
			if (value !== undefined || index in source) {
				target[index] = clone(value);
			}
		}
		target.length = length;
	};

	// the built-in methods: the overridden methods of subclasses aren't called
	const fillMap = ([source, target]: [CloneableMap, CloneableMap]): void => {
		Map.prototype.forEach.call(source, (value, key) => {
			Map.prototype.set.call(target, key, clone(value));
		});
	};

	const fillSet = ([source, target]: [CloneableSet, CloneableSet]): void => {
		Set.prototype.forEach.call(source, value => {
			Set.prototype.add.call(target, clone(value));
		});
	};

	const result = clone(objectToClone);
	for (;;) {
		const object = objects.pop();
		if (object !== undefined) {
			fillObject(object);
			continue;
		}
		const array = arrays.pop();
		if (array !== undefined) {
			fillArray(array);
			continue;
		}
		const map = maps.pop();
		if (map !== undefined) {
			fillMap(map);
			continue;
		}
		const set = sets.pop();
		if (set !== undefined) {
			fillSet(set);
			continue;
		}
		return result;
	}
}
