import { ReferenceToken, RefTarget } from './types';
import { Token, ParamProviders } from '@ts-ioc/ioc';

/**
 * reference service resolver.
 *
 * @export
 * @interface IRefServiceResolver
 */
export interface IRefServiceResolver {
    /**
     * get target reference service.
     *
     * @template T
     * @param {ReferenceToken<T>} [refToken] reference service Registration Injector
     * @param {(RefTarget | RefTarget[])} target  the service reference to.
     * @param {Token<T>} [defaultToken] default service token.
     * @param {...ParamProviders[]} providers
     * @returns {T}
     * @memberof IContainer
     */
    getRefService<T>(refToken: ReferenceToken<T>, target: RefTarget | RefTarget[], defaultToken?: Token<T> | Token<any>[], ...providers: ParamProviders[]): T
}
