import expect = require('expect');
import { isToken } from '../src/utils/token';
import { InjectToken, token } from '../src/tokens';

describe('Utils Token Functions', () => {

    describe('isToken', () => {
        it('should return true for string token', () => {
            expect(isToken('myToken')).toBeTruthy();
        });

        it('should return true for class constructor', () => {
            class TestClass {}
            expect(isToken(TestClass)).toBeTruthy();
        });

        it('should return true for InjectToken instance', () => {
            const tk = new InjectToken('test');
            expect(isToken(tk)).toBeTruthy();
        });

        it('should return true for token created by factory', () => {
            const tk = token('test');
            expect(isToken(tk)).toBeTruthy();
        });

        it('should return false for null', () => {
            expect(isToken(null)).toBeFalsy();
        });

        it('should return false for undefined', () => {
            expect(isToken(undefined)).toBeFalsy();
        });

        it('should return false for number', () => {
            expect(isToken(123)).toBeFalsy();
        });

        it('should return false for plain object', () => {
            expect(isToken({})).toBeFalsy();
        });

        it('should return false for array', () => {
            expect(isToken([])).toBeFalsy();
        });

        it('should return false for function without prototype', () => {
            const arrowFn = () => {};
            expect(isToken(arrowFn)).toBeFalsy();
        });

        it('should return true for abstract class', () => {
            abstract class AbstractClass {}
            expect(isToken(AbstractClass)).toBeTruthy();
        });

        it('should return true for interface-like class', () => {
            class Service {}
            expect(isToken(Service)).toBeTruthy();
        });
    });
});