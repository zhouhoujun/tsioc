import { Execption } from '@tsdi/ioc';



export function throwError(msg: string): never;
export function throwError(msg: string, actual: any, expected: any, comparison: string): never;
export function throwError(msg: string, actual?: any, expected?: any, comparison?: string): never {
    throw new Execption(
        `ASSERTION ERROR: ${msg}` +
        (comparison == null ? '' : ` [Expected=> ${expected} ${comparison} ${actual} <=Actual]`));
}

export function assertNumber(actual: any, msg: string): asserts actual is number {
    if (!(typeof actual === 'number')) {
        throwError(msg, typeof actual, 'number', '===');
    }
}


export function assertNumberInRange(
    actual: any, minInclusive: number, maxInclusive: number): asserts actual is number {
    assertNumber(actual, 'Expected a number');
    assertLessThanOrEqual(actual, maxInclusive, 'Expected number to be less than or equal to');
    assertGreaterThanOrEqual(actual, minInclusive, 'Expected number to be greater than or equal to');
}

export function assertString(actual: any, msg: string): asserts actual is string {
    if (!(typeof actual === 'string')) {
        throwError(msg, actual === null ? 'null' : typeof actual, 'string', '===');
    }
}

export function assertFunction(actual: any, msg: string): asserts actual is Function {
    if (!(typeof actual === 'function')) {
        throwError(msg, actual === null ? 'null' : typeof actual, 'function', '===');
    }
}


export function assertEqual<T>(actual: T, expected: T, msg: string) {
    if (!(actual == expected)) {
        throwError(msg, actual, expected, '==');
    }
}

export function assertNotEqual<T>(actual: T, expected: T, msg: string): asserts actual is T {
    if (!(actual != expected)) {
        throwError(msg, actual, expected, '!=');
    }
}
export function assertNotDefined<T>(actual: T, msg: string) {
    if (actual != null) {
        throwError(msg, actual, null, '==');
    }
}

export function assertDefined<T>(actual: T | null | undefined, msg: string): asserts actual is T {
    if (actual == null) {
        throwError(msg, actual, null, '!=');
    }
}

export function assertIndexInRange(arr: any[], index: number) {
    assertDefined(arr, 'Array must be defined.');
    const maxLen = arr.length;
    if (index < 0 || index >= maxLen) {
        throwError(`Index expected to be less than ${maxLen} but got ${index}`);
    }
}

export function assertLessThan<T>(actual: T, expected: T, msg: string): asserts actual is T {
    if (!(actual < expected)) {
        throwError(msg, actual, expected, '<');
    }
}

export function assertLessThanOrEqual<T>(actual: T, expected: T, msg: string): asserts actual is T {
    if (!(actual <= expected)) {
        throwError(msg, actual, expected, '<=');
    }
}

export function assertGreaterThan<T>(actual: T, expected: T, msg: string): asserts actual is T {
    if (!(actual > expected)) {
        throwError(msg, actual, expected, '>');
    }
}

export function assertGreaterThanOrEqual<T>(
    actual: T, expected: T, msg: string): asserts actual is T {
    if (!(actual >= expected)) {
        throwError(msg, actual, expected, '>=');
    }
}
