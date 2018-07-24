import { IParameter } from '../IParameter';
import { Providers } from '../types';
import { ProviderMap } from '.';
import { InjectToken } from '../InjectToken';

/**
 * Providers match interface symbol.
 * it is a symbol id, you can register yourself MethodAccessor for this.
 */
export const ProviderMatcherToken = new InjectToken<IProviderMatcher>('DI_IProviderMatcher');

/**
 * Providers Convert
 *
 * @export
 * @interface IProviderMatcher
 */
export interface IProviderMatcher {

    /**
     * convert to provider map.
     *
     * @param {...Providers[]} providers
     * @returns {ProviderMap}
     * @memberof IProviderMatcher
     */
    toProviderMap(...providers: Providers[]): ProviderMap;

    /**
     * math params providers.
     *
     * @param {IParameter[]} params
     * @param {ProviderMap} providerMap
     * @returns {ProviderMap}
     * @memberof IProviderMatcher
     */
    match(params: IParameter[], providerMap: ProviderMap): ProviderMap;

    /**
     * math params providers.
     *
     * @param {IParameter[]} params
     * @param {...Providers[]} providers
     * @returns {ProviderMap}
     * @memberof IProviderMatcher
     */
    matchProviders(params: IParameter[], ...providers: Providers[]): ProviderMap;
}
