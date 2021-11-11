import { Token } from '../tokens';
import { ClassType, Type } from '../types';
import { Handler } from '../utils/hdl';
import { EMPTY, isFunction } from '../utils/chk';
import { getClassName } from '../utils/lang';
import { Action, IActionSetup } from '../action';
import { get } from '../metadata/refl';
import { TypeReflect } from '../metadata/type';
import { ProviderType, StaticProvider } from '../providers';
import { Injector, Platform } from '../injector';


/**
 * registered state.
 */
export class DefaultPlatform implements Platform {

    // private states: Map<ClassType, Registered>;
    private destroyCbs = new Set<() => void>();
    private _destroyed = false;
    private actions: Map<Token, any>;
    private singletons: Map<Token, any>;
    private extendPds: Map<ClassType, ProviderType[]>;

    private scopes: Map<string | ClassType, Injector>;

    constructor(readonly injector: Injector) {
        this.scopes = new Map();
        this.extendPds = new Map();
        this.actions = new Map();
        this.singletons = new Map();
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
     * get type provider.
     * @param type
     */
    getTypeProvider(type: ClassType | TypeReflect) {
        if (isFunction(type)) {
            return this.extendPds.has(type) ? [...get(type)?.providers, ...this.extendPds.get(type) || EMPTY] : get(type)?.providers;
        }
        return this.extendPds.has(type.type) ? [...type.providers, ...this.extendPds.get(type.type) || EMPTY] : type?.providers;
    }

    /**
     * set type provider.
     * @param type 
     * @param providers 
     */
    setTypeProvider(type: ClassType | TypeReflect, providers: StaticProvider[]) {
        const ty = isFunction(type) ? type : type.type;
        const prds = this.extendPds.get(ty);
        if (prds) {
            prds.push(...providers)
        } else {
            this.extendPds.set(ty, providers);
        }
    }

    clearTypeProvider(type: ClassType) {
        this.extendPds.delete(type);
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
        this.destroyCbs.forEach(c => c && c());
        this.destroyCbs.clear();
        this.scopes.clear();
        this.extendPds.clear();
        this.actions.clear();
        this.singletons.clear();
    }

    onDestroy(callback: () => void): void {
        this.destroyCbs.add(callback);
    }

}
