import { Token } from '../tokens';
import { ClassType, Type } from '../types';
import { Handler } from '../utils/hdl';
import { EMPTY, isFunction } from '../utils/chk';
import { Action, IActionSetup } from '../action';
import { get } from '../metadata/refl';
import { TypeReflect } from '../metadata/type';
import { ProviderType, StaticProvider } from '../providers';
import { Injector, Platform } from '../injector';
import { DestroyCallback, isDestroy } from '../destroy';


/**
 * default platform implements {@link Platform}.
 */
export class DefaultPlatform implements Platform {

    private _dsryCbs = new Set<DestroyCallback>();
    private _destroyed = false;
    private actions: Map<Token, any>;
    private singletons: Map<Token, any>;
    private extPdrs: Map<ClassType, ProviderType[]>;
    private scopes: Map<string | ClassType, Injector>;
    private _createdCbs: Set<(value: any, injector: Injector) => void>;

    constructor(readonly injector: Injector) {
        this.scopes = new Map();
        this.extPdrs = new Map();
        this.actions = new Map();
        this.singletons = new Map();
        this._createdCbs = new Set([(value, inj) => isDestroy(value) && inj.onDestroy(value)]);
        injector.onDestroy(this);
    }

    onInstanceCreated(callback: (value: any, injector: Injector) => void): void {
        this._createdCbs.add(callback);
    }

    toCreatedHandle(injector: Injector): (value: any) => void {
        return (value) => {
            this._createdCbs.forEach(h => h(value, injector));
        }
    }

    /**
     * register singleton value
     * @param token 
     * @param value 
     */
    registerSingleton<T>(injector: Injector, token: Token<T>, value: T): this {
        if (this.singletons.has(token)) {
            throw Error('has singleton instance with token:' + token.toString());
        }
        this.singletons.set(token, value);
        injector.onDestroy(() => this.singletons.delete(token));
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

    setInjector(scope: ClassType | string, injector: Injector) {
        this.scopes.set(scope, injector);
    }

    /**
     * get injector
     * @param type
     */
    getInjector<T extends Injector = Injector>(scope: ClassType | 'root' | 'platform'): T {
        if (scope === 'platform') {
            return this.injector as T;
        }
        return this.scopes.get(scope) as T;
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
     * get type provider.
     * @param type
     */
    getTypeProvider(type: ClassType | TypeReflect) {
        if (isFunction(type)) {
            return this.extPdrs.has(type) ? [...get(type)?.class.providers, ...this.extPdrs.get(type) || EMPTY] : get(type)?.class.providers;
        }
        return this.extPdrs.has(type.type) ? [...type.class.providers, ...this.extPdrs.get(type.type) || EMPTY] : type.class.providers;
    }

    /**
     * set type provider.
     * @param type 
     * @param providers 
     */
    setTypeProvider(type: ClassType | TypeReflect, providers: StaticProvider[]) {
        const ty = isFunction(type) ? type : type.type;
        const prds = this.extPdrs.get(ty);
        if (prds) {
            prds.push(...providers)
        } else {
            this.extPdrs.set(ty, providers);
        }
    }

    clearTypeProvider(type: ClassType) {
        this.extPdrs.delete(type);
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
        try {
            this._dsryCbs.forEach(c => isFunction(c) ? c() : c?.destroy());
        } finally {
            this._dsryCbs.clear();
            this._createdCbs.clear();
            this.scopes.clear();
            this.extPdrs.clear();
            this.actions.clear();
            this.singletons.clear();
        }
    }

    onDestroy(callback: DestroyCallback): void {
        this._dsryCbs.add(callback);
    }

}
