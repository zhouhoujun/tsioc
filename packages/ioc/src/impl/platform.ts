import { Action, IActionSetup } from '../action';
import { Injector, ProviderType, Registered, Platform } from '../injector';
import { get } from '../metadata/refl';
import { TypeReflect } from '../metadata/type';
import { ModuleFactory } from '../module.factory';
import { Token } from '../tokens';
import { ClassType, Type } from '../types';
import { Handler } from '../utils/hdl';
import { isFunction, isString } from '../utils/chk';
import { cleanObj, getClassName } from '../utils/lang';

/**
 * registered state.
 */
export class DefaultPlatform implements Platform {

    private states: Map<ClassType, Registered>;
    private destroyCbs: (() => void)[] | null = [];
    private _destroyed = false;
    private actions: Map<Token, any>;
    private singletons: Map<Token, any>;
    private modules: Map<Type | string, ModuleFactory>;


    constructor(readonly injector: Injector) {
        this.states = new Map();
        this.actions = new Map();
        this.singletons = new Map();
        this.modules = new Map();
    }

    /**
     * set singleton value
     * @param token 
     * @param value 
     */
    setSingleton<T>(token: Token<T>, value: T): this {
        if (this.singletons.has(token)) {
            throw Error('has singleton instance with token:' + token.toString());
        }
        this.singletons.set(token, value);
        return this;
    }
    /**
     * get singleton instance.
     * @param token 
     */
    getSingleton<T>(token: Token<T>): T {
        return this.singletons.get(token);
    }
    /**
     * has singleton or not.
     * @param token 
     */
    hasSingleton(token: Token): boolean {
        return this.singletons.has(token);
    }

    /**
     * register module.
     */
    registerModule(moduleType: Type, factory: ModuleFactory): void {
        const exist = this.modules.get(moduleType);
        this.assertSameOrNotExisting(exist?.moduleType, factory.moduleType);
        this.modules.set(moduleType, factory);
    }

    assertSameOrNotExisting(type: Type<any> | undefined, incoming: Type<any>) {
        if (type && type !== incoming) {
            throw new Error(
                `Duplicate module registered for - ${getClassName(type)}`);
        }
    }

    /**
     * get token factory resolve instace in current BaseInjector.
     *
     * @template T
     * @param {Token<T>} token
     * @param {Injector} provider
     * @returns {T}
     */
    getAction<T>(token: Token<T>, notFoundValue?: T): T {
        if (this.actions.has(token)) {
            this.registerAction(token as Type);
        }
        return this.actions.get(token) ?? notFoundValue;
    }

    hasAction(token: Token) {
        return this.actions.has(token);
    }

    registerAction(...types: Type<Action>[]): this {
        types.forEach(type => {
            if (this.actions.has(type)) return;
            this.processAction(type);
        });
        return this;
    }

    getHandle<T extends Handler>(target: Token<Action>): T {
        return this.actions.get(target)?.toHandler() as T ?? null;
    }

    setActionValue<T>(token: Token<T>, value: T, provider?: Type<T>) {
        this.actions.set(token, value);
        if (provider) this.actions.set(provider, value);
        return this;
    }

    getActionValue<T>(token: Token<T>, notFoundValue?: T): T {
        return this.actions.get(token) ?? notFoundValue;
    }

    protected processAction(type: Type<Action>) {
        if (this.actions.has(type)) return true;
        const instance = new type(this) as Action & IActionSetup;

        this.actions.set(type, instance);
        if (isFunction(instance.setup)) instance.setup();
    }

    /**
     * get injector
     * @param type
     */
    getInjector<T extends Injector = Injector>(scope: ClassType | 'root' | 'platform'): T {
        if (isString(scope)) {
            switch (scope) {
                case 'platform':
                    return this.injector as T;
                case 'root':
                    return this.modules.get(root);
            }
        }
        return this.states.get(scope)?.injector as T;
    }

    /**
     * get injector
     * @param type
     */
    getTypeProvider(type: ClassType): Injector {
        return this.states.get(type)?.providers!;
    }

    setTypeProvider(type: ClassType | TypeReflect, providers: ProviderType[]) {
        const trefl = isFunction(type) ? get(type) : type;
        trefl.providers.push(...providers);
        const state = this.states.get(trefl.type);
        if (state) {
            if (!state.providers) {
                state.providers = Injector.create(providers, state.injector as Injector, 'provider');
            } else {
                state.providers.inject(providers);
            }
        }
    }

    getInstance<T>(type: ClassType<T>): T {
        const state = this.states.get(type)!;
        return state.providers ? state.providers.get(type) : state.injector.get(type);
    }

    resolve<T>(token: ClassType<T>, providers?: ProviderType[]): T {
        const state = this.states.get(token)!;
        return state.providers ? state.providers.resolve(token, providers) : state.injector.resolve(token, providers);
    }

    getRegistered<T extends Registered>(type: ClassType): T {
        return this.states.get(type) as T;
    }

    registerType<T extends Registered>(type: ClassType, data: T) {
        const state = this.states.get(type);
        if (state) {
            Object.assign(state, data);
        } else {
            this.states.set(type, data);
        }
    }

    deleteType(type: ClassType) {
        const state = this.states.get(type);
        if (state) {
            state.providers?.destroy();
            const injector = state.injector;
            if (state.provides?.length && injector) {
                state.provides.forEach(p => state.injector.unregister(p));
            }
            cleanObj(state);
        }
        this.states.delete(type);
    }

    isRegistered(type: ClassType): boolean {
        return this.states.has(type);
    }

    /**
     * has destoryed or not.
     */
    get destroyed(): boolean {
        return this._destroyed;
    }

    destroy(): void {
        if (this.destroyed) {
            return;
        }
        this._destroyed = true;
        this.destroyCbs?.forEach(c => c && c());
        this.destroyCbs = null;
        this.states.forEach(v => {
            if (!v) return;
            v.providers?.destroy();
            v.injector?.destroy();
            cleanObj(v);
        });
        this.states.clear();
        this.actions.clear();
        this.singletons.clear();
        this.modules.clear();
    }

    onDestroy(callback: () => void): void {
        this.destroyCbs?.push(callback);
    }

}
