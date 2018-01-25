import { Providers, Token, ObjectMap, InstanceFactory } from '../types';
import { Provider, ProviderMap, ParamProvider, InvokeProvider, ExtendsProvider, AsyncParamProvider, isProviderMap } from './providers/index';
import { isString, isClass, isFunction, isNumber, isUndefined, isNull, isToken, isBaseObject } from '../utils/index';
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
        if (providers.length === 1 && isProviderMap(providers[0])) {
            return providers[0];
        }
        let map = this.container.resolve(ProviderMap);
        providers.forEach((p, index) => {
            if (isUndefined(p) || isNull(p)) {
                return;
            }
            if (isProviderMap(p)) {
                map.copy(p);
            } else if (p instanceof Provider) {
                if (p instanceof ParamProvider) {
                    if (!p.type && isNumber(p.index)) {
                        map.add(p.index, (...providers: Providers[]) => p.resolve(this.container, ...providers));
                    } else {
                        map.add(p.type, (...providers: Providers[]) => p.resolve(this.container, ...providers));
                    }

                } else {
                    map.add(p.type, (...providers: Providers[]) => p.resolve(this.container, ...providers));
                }
            } else {
                if (isBaseObject(p)) {
                    Object.keys(p).forEach(name => {
                        if (!isUndefined(p[name])) {
                            if (isClass(p[name])) {
                                map.add(name, p[name]);
                            } else if (isFunction(p[name])) {
                                map.add(name, () => p[name]);
                            } else {
                                map.add(name, p[name]);
                            }
                        }
                    })
                } else if (isFunction(p)) {
                    map.add(name, () => p);
                } else {
                    map.add(index, p);
                }
            }
        });

        return map;
    }

    matchProviders(params: IParameter[], ...providers: Providers[]): ProviderMap {
        return this.match(params, this.toProviderMap(...providers));
    }

    match(params: IParameter[], providers: ProviderMap): ProviderMap {
        let map = this.container.resolve(ProviderMap);
        if (!params.length) {
            return map;
        }
        params.forEach((param, index) => {
            if (!param.name) {
                return;
            }
            if (providers.has(param.name)) {
                map.add(param.name, providers.get(param.name));
            } else if (isToken(param.type)) {
                if (providers.has(param.type)) {
                    map.add(param.name, providers.get(param.type));
                } else if (this.container.has(param.type)) {
                    map.add(param.name, param.type);
                }
            } else if (providers.has(index)) {
                map.add(param.name, providers.get(index));
            }
        });

        return map;
    }

}
