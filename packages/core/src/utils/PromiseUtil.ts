import { isFunction } from './typeCheck';
import { Express } from '../types';

/**
 * defer
 *
 * @export
 * @class Defer
 * @template T
 */
export class Defer<T> {
    static create<T>(then?: (val: T) => T | PromiseLike<T>): Defer<T> {
        let defer = new Defer<T>();
        if (then) {
            defer.promise = defer.promise.then(then);
            return defer;
        } else {
            return defer;
        }
    }
    /**
     * promise.
     *
     * @type {Promise<T>}
     * @memberof Defer
     */
    promise: Promise<T>
    /**
     * resolve.
     *
     * @memberof Defer
     */
    resolve: (value?: T | PromiseLike<T>) => void;
    /**
     * reject.
     *
     * @memberof Defer
     */
    reject: (reason?: any) => void;

    constructor() {
        this.promise = new Promise<T>((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }
}

export namespace PromiseUtil {

    /**
     * foreach opter for promises.
     *
     * @export
     * @template T
     * @param {((T | PromiseLike<T> | ((value: T) => T | PromiseLike<T>))[])} promises
     * @param {Express<T, any>} express
     * @param {T} [defVal]
     * @returns
     */
    export function forEach<T>(promises: (T | PromiseLike<T> | ((value: T) => T | PromiseLike<T>))[], express: Express<T, any>, defVal?: T) {
        let defer = new Defer<string>();
        let pf = Promise.resolve<T>(defVal);
        let length = promises ? promises.length : 0;

        if (length) {
            promises.forEach((p, idx) => {
                pf = pf.then(v => isFunction(p) ? p(v) : p)
                    .then(data => {
                        if (express(data) === false) {
                            defer.resolve('complete');
                            return Promise.reject<T>('complete');
                        } else if (idx === length - 1) {
                            defer.resolve('complete');
                            return Promise.reject<T>('complete');
                        }
                        return data;
                    });
            });
            pf.catch(err => {
                return err;
            });
        } else {
            defer.reject('array empty.');
        }
        return defer.promise;
    }

    /**
     * run promise step by step.
     *
     * @export
     * @template T
     * @param {((T | PromiseLike<T> | ((value: T) => T | PromiseLike<T>))[])} promises
     * @returns
     */
    export function step<T>(promises: (T | PromiseLike<T> | ((value: T) => T | PromiseLike<T>))[]) {
        let result = Promise.resolve<T>(null);
        promises.forEach(p => {
            result = result.then(v => isFunction(p) ? p(v) : p);
        });
        return result;
    }

    /**
     * find first validate value from promises.
     *
     * @export
     * @template T
     * @param {(...(T | PromiseLike<T> | ((value: T) => T | PromiseLike<T>))[])} promises
     * @param {Express<T, boolean>} validate
     * @returns
     */
    export function find<T>(promises: (T | PromiseLike<T> | ((value: T) => T | PromiseLike<T>))[], filter: Express<T, boolean>, defVal?: T) {
        let defer = new Defer<T>();
        forEach(promises, val => {
            if (filter(val)) {
                defer.resolve(val);
                return false;
            }
            return true;
        }, defVal)
            .then(() => defer.resolve(null))
            .catch(() => {
                defer.resolve(null)
            });
        return defer.promise;
    }

}
