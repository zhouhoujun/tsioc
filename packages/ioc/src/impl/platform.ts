import { Token } from '../tokens';
import { ClassType, Type } from '../types';
import { Handler } from '../handler';
import { isFunction } from '../utils/chk';
import { Action, ActionSetup } from '../action';
import { get } from '../metadata/refl';
import { TypeReflect } from '../metadata/type';
import { ProviderType, StaticProvider } from '../providers';
import { Injector, InjectorScope, ModuleRef, Platform } from '../injector';


/**
 * default platform implements {@link Platform}.
 */
export class DefaultPlatform implements Platform {

    private _actions: Map<Token, any>;
    private _singls: Map<Token, any>;
    private _pdrs: Map<ClassType, ProviderType[]>;
    private _scopes: Map<string | ClassType, Injector>;

    readonly modules = new Map<Type, ModuleRef>();

    constructor(readonly injector: Injector) {
        this._scopes = new Map();
        this._pdrs = new Map();
        this._actions = new Map();
        this._singls = new Map();
        injector.onDestroy(this);
    }

    /**
     * register singleton value
     * @param token 
     * @param value 
     */
    registerSingleton<T>(injector: Injector, token: Token<T>, value: T): this {
        if (this._singls.has(token)) {
            throw Error('has singleton instance with token:' + token.toString());
        }
        this._singls.set(token, value);
        injector.onDestroy(() => this._singls.delete(token));
        return this;
    }
    /**
     * get singleton instance.
     * @param token 
     */
    getSingleton<T>(token: Token<T>): T {
        return this._singls.get(token);
    }
    /**
     * has singleton or not.
     * @param token 
     */
    hasSingleton(token: Token): boolean {
        return this._singls.has(token);
    }

    setInjector(scope: ClassType | string, injector: Injector) {
        this._scopes.set(scope, injector);
    }

    removeInjector(scope: InjectorScope): void {
        this._scopes.delete(scope);
    }

    /**
     * get injector
     * @param type
     */
    getInjector<T extends Injector = Injector>(scope: InjectorScope): T {
        if (scope === 'platform') {
            return this.injector as T;
        }
        return this._scopes.get(scope) as T;
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
        if (this._actions.has(token)) {
            this.registerAction(token as Type);
        }
        return this._actions.get(token) ?? notFoundValue;
    }

    hasAction(token: Token) {
        return this._actions.has(token);
    }

    registerAction(...types: Type<Action>[]): this {
        types.forEach(type => {
            if (this._actions.has(type)) return;
            this.processAction(type);
        });
        return this;
    }

    getHandle<T extends Handler>(target: Token<Action>): T {
        return this._actions.get(target) as T ?? null;
    }

    setActionValue<T>(token: Token<T>, value: T, provider?: Type<T>) {
        this._actions.set(token, value);
        if (provider) this._actions.set(provider, value);
        return this;
    }

    getActionValue<T>(token: Token<T>, notFoundValue?: T): T {
        return this._actions.get(token) ?? notFoundValue;
    }

    protected processAction(type: Type<Action>) {
        if (this._actions.has(type)) return true;
        const instance = new type(this) as Action & ActionSetup;

        this._actions.set(type, instance);
        if (isFunction(instance.setup)) instance.setup();
    }

    /**
     * get type provider.
     * @param type
     */
    getTypeProvider(type: ClassType | TypeReflect) {
        const tyRef = isFunction(type) ? get(type) : type;
        const pdrs = tyRef.class.providers.slice(0);
        tyRef.class.extendTypes.forEach(t => {
            let tpd = this._pdrs.get(t);
            if (tpd) {
                pdrs.unshift(...tpd);
            }
        })
        return pdrs;
    }

    /**
     * set type provider.
     * @param type 
     * @param providers 
     */
    setTypeProvider(type: ClassType | TypeReflect, providers: StaticProvider[]) {
        const ty = isFunction(type) ? type : type.type;
        const prds = this._pdrs.get(ty);
        if (prds) {
            prds.push(...providers)
        } else {
            this._pdrs.set(ty, providers);
        }
    }

    clearTypeProvider(type: ClassType) {
        this._pdrs.delete(type);
    }

    onDestroy(): void {
        this._scopes.clear();
        this.modules.clear();
        this._pdrs.clear();
        this._actions.clear();
        this._singls.clear();
    }

}
