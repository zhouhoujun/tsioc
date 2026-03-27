import expect = require('expect');
import { isPlainObject, isTypeObject, isMetadataObject, isBaseObject } from '../src/utils/obj';
import { InjectToken, token } from '../src/tokens';

describe('Utils Object Functions', () => {

    describe('isPlainObject', () => {
        it('should return true for plain objects', () => {
            expect(isPlainObject({})).toBeTruthy();
            expect(isPlainObject({ a: 1, b: 2 })).toBeTruthy();
        });

        it('should return false for class instances', () => {
            class TestClass {}
            expect(isPlainObject(new TestClass())).toBeFalsy();
        });

        it('should return false for arrays', () => {
            expect(isPlainObject([])).toBeFalsy();
            expect(isPlainObject([1, 2, 3])).toBeFalsy();
        });

        it('should return false for built-in objects', () => {
            expect(isPlainObject(new Date())).toBeFalsy();
            expect(isPlainObject(new RegExp('test'))).toBeFalsy();
            expect(isPlainObject(new Map())).toBeFalsy();
        });

        it('should return false for primitives', () => {
            expect(isPlainObject(null)).toBeFalsy();
            expect(isPlainObject(undefined)).toBeFalsy();
            expect(isPlainObject(123)).toBeFalsy();
            expect(isPlainObject('string')).toBeFalsy();
        });
    });

    describe('isTypeObject', () => {
        it('should return true for custom class instances', () => {
            class CustomClass {
                constructor(public value: number) {}
            }
            expect(isTypeObject(new CustomClass(1))).toBeTruthy();
        });

        it('should return false for plain objects', () => {
            expect(isTypeObject({})).toBeFalsy();
            expect(isTypeObject({ a: 1 })).toBeFalsy();
        });

        it('should return false for InjectToken instances', () => {
            const testToken = new InjectToken('test');
            expect(isTypeObject(testToken)).toBeFalsy();
        });

        it('should return false for built-in objects', () => {
            expect(isTypeObject(new Date())).toBeFalsy();
        });

        it('should return false for primitives', () => {
            expect(isTypeObject(null)).toBeFalsy();
            expect(isTypeObject(undefined)).toBeFalsy();
            expect(isTypeObject(123)).toBeFalsy();
        });
    });

    describe('isMetadataObject', () => {
        it('should return true for plain objects', () => {
            expect(isMetadataObject({})).toBeTruthy();
            expect(isMetadataObject({ a: 1 })).toBeTruthy();
        });

        it('should return true when object has specified properties', () => {
            expect(isMetadataObject({ name: 'test' }, 'name')).toBeTruthy();
            expect(isMetadataObject({ a: 1, b: 2 }, 'a')).toBeTruthy();
            expect(isMetadataObject({ a: 1, b: 2 }, 'a', 'b')).toBeTruthy();
            expect(isMetadataObject({ a: 1, b: 2 }, ['a', 'c'])).toBeTruthy();
        });

        it('should return false when object does not have specified properties', () => {
            expect(isMetadataObject({ a: 1 }, 'b')).toBeFalsy();
            expect(isMetadataObject({}, 'name')).toBeFalsy();
            expect(isMetadataObject({ a: 1 }, 'b', 'c')).toBeFalsy();
        });

        it('should return false for non-objects', () => {
            expect(isMetadataObject(null, 'name')).toBeFalsy();
            expect(isMetadataObject(undefined, 'name')).toBeFalsy();
            expect(isMetadataObject('string', 'name')).toBeFalsy();
        });
    });

    describe('isBaseObject (deprecated alias)', () => {
        it('should work same as isPlainObject', () => {
            expect(isBaseObject({})).toBeTruthy();
            expect(isBaseObject({ a: 1 })).toBeTruthy();
            expect(isBaseObject(null)).toBeFalsy();
            expect(isBaseObject([])).toBeFalsy();
        });
    });
});