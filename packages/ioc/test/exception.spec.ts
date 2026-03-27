import expect = require('expect');
import { Exception, ArgumentException, TypeException } from '../src/exception';

describe('Exception Classes', () => {

    describe('Exception', () => {
        it('should create exception with message', () => {
            const ex = new Exception('test error');
            expect(ex.message).toBe('test error');
            expect(ex.name).toBe('Exception');
        });

        it('should create exception with message and code', () => {
            const ex = new Exception('test error', 'ERR001');
            expect(ex.message).toBe('test error');
            expect(ex.code).toBe('ERR001');
        });

        it('should be instance of Error', () => {
            const ex = new Exception('test');
            expect(ex).toBeInstanceOf(Error);
        });

        it('should have correct prototype chain', () => {
            const ex = new Exception('test');
            expect(Object.getPrototypeOf(ex)).toBe(Exception.prototype);
        });
    });

    describe('ArgumentException', () => {
        it('should create with string message', () => {
            const ex = new ArgumentException('invalid argument');
            expect(ex.message).toBe('invalid argument');
            expect(ex.name).toBe('ArgumentException');
        });

        it('should create with array of messages', () => {
            const ex = new ArgumentException(['error1', 'error2']);
            expect(ex.message).toBe('error1\nerror2');
        });

        it('should create with no message', () => {
            const ex = new ArgumentException();
            expect(ex.message).toBe('');
        });

        it('should be instance of Exception', () => {
            const ex = new ArgumentException('test');
            expect(ex).toBeInstanceOf(Exception);
        });
    });

    describe('TypeException', () => {
        it('should create with message', () => {
            const ex = new TypeException('invalid type');
            expect(ex.message).toBe('TypeException: invalid type');
        });

        it('should create without message', () => {
            const ex = new TypeException();
            expect(ex.message).toBe('TypeException');
        });

        it('should be instance of Exception', () => {
            const ex = new TypeException('test');
            expect(ex).toBeInstanceOf(Exception);
        });
    });
});