import expect = require('expect');
import { stringify, concatStringsWithSpace, renderStringify, stringifyForError } from '../src/util/stringify';

describe('Stringify Utilities', () => {

    describe('stringify', () => {
        it('should return string as is', () => {
            expect(stringify('hello')).toBe('hello');
        });

        it('should stringify array', () => {
            expect(stringify(['a', 'b'])).toBe('[a, b]');
        });

        it('should stringify nested array', () => {
            expect(stringify([['a', 'b'], 'c'])).toBe('[[a, b], c]');
        });

        it('should stringify null', () => {
            expect(stringify(null)).toBe('null');
        });

        it('should stringify undefined', () => {
            expect(stringify(undefined)).toBe('undefined');
        });

        it('should return name property if exists', () => {
            const obj = { name: 'TestObject' };
            expect(stringify(obj)).toBe('TestObject');
        });

        it('should return overriddenName if exists', () => {
            const obj = { overriddenName: 'OverriddenName' };
            expect(stringify(obj)).toBe('OverriddenName');
        });

        it('should prefer overriddenName over name', () => {
            const obj = { name: 'Name', overriddenName: 'Overridden' };
            expect(stringify(obj)).toBe('Overridden');
        });

        it('should use toString if no name', () => {
            const obj = { toString: () => 'custom string' };
            expect(stringify(obj)).toBe('custom string');
        });

        it('should truncate at newline', () => {
            const obj = { toString: () => 'line1\nline2' };
            expect(stringify(obj)).toBe('line1');
        });

        it('should handle class with name', () => {
            class TestClass {}
            expect(stringify(TestClass)).toBe('TestClass');
        });

        it('should handle function with name', () => {
            function testFunction() {}
            expect(stringify(testFunction)).toBe('testFunction');
        });
    });

    describe('concatStringsWithSpace', () => {
        it('should concatenate two strings with space', () => {
            expect(concatStringsWithSpace('hello', 'world')).toBe('hello world');
        });

        it('should return after when before is null', () => {
            expect(concatStringsWithSpace(null, 'world')).toBe('world');
        });

        it('should return after when before is empty', () => {
            expect(concatStringsWithSpace('', 'world')).toBe('world');
        });

        it('should return before when after is null', () => {
            expect(concatStringsWithSpace('hello', null)).toBe('hello');
        });

        it('should return before when after is empty', () => {
            expect(concatStringsWithSpace('hello', '')).toBe('hello');
        });

        it('should return empty string when both are null', () => {
            expect(concatStringsWithSpace(null, null)).toBe('');
        });

        it('should return first string when both are empty', () => {
            expect(concatStringsWithSpace('', '')).toBe('');
        });
    });

    describe('renderStringify', () => {
        it('should return string as is', () => {
            expect(renderStringify('test')).toBe('test');
        });

        it('should return empty string for null', () => {
            expect(renderStringify(null)).toBe('');
        });

        it('should return empty string for undefined', () => {
            expect(renderStringify(undefined)).toBe('');
        });

        it('should stringify numbers', () => {
            expect(renderStringify(123)).toBe('123');
        });

        it('should stringify booleans', () => {
            expect(renderStringify(true)).toBe('true');
            expect(renderStringify(false)).toBe('false');
        });

        it('should stringify objects using String()', () => {
            expect(renderStringify({})).toBe('[object Object]');
        });
    });

    describe('stringifyForError', () => {
        it('should return function name', () => {
            function myFunc() {}
            expect(stringifyForError(myFunc)).toBe('myFunc');
        });

        it('should use toString if no name', () => {
            const fn = function() {};
            const result = stringifyForError(fn);
            expect(result).toContain('function');
        });

        it('should handle object with type function', () => {
            class MyType {}
            const obj = { type: MyType };
            expect(stringifyForError(obj)).toBe('MyType');
        });

        it('should use renderStringify for other values', () => {
            expect(stringifyForError('string')).toBe('string');
            expect(stringifyForError(123)).toBe('123');
            expect(stringifyForError(null)).toBe('');
        });
    });
});