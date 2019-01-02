import { ParamProviders } from './types';
import {
    isClass, isArray, isFunction, isNumber,
    isUndefined, isNull, isToken, isBaseObject, lang, isTypeObject
} from '../utils';
import { IProviderParser } from './IProviderParser';
import { IContainer } from '../IContainer';
import { ProviderMap, isProviderMap, ProviderMapToken } from './ProviderMap';
import { Provider, ParamProvider } from './Provider';

/**
 * provider matcher. use to find custome providers in resolve.
 *
 * note: object map provider can not resolve token.
 *
 * @export
 * @class ProviderMatcher
 * @implements {IProviderMatcher}
 */
export class ProviderParser implements IProviderParser {

    constructor(private container: IContainer) {

    }

    parse(...providers: ParamProviders[]): ProviderMap {
        if (providers.length === 1 && isProviderMap(providers[0])) {
            return providers[0] as ProviderMap;
        }
        let map = this.container.resolve(ProviderMapToken);
        providers.forEach((p, index) => {
            if (isUndefined(p) || isNull(p)) {
                return;
            }
            if (isProviderMap(p)) {
                map.copy(p);
            } else if (p instanceof Provider) {
                if (p instanceof ParamProvider) {
                    if (!p.type && isNumber(p.index)) {
                        map.add(p.index, (...providers: ParamProviders[]) => p.resolve(this.container, ...providers));
                    } else {
                        map.add(p.type, (...providers: ParamProviders[]) => p.resolve(this.container, ...providers));
                    }

                } else {
                    map.add(p.type, (...providers: ParamProviders[]) => p.resolve(this.container, ...providers));
                }
            } else if (isClass(p)) {
                if (!this.container.has(p)) {
                    this.container.register(p);
                }
                map.add(p, p);
            } else if (isBaseObject(p)) {
                let pr: any = p;
                let isobjMap = false;
                if (isToken(pr.provide)) {
                    if (isArray(pr.deps) && pr.deps.length) {
                        pr.deps.forEach(d => {
                            if (isClass(d) && !this.container.has(d)) {
                                this.container.register(d);
                            }
                        });
                    }
                    if (!isUndefined(pr.useValue)) {
                        map.add(pr.provide, () => pr.useValue);
                    } else if (isClass(pr.useClass)) {
                        if (!this.container.has(pr.useClass)) {
                            this.container.register(pr.useClass);
                        }
                        map.add(pr.provide, pr.useClass);
                    } else if (isFunction(pr.useFactory)) {
                        map.add(pr.provide, () => {
                            let args = [];
                            if (isArray(pr.deps) && pr.deps.length) {
                                args = pr.deps.map(d => {
                                    if (isClass(d)) {
                                        return this.container.get(d);
                                    } else {
                                        return d;
                                    }
                                });
                            }
                            return pr.useFactory.apply(pr, args);
                        });
                    } else if (isToken(pr.useExisting)) {
                        // if (this.container.has(pr.useExisting)) {
                            map.add(pr.provide, (...providers) => this.container.resolve(pr.useExisting, ...providers));
                        // }
                    } else {
                        isobjMap = true;
                    }
                } else {
                    isobjMap = true;
                }

                if (isobjMap) {
                    lang.forIn<any>(p, (val, name) => {
                        if (!isUndefined(val)) {
                            // object map can not resolve token.
                            if (isToken(val)) {
                                map.add(name, () => val);
                            } else {
                                map.add(name, val);
                            }
                        }
                    });
                }

            } else if (isFunction(p)) {
                map.add(name, () => p);
            }
        });

        return map;
    }
}

export function isProvider(target: any): boolean {
    return  isProviderMap(target) || isBaseObject(target) || target instanceof Provider;
}
