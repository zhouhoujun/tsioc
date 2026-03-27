import expect = require('expect');
import { assign, omit, pick, forIn, defer, delay, getTypes, getTypeChain, getParentType, hasItem, isBaseOf } from '../src/utils/lang';
import { getTypeName, isBasicType } from '../src/metadata/type';

describe('Utils Lang Functions', () => {

    describe('assign', () => {
        it('should assign properties from source to target', () => {
            const target = { a: 1 };
            const source = { b: 2 };
            assign(target, source);
            expect(target).toEqual({ a: 1, b: 2 });
        });

        it('should return target object', () => {
            const target = {};
            const result = assign(target, { a: 1 });
            expect(result).toBe(target);
        });

        it('should exclude specified fields', () => {
            const target = { a: 1 };
            const source = { b: 2, c: 3 };
            assign(target, source, 'c');
            expect(target).toEqual({ a: 1, b: 2 });
        });

        it('should return null if target or source is null', () => {
            expect(assign(null, {})).toBeNull();
            expect(assign({}, null)).toBeNull();
        });
    });

    describe('omit', () => {
        it('should create object without excluded fields', () => {
            const result = omit({ a: 1, b: 2, c: 3 }, 'b', 'c');
            expect(result).toEqual({ a: 1 });
        });

        it('should return null if target is null', () => {
            expect(omit(null, 'a')).toBeNull();
        });
    });

    describe('pick', () => {
        it('should create object with only picked fields', () => {
            const result = pick({ a: 1, b: 2, c: 3 }, 'a', 'b');
            expect(result).toEqual({ a: 1, b: 2 });
        });

        it('should skip undefined fields', () => {
            const result = pick({ a: 1, b: undefined, c: 3 }, 'a', 'b');
            expect(result).toEqual({ a: 1 });
        });
    });

    describe('forIn', () => {
        it('should iterate over object properties', () => {
            const obj = { a: 1, b: 2 };
            const keys: string[] = [];
            const values: number[] = [];
            forIn(obj, (value, key) => {
                keys.push(key);
                values.push(value);
            });
            expect(keys).toEqual(['a', 'b']);
            expect(values).toEqual([1, 2]);
        });

        it('should iterate over array elements', () => {
            const arr = [1, 2, 3];
            const values: number[] = [];
            forIn(arr, (value) => {
                values.push(value);
            });
            expect(values).toEqual([1, 2, 3]);
        });

        it('should break on false return', () => {
            const obj = { a: 1, b: 2, c: 3 };
            const keys: string[] = [];
            forIn(obj, (value, key) => {
                keys.push(key);
                if (key === 'b') return false;
            });
            expect(keys).toEqual(['a', 'b']);
        });

        it('should do nothing for null/undefined', () => {
            let called = false;
            forIn(null as any, () => { called = true; });
            expect(called).toBeFalsy();
        });
    });

    describe('defer', () => {
        it('should create a deferred promise', () => {
            const d = defer<string>();
            expect(d.promise).toBeInstanceOf(Promise);
        });

        it('should resolve with value', async () => {
            const d = defer<string>();
            d.resolve('test');
            const result = await d.promise;
            expect(result).toBe('test');
        });

        it('should reject with error', async () => {
            const d = defer<string>();
            d.reject(new Error('test error'));
            try {
                await d.promise;
                throw new Error('Expected promise to reject');
            } catch (err) {
                expect((err as Error).message).toBe('test error');
            }
        });
    });

    describe('delay', () => {
        it('should delay execution', async () => {
            const start = Date.now();
            await delay(50);
            const elapsed = Date.now() - start;
            expect(elapsed).toBeGreaterThanOrEqual(40);
        });

        it('should return a promise', () => {
            expect(delay(10)).toBeInstanceOf(Promise);
        });
    });

    describe('getTypes', () => {
        it('should extract types from array', () => {
            class A {}
            class B {}
            const result = getTypes([A, B]);
            expect(result).toEqual([A, B]);
        });

        it('should handle nested arrays', () => {
            class A {}
            class B {}
            class C {}
            const result = getTypes([[A, B], C]);
            expect(result).toEqual([A, B, C]);
        });

        it('should handle single type', () => {
            class A {}
            const result = getTypes(A);
            expect(result).toEqual([A]);
        });

        it('should return empty array for null/undefined', () => {
            expect(getTypes(null as any)).toEqual([]);
            expect(getTypes(undefined as any)).toEqual([]);
        });
    });

    describe('getTypeChain', () => {
        it('should return type chain', () => {
            class Parent {}
            class Child extends Parent {}
            const chain = getTypeChain(Child);
            expect(chain.length).toBeGreaterThan(0);
            expect(chain[0]).toBe(Child);
        });
    });

    describe('getParentType', () => {
        it('should return parent type', () => {
            class Parent {}
            class Child extends Parent {}
            const parent = getParentType(Child);
            expect(parent).toBe(Parent);
        });
    });

    describe('hasItem', () => {
        it('should return true for non-empty array', () => {
            expect(hasItem([1, 2, 3])).toBeTruthy();
        });

        it('should return false for empty array', () => {
            expect(hasItem([])).toBeFalsy();
        });

        it('should return false for non-array', () => {
            expect(hasItem(null)).toBeFalsy();
            expect(hasItem({})).toBeFalsy();
        });
    });

    describe('isBaseOf', () => {
        it('should return true for subclass', () => {
            class Parent {}
            class Child extends Parent {}
            expect(isBaseOf(Child, Parent)).toBeTruthy();
        });

        it('should return false for unrelated classes', () => {
            class A {}
            class B {}
            expect(isBaseOf(B, A)).toBeFalsy();
        });
    });
});

describe('Metadata Type Functions', () => {

    describe('getTypeName', () => {
        it('should return type name for class', () => {
            class TestClass {}
            expect(getTypeName(TestClass)).toBe('TestClass');
        });

        it('should return type name for function', () => {
            function testFunc() {}
            expect(getTypeName(testFunc)).toBe('testFunc');
        });
    });

    describe('isBaseType', () => {
        it('should return true for string', () => {
            expect(isBasicType(String)).toBeTruthy();
        });
    });
});