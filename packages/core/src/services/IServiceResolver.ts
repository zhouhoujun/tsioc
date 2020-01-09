import { Token, ProviderTypes, IInjector } from '@tsdi/ioc';
import { ServiceOption } from '../resolves/service/ResolveServiceContext';

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
     * @param {...ProviderTypes[]} providers
     * @returns {T}
     * @memberof IContainer
     */
    getService<T>(injector: IInjector, target: Token<T> | ServiceOption<T>, ...providers: ProviderTypes[]): T;

}
