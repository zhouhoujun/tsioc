import { Type, Modules } from '../types';
import { isMetadataObject } from '../utils/lang';
import { isToken } from '../tokens';
import { IProviders } from '../IInjector';
import { InjectorProvider } from '../Injector';
import { ProviderType, ParamProvider, ObjectMapProvider, Provider } from './Provider';


/**
 * providers.
 * note: ObjectMap provider can not resolve token.
 */
export type ProviderTypes = IProviders | ProviderType;

/**
 * inject types
 */
export type InjectTypes = Type | ProviderTypes | Modules[];

/**
 * params providers.
 */
export type ParamProviders = ProviderTypes | ParamProvider;



/**
 * is provider or not.
 *
 * @export
 * @param {*} target
 * @returns {target is ProviderTypes}
 */
export function isProvider(target: any): target is ProviderTypes {
    return target instanceof InjectorProvider
        || target instanceof ObjectMapProvider
        || target instanceof Provider
        || (isMetadataObject(target, 'provide') && isToken(target.provide));
}
