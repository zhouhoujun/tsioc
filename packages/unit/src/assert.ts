import { lang } from '@ts-ioc/core';

/**
 * unit test assert.
 */
export namespace Assert {

    export class AssertError extends Error {
        constructor(protected actual, protected expected, message?: string, protected operator?: string) {
            super(message);
            this.stack = `['${lang.getClassName(actual)}'] ${actual} ${operator || ''} ['${lang.getClassName(expected)}'] ${expected} ${message || ''}`
        }
    }

    /**
     * is equai
     *
     * @export
     * @template T
     * @param {T} actual
     * @param {T} expected
     */
    export function eq<T>(actual: T, expected: T, message?: string) {
        if (actual !== expected) {
            throw new AssertError(actual, expected, message, '==')
        }
    }

    /**
     * check actual is equal to expected
     *
     * @export
     * @template T
     * @param {T} actual
     * @param {T} expected
     * @param {string} [message]
     */
    export function equal<T>(actual: T, expected: T, message?: string) {
        eq(actual, expected, message);
    }

    /**
     * check actual is not equal to expected.
     *
     * @export
     * @template T
     * @param {T} actual
     * @param {T} expected
     * @param {string} [message]
     */
    export function notEqual<T>(actual: T, expected: T, message?: string) {
        if (actual === expected) {
            throw new AssertError(actual, expected, message, '!=');
        }
    }
}
