import { Token, InstanceFactory } from '../types';
import { IResolver } from '../IResolver';

/**
 * resolver iterator.
 *
 * @export
 * @abstract
 * @class ResolverIterator
 */
export abstract class ResolverIterator {
    constructor() {

    }
    /**
     * iterator all resovlers.
     *
     * @param {(tk: Token<any>, fac: InstanceFactory<any>, resolvor?: IResolver) => void | boolean} callbackfn if callbackfn return false will break iterator.
     * @memberof IContainer
     */
    abstract iterator(callbackfn: (tk: Token<any>, fac: InstanceFactory<any>, resolvor?: IResolver) => void | boolean): void | boolean;

}