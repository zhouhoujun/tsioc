import { ProviderTypes } from '../types';
import { ProviderMap } from './providers';
import { InjectToken } from '../InjectToken';

/**
 * Providers parser token.
 */
export const ProviderParserToken = new InjectToken<IProviderParser>('DI_IProviderParser');

/**
 * Providers Parser interface.
 *
 * @export
 * @interface IProviderParser
 */
export interface IProviderParser {

    /**
     * convert to provider map.
     *
     * @param {...ProviderTypes[]} providers
     * @returns {ProviderMap}
     * @memberof IProviderParser
     */
    parse(...providers: ProviderTypes[]): ProviderMap;

}
