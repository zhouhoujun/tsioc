import { ParamProviders, ProviderTypes } from './types';
import { isMetadataObject } from '../utils/lang';
import { isToken } from '../utils/isToken';
import { IProviderParser } from './IProviderParser';
import { IIocContainer } from '../IIocContainer';
import { Injector, isInjector } from './ProviderMap';
import { Provider, ObjectMapProvider } from './Provider';
import { IocCoreService } from '../IocCoreService';

/**
 * provider matcher. use to find custome providers in resolve.
 *
 * note: object map provider can not resolve token.
 *
 * @export
 * @class ProviderMatcher
 * @implements {IProviderMatcher}
 */
export class ProviderParser extends IocCoreService implements IProviderParser {

    constructor(private container: IIocContainer) {
        super()
    }

    parse(...providers: ParamProviders[]): Injector {
        if (providers.length === 1 && isInjector(providers[0])) {
            return providers[0] as Injector;
        }
        let map = this.container.getInstance(Injector);
        return map.parse(map, ...providers);
    }
}

/**
 * is provider or not.
 *
 * @export
 * @param {*} target
 * @returns {target is ProviderTypes}
 */
export function isProvider(target: any): target is ProviderTypes {
    return isInjector(target)
        || target instanceof ObjectMapProvider
        || target instanceof Provider
        || (isMetadataObject(target, 'provide') && isToken(target.provide));
}
