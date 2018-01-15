import { Providers, Token, ObjectMap, InstanceFactory } from '../types';
import { Provider, ProviderMap, ParamProvider, isProviderMap } from './providers/index';
import { isString, isNumber, isUndefined, isNull, isToken } from '../utils/index';
import { Type } from '../Type';
import { IParameter } from '../IParameter';
import { IProviderMatcher } from './IProviderMatcher';
import { NonePointcut } from './decorators/index';
import { IContainer } from '../IContainer';

@NonePointcut()
export class ProviderMatcher implements IProviderMatcher {

    constructor(private container: IContainer) {

    }

    toProviderMap(...providers: Providers[]): ProviderMap {
        let map = this.container.resolve(ProviderMap);
        providers.forEach((p, index) => {
            if (isUndefined(p) || isNull(p)) {
                return;
            }
            if (isProviderMap(p)) {
                map.copy(p);
            } else if (p instanceof Provider) {
                if (p instanceof ParamProvider) {
                    map.add(isUndefined(p.index) ? p.index : p.type, (...providers: Providers[]) => p.resolve(this.container, ...providers));
                } else {
                    map.add(p.type, (...providers: Providers[]) => p.resolve(this.container, ...providers));
                }
            } else {
                map.add(index, p);
            }
        });

        return map;
    }

    matchProviders(params: IParameter[], ...providers: Providers[]): ProviderMap {
        return this.match(params, this.toProviderMap(...providers));
    }

    match(params: IParameter[], providerMap: ProviderMap): ProviderMap {
        let map = this.container.resolve(ProviderMap);
        if (!params.length) {
            return map;
        }
        params.forEach((param, index) => {
            if (providerMap.has(param.name)) {
                map.add(param.name, providerMap.get(param.name));
            } else if (param.type && providerMap.has(param.type)) {
                map.add(param.name, providerMap.get(param.type));
            } else if (providerMap.has(index)) {
                map.add(param.name, providerMap.get(index));
            }
        });

        return map;
    }

}
