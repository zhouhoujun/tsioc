import { ObjectMap, Token } from './types';
import { Provider } from './Provider';
import { IContainer } from './IContainer';

/**
 * object provider map.
 *
 * @export
 * @interface Providers
 * @extends {ObjectMap<Provider>}
 */
export interface ProviderMap extends ObjectMap<Provider | any | ((container?: IContainer, type?: Token<any>) => any)> {

}

