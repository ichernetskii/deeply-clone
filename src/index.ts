export type MergeableObject = Record<PropertyKey, unknown>;
export type MergeableArray = unknown[];
export type MergeableMap = Map<unknown, unknown>;
export type MergeableSet = Set<unknown>;
export type Mergeable = MergeableObject | MergeableArray | MergeableMap | MergeableSet;

export const isObject = (obj: unknown): obj is MergeableObject =>
	Object.prototype.toString.call(obj) === "[object Object]";

export const isArray = (obj: unknown): obj is MergeableArray => Array.isArray(obj);
export const isMap = (obj: unknown): obj is MergeableMap => !!obj && Object.getPrototypeOf(obj) === Map.prototype;
export const isSet = (obj: unknown): obj is MergeableSet => !!obj && Object.getPrototypeOf(obj) === Set.prototype;
export const isMergeable = (obj: unknown): obj is Mergeable => isObject(obj) || isArray(obj) || isMap(obj) || isSet(obj);
export const isReferenceType = (obj: unknown): boolean => obj !== null && ["object", "function"].includes(typeof obj);

export const deeplyClone = <T>(objectToClone: Readonly<T>): T => {
	/**
	 * Clone object `source` with circular references.
	 * All inner circular references to the main object `source` will get new reference, but the same values.
	 * @param source - Object to clone
	 * @param cache - Map of objects that have already been cloned: `key` - original object, `value` - cloned object
	 * @example
	 * const cloned = deeplyCloneCircular(obj); // obj = { a: 1, o1: obj, o2: obj }
	 * expect(cloned).not.toBe(cloned.o1); // Root object has different reference
	 * expect(cloned.o1).toBe(cloned.o2); // Circular references have the same reference
	 */
	const deeplyCloneCircular = <T>(source: T, cache: WeakMap<any, any>): T => {
		if (isObject(source)) {
			const result: any = {};
			cache.set(source, result);
			// Add own properties and symbols (iterable and non-iterable)
			const keys = [...Object.getOwnPropertyNames(source), ...Object.getOwnPropertySymbols(source)];
			keys.forEach(key => {
				const value = source[key];
				result[key] = cache.get(value) ?? deeplyCloneCircular(value, cache);
			});
			return result;
		} else if (isArray(source)) {
			const result: any = [];
			cache.set(source, result);
			source.forEach(value => {
				result.push(cache.get(value) ?? deeplyCloneCircular(value, cache));
			});
			return result;
		} else if (isSet(source)) {
			const result: any = new Set();
			cache.set(source, result);
			const iterator = source.values();
			for (const value of iterator) {
				if (cache.has(value)) {
					result.add(cache.get(value));
				} else {
					const cloned = deeplyCloneCircular(value, cache);
					if (isReferenceType(value)) {
						cache.set(value, cloned);
					}
					result.add(cloned);
				}
			}
			return result;
		} else if (isMap(source)) {
			const result: any = new Map();
			cache.set(source, result);

			source.forEach((value, key) => {
				if (cache.has(value)) {
					result.set(key, cache.get(value));
				} else {
					const cloned = deeplyCloneCircular(value, cache);
					result.set(key, cloned);
					if (isReferenceType(value)) {
						cache.set(value, cloned);
					}
				}
			});
			return result;
		} else {
			return source;
		}
	};

	if (!isMergeable(objectToClone)) return objectToClone;
	return deeplyCloneCircular(objectToClone, new WeakMap());
};
