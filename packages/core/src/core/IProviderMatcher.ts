import { IParameter } from '../IParameter';
import { Providers } from '../types';
import { ProviderMap } from '../core/index';


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
