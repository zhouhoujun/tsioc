import { lang, Injectable, isNull, isUndefined, isString, isRegExp, InjectToken, Singleton, IContainer, Inject, ContainerToken } from '@ts-ioc/core';


/**
 * assertion error options.
 *
 * @export
 * @interface IAssertionOptions
 */
export interface IAssertionOptions {
    message?: string;
    actual?: any;
    expected?: any;
    operator?: string;
    stackStartFn?: Function;
    stackStartFunction?: Function;
}

/**
 * Assertion Error interface.
 *
 * @export
 * @interface IAssertionError
 * @extends {Error}
 */
export interface IAssertionError extends Error {
    name: string;
    message: string;
    actual: any;
    expected: any;
    operator: string;
    generatedMessage: boolean;
}

/**
 * assert error `actual` param token.
 */
export const AssertionOptionsToken = new InjectToken<IAssertionOptions>('AssertionOptions');

/**
 * Assert error formator token.
 */
export const AssertionErrorToken = new InjectToken<IAssertionError>('AssertionError');

/**
 * assert error.
 *
 * @export
 * @class AssertError
 * @extends {Error}
 */
export class AssertError implements IAssertionError {
    actual: any;
    expected: any;
    operator: string;
    generatedMessage: boolean;

    name = 'AssertError';
    message: string;
    stack: string;
    constructor(@Inject(AssertionOptionsToken) protected options?: IAssertionOptions) {
        let stackTarge: Function;
        if (options) {
            this.actual = options.actual;
            this.expected = options.expected;
            this.operator = options.operator;
            if (this.operator) {
                this.message = `Expected ['${lang.getClassName(options.actual)}'] ${options.actual} ${options.operator || ''} ['${lang.getClassName(options.expected)}'] ${options.expected} ${options.message || ''}.`
            } else {
                this.message = options.message;
            }
            stackTarge = options.stackStartFn;
        }

        stackTarge = stackTarge || AssertError;
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, stackTarge);
        } else {
            try {
                throw new Error();
            } catch (e) {
                this.stack = e.stack;
            }
        }
    }

    toString() {
        return `Error: ${this.message || ''}\n${this.stack}`;
    }
}

export const RunCaseToken = new InjectToken<Function>('runCase');
export const RunSuiteToken = new InjectToken<any>('runSuite');

/**
 * unit test assert.
 *
 * @export
 * @class Assert
 */
@Injectable
export class Assert {
    @Inject(ContainerToken)
    container: IContainer;

    constructor(@Inject(RunSuiteToken) public testSuite: any, @Inject(RunCaseToken) public testCase: Function) {
    }

    /**
     * check actual value is equal to expected value
     *
     * @param {any} actual
     * @param {any} expected
     * @param {string} [message]
     * @memberof Assert
     */
    eq(actual: any, expected: any, message?: string | Error) {
        if (actual !== expected) {
            let err = this.container.resolve(
                AssertionErrorToken,
                {
                    provide: AssertionOptionsToken,
                    useValue: { actual: actual, expected: expected, message: message, operator: '==', stackStartFn: this.testCase  }
                },
            );
            throw err;
        }
    }

    /**
     * check actual value is equal to expected value
     *
     * @export

     * @param {any} actual
     * @param {any} expected
     * @param {string} [message]
     */
    equal(actual: any, expected: any, message?: string | Error) {
        this.eq(actual, expected, message);
    }

    /**
     * check actual value is not equal to expected value.
     *
     * @export

     * @param {any} actual
     * @param {any} expected
     * @param {string} [message]
     */
    notEqual(actual: any, expected: any, message?: string | Error) {
        if (actual === expected) {
            let err = this.container.resolve(
                AssertionErrorToken,
                {
                    provide: AssertionOptionsToken,
                    useValue: { actual: actual, expected: expected, message: message, operator: '!=', stackStartFn: this.testCase }
                },
            );
            throw err;
        }
    }

    /**
     * check the actual value to be within a specified precision of the expected value.
     *
     * @param {number} actual
     * @param {number} expected
     * @param {number} [precision]
     * @param {string} [message]
     * @memberof Assert
     */
    beCloseTo(actual: number, expected: number, precision?: number, message?: string | Error) {
        if (precision !== 0) {
            precision = precision || 2;
        }
        if (expected === null || actual === null) {
            throw new Error('Cannot use toBeCloseTo with null. Arguments evaluated to: ' +
                'expect(' + actual + ').toBeCloseTo(' + expected + ').'
            );
        }
        let pow = Math.pow(10, precision + 1);
        let delta = Math.abs(expected - actual);
        let maxDelta = Math.pow(10, -precision) / 2;
        if (Math.round(delta * pow) / pow > maxDelta) {
            let err = this.container.resolve(
                AssertionErrorToken,
                {
                    provide: AssertionOptionsToken,
                    useValue: { actual: actual, expected: expected, message: message, operator: '~=', stackStartFn: this.testCase }
                },
            );
            throw err;
        }
    }

    /**
     * check actual value less than expected value.
     *

     * @param {any} actual
     * @param {any} expected
     * @param {string} [message]
     * @memberof Assert
     */
    lt(actual: any, expected: any, message?: string | Error) {
        if (actual >= expected) {
            let err = this.container.resolve(
                AssertionErrorToken,
                {
                    provide: AssertionOptionsToken,
                    useValue: { actual: actual, expected: expected, message: message, operator: '<', stackStartFn: this.testCase }
                },
            );
            throw err;
        }
    }

    /**
     * check the actual value to be less than or equal to the expected value
     *

     * @param {any} actual
     * @param {any} expected
     * @param {string} [message]
     * @memberof Assert
     */
    le(actual: any, expected: any, message?: string | Error) {
        if (actual > expected) {
            let err = this.container.resolve(
                AssertionErrorToken,
                {
                    provide: AssertionOptionsToken,
                    useValue: { actual: actual, expected: expected, message: message, operator: '<=', stackStartFn: this.testCase }
                },
            );
            throw err;
        }
    }

    /**
     * check the actual value greater than expected value.
     *

     * @param {any} actual
     * @param {any} expected
     * @param {string} [message]
     * @memberof Assert
     */
    gt(actual: any, expected: any, message?: string | Error) {
        if (actual <= expected) {
            let err = this.container.resolve(
                AssertionErrorToken,
                {
                    provide: AssertionOptionsToken,
                    useValue: { actual: actual, expected: expected, message: message, operator: '>', stackStartFn: this.testCase }
                },
            );
            throw err;
        }
    }

    /**
     * check the actual value to be greater than or equal to the expected value.
     *

     * @param {any} actual
     * @param {any} expected
     * @param {string} [message]
     * @memberof Assert
     */
    ge(actual: any, expected: any, message?: string | Error) {
        if (actual < expected) {
            let err = this.container.resolve(
                AssertionErrorToken,
                {
                    provide: AssertionOptionsToken,
                    useValue: { actual: actual, expected: expected, message: message, operator: '>=', stackStartFn: this.testCase }
                },
            );
            throw err;
        }
    }


    beNaN(actual: any, message?: string | Error) {
        if (!isNaN(actual)) {
            let err = this.container.resolve(
                AssertionErrorToken,
                {
                    provide: AssertionOptionsToken,
                    useValue: { actual: actual, expected: 'NaN', message: message, operator: 'to be', stackStartFn: this.testCase }
                },
            );
            throw err;
        }
    }

    beNull(actual: any, message?: string | Error) {
        if (!isNull(actual)) {
            let err = this.container.resolve(
                AssertionErrorToken,
                {
                    provide: AssertionOptionsToken,
                    useValue: { actual: actual, expected: 'null', message: message, operator: 'to be', stackStartFn: this.testCase }
                },
            );
            throw err;
        }
    }


    beDefined(actual: any, message?: string | Error) {
        if (isUndefined(actual)) {
            let err = this.container.resolve(
                AssertionErrorToken,
                {
                    provide: AssertionOptionsToken,
                    useValue: { actual: actual, expected: 'undefined', message: message, operator: 'not to be', stackStartFn: this.testCase }
                },
            );
            throw err;
        }
    }

    beUndefined(actual: any, message?: string | Error) {
        if (!isUndefined(actual)) {
            let err = this.container.resolve(
                AssertionErrorToken,
                {
                    provide: AssertionOptionsToken,
                    useValue: { actual: actual, expected: 'undefined', message: message, operator: 'to be', stackStartFn: this.testCase }
                },
            );
            throw err;
        }
    }

    /**
     * the actual value to be falsy.
     *
     * @param {*} actual
     * @param {string} [message]
     * @memberof Assert
     */
    beFalsy(actual: any, message?: string | Error) {
        if (!!!actual) {
            let err = this.container.resolve(
                AssertionErrorToken,
                {
                    provide: AssertionOptionsToken,
                    useValue: { actual: actual, expected: 'falsy', message: message, operator: 'to be', stackStartFn: this.testCase }
                },
            );
            throw err;
        }
    }

    /**
     * the actual value to be truthy.
     *
     * @param {*} actual
     * @param {string} [message]
     * @memberof Assert
     */
    beTruthy(actual: any, message?: string | Error) {
        if (!!actual) {
            let err = this.container.resolve(
                AssertionErrorToken,
                {
                    provide: AssertionOptionsToken,
                    useValue: { actual: actual, expected: 'truthy', message: message, operator: 'to be', stackStartFn: this.testCase }
                },
            );
            throw err;
        }
    }

    /**
     * the actual value to be `-Infinity` (-infinity).
     *
     * @param {number} actual
     * @param {string} [message]
     * @memberof Assert
     */
    beNegativeInfinity(actual: number, message?: string | Error) {
        if (actual !== Number.NEGATIVE_INFINITY) {
            let err = this.container.resolve(
                AssertionErrorToken,
                {
                    provide: AssertionOptionsToken,
                    useValue: { actual: actual, expected: '-Infinity', message: message, operator: 'to be', stackStartFn: this.testCase }
                },
            );
            throw err;
        }
    }

    /**
     * the actual value to be `Infinity` (infinity).
     *
     * @param {number} actual
     * @param {string} [message]
     * @memberof Assert
     */
    bePositiveInfinity(actual: number, message?: string | Error) {
        if (actual !== Number.POSITIVE_INFINITY) {
            let err = this.container.resolve(
                AssertionErrorToken,
                {
                    provide: AssertionOptionsToken,
                    useValue: { actual: actual, expected: 'Infinity', message: message, operator: 'to be', stackStartFn: this.testCase }
                },
            );
            throw err;
        }
    }

    /**
     * the actual value to match a regular expression
     *
     * @param {string} actual
     * @param {(string | RegExp)} expected
     * @param {string} [message]
     * @memberof Assert
     */
    match(actual: string, expected: string | RegExp, message?: string | Error) {
        if (!isString(expected) && !isRegExp(expected)) {
            throw new Error('Expected is not a String or a RegExp');
        }
        if (!(isString(actual) && new RegExp(expected).test(actual))) {
            let err = this.container.resolve(
                AssertionErrorToken,
                {
                    provide: AssertionOptionsToken,
                    useValue: { actual: actual, expected: expected, message: message, operator: 'match', stackStartFn: this.testCase }
                },
            );
            throw err;
        }
    }
}

export interface IAssertMatch<T> {
    toBe(expected: any, expectationFailOutput?: string | Error): Promise<void>;
    toEqual(expected: any, expectationFailOutput?: any): Promise<void>;
    toMatch(expected: string | RegExp | Promise<string | RegExp>, expectationFailOutput?: any): Promise<void>;
    toBeDefined(expectationFailOutput?: any): Promise<void>;
    toBeUndefined(expectationFailOutput?: any): Promise<void>;
    toBeNull(expectationFailOutput?: any): Promise<void>;
    toBeNaN(): Promise<void>;
    toBeTruthy(expectationFailOutput?: any): Promise<void>;
    toBeFalsy(expectationFailOutput?: any): Promise<void>;
    toHaveBeenCalled(): Promise<void>;
    toHaveBeenCalledWith(...params: any[]): Promise<void>;
    toHaveBeenCalledTimes(expected: number | Promise<number>): Promise<void>;
    toContain(expected: any, expectationFailOutput?: any): Promise<void>;
    toBeLessThan(expected: number | Promise<number>, expectationFailOutput?: any): Promise<void>;
    toBeLessThanOrEqual(expected: number | Promise<number>, expectationFailOutput?: any): Promise<void>;
    toBeGreaterThan(expected: number | Promise<number>, expectationFailOutput?: any): Promise<void>;
    toBeGreaterThanOrEqual(expected: number | Promise<number>, expectationFailOutput?: any): Promise<void>;
    toBeCloseTo(expected: number | Promise<number>, precision?: any, expectationFailOutput?: any): Promise<void>;
    toThrow(expected?: any): Promise<void>;
    toThrowError(message?: string | Error | RegExp | Promise<string | RegExp>): Promise<void>;
    toThrowError(expected?: new (...args: any[]) => Error | Promise<new (...args: any[]) => Error>, message?: string | Error | RegExp | Promise<string | RegExp>): Promise<void>;
}

// export function expect(target: any, message?: string | Error): IAssertMatch<any> {

// }
