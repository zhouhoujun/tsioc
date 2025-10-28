/* eslint-disable no-case-declarations */
import { isFunction } from '../utils/chk';
import { InjectorScope, Injector, INJECT_IMPL } from '../injector';
import { Runtime } from '../runtime';
import { CONTAINER, INJECTOR } from '../metadata/tk';
import { Provider } from '../providers';
import { DefaultRuntime } from './runtime';
import { DefaultInvocationFactory } from './invocation';
import { InvocationFactory } from '../invocation';
import { AbstractInjector, deferProcessProviders, processProviders } from './base';
import { createValueRecord } from './common';


export const SCOPE_PRODIDERS: Provider[] = [];




/**
 * Default Injector
 */
export class DefaultInjector extends AbstractInjector {


    constructor(providers?: Provider[], parent?: Injector, scope?: InjectorScope) {
        super(parent, parent ? scope : 'platform')
        this.initScope(scope);
        deferProcessProviders(this, providers, this._readyDefer)
    }


    protected initScope(scope?: InjectorScope) {
        const val = createValueRecord(this);
        switch (scope) {
            case 'platform':
                platformAlias.forEach(tk => this.records.set(tk, val));
                this._runtime = new DefaultRuntime(this);
                registerCores(this, this._runtime);
                break;
            case 'root':
                this._runtime = this._parent!.getRuntime();
                this._runtime.register(this);
                this._runtime.setInjector(scope, this);
                rootAlias.forEach(tk => this.records.set(tk, val));
                break;
            case 'static':
                this._runtime = this._parent!.getRuntime();
                this._runtime.register(this);
                break;
            default:
                this._runtime = this._parent!.getRuntime();
                this._runtime.register(this);
                if (scope) {
                    this._runtime.setInjector(scope, this);
                    SCOPE_PRODIDERS.length && processProviders(this, SCOPE_PRODIDERS);
                }
                (this.isStatic ? staticInjectAlias : injectAlias).forEach(tk => this.records.set(tk, val));
                break;
        }
    }


}





/**
 * static injector.
 */
export class StaticInjector extends DefaultInjector {
    readonly isStatic = true;
}


const platformAlias = [Injector, CONTAINER];
const rootAlias = [Injector, INJECTOR];
const injectAlias = [Injector];
const staticInjectAlias = [Injector, StaticInjector];


INJECT_IMPL.create = (providers?: Provider[], parent?: Injector, scope?: InjectorScope) => {
    if (scope === 'static' || isFunction(scope)) {
        return new StaticInjector(providers, parent, scope)
    }
    return new DefaultInjector(providers, parent!, scope)
};

INJECT_IMPL.isInjector = (target) => target instanceof DefaultInjector;



/**
 * register core for root.
 *
 * @export
 * @param {IContainer} container
 */
function registerCores(container: Injector, platform: Runtime) {
    platform.setSingleton(InvocationFactory, new DefaultInvocationFactory(platform), container);
}
