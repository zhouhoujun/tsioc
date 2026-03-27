import expect = require('expect');
import {
    isFunction, isString, isBoolean, isNumber, isBigInt, isUndefined, isNull, isNil,
    isDefined, isArray, isObject, hasOwn, hasProps, isDate, isSymbol, isRegExp,
    isPromise, isPromiseLike, isNodejsEnv, isProxy
} from '../src/utils/chk';

describe('Utils Check Functions', () => {

    describe('isFunction', () => {
        it('should return true for function', () => {
            expect(isFunction(() => {})).toBeTruthy();
            expect(isFunction(function() {})).toBeTruthy();
            expect(isFunction(Date)).toBeTruthy();
        });

        it('should return false for non-function', () => {
            expect(isFunction('string')).toBeFalsy();
            expect(isFunction(123)).toBeFalsy();
            expect(isFunction(null)).toBeFalsy();
            expect(isFunction(undefined)).toBeFalsy();
            expect(isFunction({})).toBeFalsy();
        });
    });

    describe('isString', () => {
        it('should return true for strings', () => {
            expect(isString('test')).toBeTruthy();
            expect(isString('')).toBeTruthy();
            expect(isString(`template`)).toBeTruthy();
        });

        it('should return false for non-strings', () => {
            expect(isString(123)).toBeFalsy();
            expect(isString(null)).toBeFalsy();
            expect(isString(undefined)).toBeFalsy();
            expect(isString({})).toBeFalsy();
        });
    });

    describe('isBoolean', () => {
        it('should return true for booleans', () => {
            expect(isBoolean(true)).toBeTruthy();
            expect(isBoolean(false)).toBeTruthy();
        });

        it('should return false for non-booleans', () => {
            expect(isBoolean(1)).toBeFalsy();
            expect(isBoolean(0)).toBeFalsy();
            expect(isBoolean('true')).toBeFalsy();
            expect(isBoolean(null)).toBeFalsy();
        });
    });

    describe('isNumber', () => {
        it('should return true for numbers', () => {
            expect(isNumber(123)).toBeTruthy();
            expect(isNumber(0)).toBeTruthy();
            expect(isNumber(-5)).toBeTruthy();
            expect(isNumber(3.14)).toBeTruthy();
            expect(isNumber(NaN)).toBeTruthy();
            expect(isNumber(Infinity)).toBeTruthy();
        });

        it('should return false for non-numbers', () => {
            expect(isNumber('123')).toBeFalsy();
            expect(isNumber(null)).toBeFalsy();
            expect(isNumber(undefined)).toBeFalsy();
        });
    });

    describe('isBigInt', () => {
        it('should return true for bigint', () => {
            expect(isBigInt(BigInt(123))).toBeTruthy();
            expect(isBigInt(123n)).toBeTruthy();
        });

        it('should return false for non-bigint', () => {
            expect(isBigInt(123)).toBeFalsy();
            expect(isBigInt('123')).toBeFalsy();
        });
    });

    describe('isUndefined', () => {
        it('should return true for undefined', () => {
            expect(isUndefined(undefined)).toBeTruthy();
        });

        it('should return false for non-undefined', () => {
            expect(isUndefined(null)).toBeFalsy();
            expect(isUndefined(0)).toBeFalsy();
            expect(isUndefined('')).toBeFalsy();
        });
    });

    describe('isNull', () => {
        it('should return true for null', () => {
            expect(isNull(null)).toBeTruthy();
        });

        it('should return false for non-null', () => {
            expect(isNull(undefined)).toBeFalsy();
            expect(isNull(0)).toBeFalsy();
            expect(isNull('')).toBeFalsy();
        });
    });

    describe('isNil', () => {
        it('should return true for null or undefined', () => {
            expect(isNil(null)).toBeTruthy();
            expect(isNil(undefined)).toBeTruthy();
        });

        it('should return false for non-nil values', () => {
            expect(isNil(0)).toBeFalsy();
            expect(isNil('')).toBeFalsy();
            expect(isNil(false)).toBeFalsy();
        });
    });

    describe('isDefined', () => {
        it('should return true for defined values', () => {
            expect(isDefined(0)).toBeTruthy();
            expect(isDefined('')).toBeTruthy();
            expect(isDefined(false)).toBeTruthy();
            expect(isDefined(null)).toBeFalsy();
            expect(isDefined(undefined)).toBeFalsy();
        });
    });

    describe('isArray', () => {
        it('should return true for arrays', () => {
            expect(isArray([])).toBeTruthy();
            expect(isArray([1, 2, 3])).toBeTruthy();
            expect(isArray(new Array())).toBeTruthy();
        });

        it('should return false for non-arrays', () => {
            expect(isArray({})).toBeFalsy();
            expect(isArray('array')).toBeFalsy();
            expect(isArray(null)).toBeFalsy();
        });
    });

    describe('isObject', () => {
        it('should return true for objects', () => {
            expect(isObject({})).toBeTruthy();
            expect(isObject(new Date())).toBeTruthy();
            expect(isObject([])).toBeTruthy();
        });

        it('should return false for non-objects', () => {
            expect(isObject(null)).toBeFalsy();
            expect(isObject(undefined)).toBeFalsy();
            expect(isObject('string')).toBeFalsy();
            expect(isObject(123)).toBeFalsy();
        });
    });

    describe('hasOwn', () => {
        it('should return true for own properties', () => {
            const obj = { a: 1 };
            expect(hasOwn(obj, 'a')).toBeTruthy();
        });

        it('should return false for inherited properties', () => {
            const obj = Object.create({ inherited: 1 });
            expect(hasOwn(obj, 'inherited')).toBeFalsy();
        });

        it('should return false for non-existent properties', () => {
            const obj = { a: 1 };
            expect(hasOwn(obj, 'b')).toBeFalsy();
        });
    });

    describe('hasProps', () => {
        it('should return true for objects with properties', () => {
            expect(hasProps({ a: 1 })).toBeTruthy();
        });

        it('should return false for empty objects', () => {
            expect(hasProps({})).toBeFalsy();
        });

        it('should return false for non-objects', () => {
            expect(hasProps(null)).toBeFalsy();
            expect(hasProps('string')).toBeFalsy();
        });
    });

    describe('isDate', () => {
        it('should return true for dates', () => {
            expect(isDate(new Date())).toBeTruthy();
            expect(isDate(new Date('2021-01-01'))).toBeTruthy();
        });

        it('should return false for non-dates', () => {
            expect(isDate('2021-01-01')).toBeFalsy();
            expect(isDate(1609459200000)).toBeFalsy();
            expect(isDate(null)).toBeFalsy();
        });
    });

    describe('isSymbol', () => {
        it('should return true for symbols', () => {
            expect(isSymbol(Symbol())).toBeTruthy();
            expect(isSymbol(Symbol('test'))).toBeTruthy();
        });

        it('should return false for non-symbols', () => {
            expect(isSymbol('symbol')).toBeFalsy();
            expect(isSymbol(null)).toBeFalsy();
        });
    });

    describe('isRegExp', () => {
        it('should return true for regex', () => {
            expect(isRegExp(/test/)).toBeTruthy();
            expect(isRegExp(new RegExp('test'))).toBeTruthy();
        });

        it('should return false for non-regex', () => {
            expect(isRegExp('/test/')).toBeFalsy();
            expect(isRegExp(null)).toBeFalsy();
        });
    });

    describe('isPromise', () => {
        it('should return true for promises', () => {
            expect(isPromise(Promise.resolve())).toBeTruthy();
            expect(isPromise(new Promise(() => {}))).toBeTruthy();
        });

        it('should return false for non-promises', () => {
            expect(isPromise({ then: () => {} })).toBeFalsy();
            expect(isPromise(null)).toBeFalsy();
        });
    });

    describe('isPromiseLike', () => {
        it('should return true for promise-like objects', () => {
            expect(isPromiseLike(Promise.resolve())).toBeTruthy();
            expect(isPromiseLike({ then: () => {}, catch: () => {} })).toBeTruthy();
        });

        it('should return false for non-promise-like', () => {
            expect(isPromiseLike({})).toBeFalsy();
            expect(isPromiseLike(null)).toBeFalsy();
        });
    });

    describe('isNodejsEnv', () => {
        it('should return boolean', () => {
            expect(typeof isNodejsEnv()).toBe('boolean');
        });
    });

    describe('isProxy', () => {
        it('should return false for non-proxy objects', () => {
            expect(isProxy({})).toBeFalsy();
            expect(isProxy({ a: 1 })).toBeFalsy();
        });
    });
});