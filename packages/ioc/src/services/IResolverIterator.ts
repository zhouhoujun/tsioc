import { Token, InstanceFactory } from '../types';
import { IResolver } from '../IResolver';

export interface IResolverIterator {
    /**
     * iterator all resovlers.
     *
     * @param {(tk: Token<any>, fac: InstanceFactory<any>, resolvor?: IResolver) => void | boolean} callbackfn if callbackfn return false will break iterator.
     * @memberof IContainer
     */
    iterator(callbackfn: (tk: Token<any>, fac: InstanceFactory<any>, resolvor?: IResolver) => void | boolean): void | boolean;

}