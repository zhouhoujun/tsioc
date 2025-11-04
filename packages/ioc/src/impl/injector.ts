/* eslint-disable no-case-declarations */
import { isFunction } from '../utils/chk';
import { InjectorScope, Injector, INJECT_IMPL } from '../injector';
import { Provider } from '../providers';
import { AbstractInjector, deferProcessProviders, StaticInjector } from './base';




/**
 * Default Injector
 */
export class DefaultInjector extends AbstractInjector {

    constructor(providers?: Provider[], parent?: Injector, scope?: InjectorScope) {
        super(parent, parent ? scope : 'platform')
        deferProcessProviders(this, providers, this._readyDefer)
    }

}






INJECT_IMPL.create = (providers?: Provider[], parent?: Injector, scope?: InjectorScope) => {
    if (scope === 'static' || isFunction(scope)) {
        return new StaticInjector(providers, parent, scope)
    }
    return new DefaultInjector(providers, parent!, scope)
};

INJECT_IMPL.isInjector = (target) => target instanceof DefaultInjector;
