import { ProviderTypes, InjectTypes } from './types';
import { isMetadataObject } from '../utils/lang';
import { isToken } from '../utils/isToken';
import { IProviderParser } from './IProviderParser';
import { IIocContainer } from '../IIocContainer';
import { Provider, ObjectMapProvider } from './Provider';
import { IocCoreService } from '../IocCoreService';
import { IInjector, InjectorToken } from '../IInjector';
import { isInjector } from '../BaseInjector';

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

    parse(...providers: InjectTypes[]): IInjector {
        if (providers.length === 1 && isInjector(providers[0])) {
            return providers[0] as IInjector;
        }
        let map = this.container.get(InjectorToken);
        return map.inject(map, ...providers);
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
