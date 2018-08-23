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

    export function forEach<T>(promises: (T | PromiseLike<T> | ((value: T) => T | PromiseLike<T>))[]) {
        let result = Promise.resolve<T>(null);
        promises.forEach(p => {
            result = result.then(v => isFunction(p) ? p(v) : p);
        });
        return result;
    }

    /**
     * find first validate promise.
     *
     * @export
     * @template T
     * @param {(...(T | PromiseLike<T> | ((value: T) => T | PromiseLike<T>))[])} promises
     * @param {Express<T, boolean>} validate
     * @returns
     */
    export function first<T>(promises: (T | PromiseLike<T> | ((value: T) => T | PromiseLike<T>))[], validate: Express<T, boolean>) {
        let defer = new Defer<T>();
        let pf = Promise.resolve<T>(null);
        let length = promises ? promises.length : 0;

        if (length) {
            promises.forEach((p, idx) => {
                pf = pf.then(v => isFunction(p) ? p(v) : p)
                    .then(data => {
                        if (validate(data)) {
                            defer.resolve(data);
                            return Promise.reject<T>('found');
                        } else if (idx === length - 1) {
                            return Promise.reject<T>('not found');
                        }
                        return data;
                    });
            });
            pf.catch(err => {
                return err;
            });
        } else {
            defer.reject('promises array empty.');
        }
        return defer.promise;
    }

}
