import { InjectTypes } from './types';
import { IInjector } from '../IInjector';

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
     * @param {...InjectTypes[]} providers
     * @returns {Injector}
     * @memberof IProviderParser
     */
    parse(...providers: InjectTypes[]): IInjector;
}
