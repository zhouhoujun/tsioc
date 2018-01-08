import { IParameter } from './IParameter';
import { Providers } from './types';
import { ProviderMap } from './ProviderMap';


/**
 * Providers Convert
 *
 * @export
 * @interface IProviderMatcher
 */
export interface IProviderMatcher {
    /**
     * math params providers.
     *
     * @param {IParameter[]} params
     * @param {...Providers[]} providers
     * @returns {ProviderMap}
     * @memberof IProviderMatcher
     */
    match(params: IParameter[], ...providers: Providers[]): ProviderMap;
}
