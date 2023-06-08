import { deeplyClone } from "../index.js";

describe("deep cloning", () => {
	it("should clone objects", () => {
		const obj = {
			a: 1,
			b: 2,
			obj: { x: 1, y: ["str"] },
			arr: [1, 2, 3, { x: 1, y: "str" }],
			set: new Set([1, { a: 1 }]),
			map: new Map([["a", 1], ["b", 2]]),
		};
		const clonedObj = deeplyClone(obj);
		expect(clonedObj).toEqual(obj);
		expect(clonedObj).not.toBe(obj);
		expect(clonedObj.obj).toEqual(obj.obj);
		expect(clonedObj.obj).not.toBe(obj.obj);
		expect(clonedObj.obj.y).toEqual(obj.obj.y);
		expect(clonedObj.obj.y).not.toBe(obj.obj.y);
		expect(clonedObj.arr).toEqual(obj.arr);
		expect(clonedObj.arr).not.toBe(obj.arr);
		expect(clonedObj.arr[3]).toEqual(obj.arr[3]);
		expect(clonedObj.arr[3]).not.toBe(obj.arr[3]);
		expect(clonedObj.set).toEqual(obj.set);
		expect(clonedObj.set).not.toBe(obj.set);
		const setIterator = obj.set.values();
		const clonedSetIterator = clonedObj.set.values();
		expect(clonedSetIterator.next().value).toBe(setIterator.next().value);
		expect(clonedSetIterator.next().value).not.toBe(setIterator.next().value);
		expect(clonedObj.map).not.toBe(obj.map);
	});

	it("shouldn't change references of the same objects", () => {
		const mockFn = jest.fn();
		const obj = {
			a: 1,
			b: mockFn,
			c: mockFn,
		};
		const clonedObj = deeplyClone(obj);
		expect(clonedObj).toEqual(obj);
		expect(clonedObj.b).toBe(clonedObj.c);
	});

	it("should affect upper levels of object", () => {
		const original = {
			d: {
				d1: 1,
				d2: {},
			},
		};

		original.d.d2 = original.d;

		const cloned: any = deeplyClone(original);
		cloned.d.d1 = 10;
		cloned.d.d2.d1 = 42;
		expect(cloned.d.d1).toEqual(42);
	});

	it("should clone arrays", () => {
		const arr = [1, 2, 3, { a: 1 }];
		const clonedArr = deeplyClone(arr);
		expect(clonedArr).toEqual(arr);
		expect(clonedArr).not.toBe(arr);
		expect(clonedArr[3]).toEqual(arr[3]);
		expect(clonedArr[3]).not.toBe(arr[3]);
	});

	it("should clone maps", () => {
		const map = new Map([["a", 1], ["b", 2]]);
		const clonedMap = deeplyClone(map);
		expect(clonedMap).toEqual(map);
		expect(clonedMap).not.toBe(map);
	});

	it("should clone sets", () => {
		const set = new Set([1, 2, 3]);
		const clonedSet = deeplyClone(set);
		expect(clonedSet).toEqual(set);
		expect(clonedSet).not.toBe(set);
	});

	it("should clone object with symbol", () => {
		const symbol = Symbol("a");
		const obj = {
			[symbol]: 1,
			b: 2,
		};
		const clonedObj = deeplyClone(obj);
		expect(clonedObj).toEqual(obj);
		expect(clonedObj).not.toBe(obj);
		expect(clonedObj[symbol]).toEqual(obj[symbol]);
	});

	it("should clone value types", () => {
		const copy = deeplyClone(1);
		expect(copy).toEqual(1);
	});

	describe("circular references", () => {
		it("should clone object with circular references", () => {
			type T1 = { a: number; b: number; c?: T1; };
			const obj1: T1 = {
				a: 1,
				b: 2,
			};
			obj1.c = obj1;
			const clonedObj1 = deeplyClone(obj1);
			expect(clonedObj1).toEqual(obj1);
			expect(clonedObj1).toEqual({ a: 1, b: 2, c: clonedObj1 });
			expect(clonedObj1.c).toEqual(obj1.c);
			expect(clonedObj1.c).not.toBe(obj1.c);
			expect(clonedObj1).not.toBe(obj1);
			expect(clonedObj1).toBe(clonedObj1.c);
			expect(clonedObj1).toBe(clonedObj1.c?.c);
			expect(clonedObj1.c).toBe(clonedObj1.c?.c);
		});

		it("should clone object with circular references in nested objects", () => {
			type T2 = { a: number; b: number; c: { x: number; y?: T2; }; };
			const obj2: T2 = {
				a: 1,
				b: 2,
				c: {
					x: 1,
				},
			};
			obj2.c.y = obj2;
			const clonedObj2 = deeplyClone(obj2);
			expect(clonedObj2).toEqual(obj2);
			expect(clonedObj2).toEqual({ a: 1, b: 2, c: clonedObj2.c });
			expect(clonedObj2.c).toEqual(obj2.c);
			expect(clonedObj2).not.toBe(obj2);
			expect(clonedObj2).toBe(clonedObj2.c?.y);
			expect(clonedObj2.c?.y).not.toBe(obj2.c.y);
			expect(clonedObj2.c?.y).toBe(clonedObj2.c?.y?.c.y);
		});

		it("should clone object with two circular references", () => {
			type XY = { x: number; y: number; xy?: XY; };
			const xy: XY = { x: 1, y: 2 };
			xy.xy = xy;
			/*
			obj = {
				a: 1,
				c: obj,
				d: obj,
				xy: { x: 1, y: 2, xy: obj.xy },
			}
			*/
			type T = { a: number; c?: T; d?: T; xy: XY; };
			const obj: T = {
				a: 1,
				xy,
			};
			obj.c = obj;
			obj.d = obj;
			const clonedObj = deeplyClone(obj);
			expect(clonedObj).toEqual(obj);
			expect(clonedObj).toEqual({ a: 1, xy: clonedObj.xy, c: clonedObj.c, d: clonedObj.d });
			expect(clonedObj).toBe(clonedObj.c);
			expect(clonedObj.c).toBe(clonedObj.d);
			expect(clonedObj.c).toBe(clonedObj.c?.c);
			expect(clonedObj).toBe(clonedObj.d);
			expect(clonedObj.d).toBe(clonedObj.d?.d);
			expect(clonedObj.xy).toBe(clonedObj.xy.xy);
			expect(clonedObj).not.toBe(obj);
		});

		it("should clone object with many of the same circular references", () => {
			type O = { a: number; };
			const o: O = { a: 1 };
			type T = { x: number; o1: O; o2: O; o3: { value: O; }; arr: [number, O, number]; };
			const obj: T = {
				x: 42,
				o1: o,
				o2: o,
				o3: { value: o },
				arr: [1, o, 2],
			};
			const clonedObj = deeplyClone(obj);
			expect(clonedObj).toEqual(obj);
			expect(clonedObj).not.toBe(obj);
			expect(clonedObj.o1).toBe(clonedObj.o2);
			expect(clonedObj.o1).toBe(clonedObj.o3.value);
			expect(clonedObj.o1).toBe(clonedObj.arr[1]);
		});

		it("should clone two cross referenced objects", () => {
			type T1 = { a: number; o2?: T2; };
			type T2 = { b: number; o1?: T1; };
			const obj1: T1 = { a: 1 }; // obj1 = { a: 1, o2: obj2 }
			const obj2: T2 = { b: 2 }; // obj2 = { b: 2, o1: obj1 }
			obj1.o2 = obj2;
			obj2.o1 = obj1;
			const cloned1 = deeplyClone(obj1);
			const cloned2 = deeplyClone(obj2);
			expect(cloned1).toEqual(obj1);
			expect(cloned2).toEqual(obj2);
			expect(obj1.o2).toBe(obj2);
			expect(cloned1).toBe(cloned1.o2?.o1);
			expect(cloned1.o2).not.toBe(obj2);
			expect(cloned1.o2).not.toBe(cloned2);
			expect(cloned1.o2).not.toBe(cloned2.o1?.o2);
			expect(cloned1.o2).toBe(cloned1.o2?.o1?.o2);
			expect(cloned1.o2?.o1).toBe(cloned1.o2?.o1?.o2?.o1);
		});

		it("should clone two deep cross referenced objects", () => {
			type T1 = { a: number; value: { o2?: T2; }; };
			type T2 = { b: number; value: { o1?: T1; }; };
			const obj1: T1 = { a: 1, value: {} }; // obj1 = { a: 1, value: { o2: obj2 } }
			const obj2: T2 = { b: 2, value: {} }; // obj2 = { b: 2, value: { o1: obj1 } }
			obj1.value.o2 = obj2;
			obj2.value.o1 = obj1;
			const cloned1 = deeplyClone(obj1);
			const cloned2 = deeplyClone(obj2);
			expect(cloned1).toEqual(obj1);
			expect(cloned2).toEqual(obj2);
			expect(cloned1).not.toBe(obj1);
			expect(cloned2).not.toBe(obj2);
			expect(cloned1).toBe(cloned1.value.o2?.value.o1);
			expect(cloned1.value.o2).not.toBe(obj2);
			expect(cloned1.value.o2).not.toBe(cloned2);
			expect(cloned1.value.o2).not.toBe(cloned2.value.o1?.value.o2);
			expect(cloned1.value.o2).toBe(cloned1.value.o2?.value.o1?.value.o2);
			expect(cloned1.value.o2?.value.o1).toBe(cloned1.value.o2?.value.o1?.value.o2?.value.o1);
		});

		it("should clone array with circular references", () => {
			const arr: any[] = [1, 2]; // arr = [1, 2, arr, [arr]]
			arr.push(arr);
			arr.push([arr]);
			const clonedArr = deeplyClone(arr);
			expect(clonedArr).toEqual(arr);
			expect(clonedArr).not.toBe(arr);
			expect(clonedArr).toBe(clonedArr[2]);
			expect(clonedArr).toBe(clonedArr[3][0]);
			expect(clonedArr).not.toBe(arr);
			expect(clonedArr).toEqual([1, 2, clonedArr, [clonedArr]]);
			expect(clonedArr[2]).toBe(clonedArr[3][0]);
		});

		it("should clone object with array with circular reference", () => {
			type A = [number, number, A?];
			const arr: A = [1, 2];
			arr.push(arr);
			type T = { x: number; a: A; y: number; o?: T; };
			const obj: T = {
				x: 1,
				a: arr,
				y: 2,
			};
			obj.o = obj;
			const clonedObj = deeplyClone(obj);
			expect(clonedObj).toEqual(obj);
			expect(clonedObj).not.toBe(obj);
			expect(clonedObj).toEqual({ x: 1, a: clonedObj.a, y: 2, o: clonedObj });
			expect(clonedObj).not.toBe(obj);
			expect(clonedObj.a).not.toBe(obj.a);
			expect(clonedObj.a).toBe(clonedObj.a[2]);
			expect(clonedObj.o).toBe(clonedObj);
		});

		it("should clone array with object with circular reference", () => {
			const arr: any[] = [1, 2];
			arr.push(arr);
			const obj: any = {
				x: 1,
			};
			obj.y = obj;
			arr.push(obj);
			const clonedArr = deeplyClone(arr);
			expect(clonedArr).not.toBe(arr);
			expect(clonedArr).toEqual(arr);
			expect(clonedArr[2]).not.toBe(arr[2]);
			expect(clonedArr[3]).not.toBe(arr[3]);
			expect(clonedArr[2]).toBe(clonedArr);
			expect(clonedArr[2]).toBe(clonedArr[2][2]);
			expect(clonedArr[3]).toBe(clonedArr[3].y);
		});

		it("should clone set with circular references", () => {
			const set = new Set<any>([1, 2, 3]);
			set.add(set);
			const obj: any = {
				x: 1,
			};
			obj.y = obj;
			set.add(obj);
			const clonedSet = deeplyClone(set);
			expect(clonedSet).not.toBe(set);
		});

		it("should clone map with circular references", () => {
			const map = new Map<any, any>([["a", 1], ["b", 2]]);
			map.set("m", map);
			const obj: any = {
				x: 1,
			};
			obj.y = obj;
			map.set(obj, obj);
			const clonedMap = deeplyClone(map);
			expect(clonedMap).toEqual(map);
			expect(clonedMap).not.toBe(map);
			expect(clonedMap.get("m")).toBe(clonedMap);
			expect(clonedMap.get("m").get("m")).toBe(clonedMap.get("m"));
		});
	});
});
