import { Token, Provider, IInjector } from '@tsdi/ioc';
import { ServiceOption } from '../resolves/context';

/**
 * service resolver.
 *
 * @export
 * @interface IServiceResolver
 */
export interface IServiceResolver {
    /**
     * get service or target reference service in the injector.
     *
     * @template T
     * @param { IInjector } injector
     * @param {(Token<T> | ServiceOption<T>)} target servive token.
     * @param {...Provider[]} providers
     * @returns {T}
     * @memberof IContainer
     */
    getService<T>(injector: IInjector, target: Token<T> | ServiceOption<T>, ...providers: Provider[]): T;

}
