import { ParamProviders } from './types';
import { Injector } from './ProviderMap';

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
     * @param {...ParamProviders[]} providers
     * @returns {Injector}
     * @memberof IProviderParser
     */
    parse(...providers: ParamProviders[]): Injector;
}
