import { Action, IActionSetup } from '../action';
import { Injector, ProviderType, Registered, Platform } from '../injector';
import { get } from '../metadata/refl';
import { TypeReflect } from '../metadata/type';
import { Token } from '../tokens';
import { ClassType, Type } from '../types';
import { isFunction } from '../utils/chk';
import { Handler } from '../utils/hdl';
import { cleanObj } from '../utils/lang';

/**
 * registered state.
 */
export class DefaultPlatform implements Platform {

    private states: Map<ClassType, Registered>;
    private destroyCbs: (() => void)[] | null = [];
    private _destroyed = false;
    private map = new Map<Token, any>();

    modules = new Set<Type>();

    constructor() {
        this.states = new Map();
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
        if (this.map.has(token)) {
            this.registerAction(token as Type);
        }
        return this.map.get(token) ?? notFoundValue;
    }

    hasAction(token: Token) {
        return this.map.has(token);
    }

    regAction(...types: Type<Action>[]): this {
        types.forEach(type => {
            if (this.map.has(type)) return;
            this.registerAction(type);
        });
        return this;
    }

    getHandle<T extends Handler>(target: Token<Action>): T {
        return this.map.get(target)?.toHandler() as T ?? null;
    }

    setValue<T>(token: Token<T>, value: T, provider?: Type<T>) {
        this.map.set(token, value);
        if (provider) this.map.set(provider, value);
        return this;
    }

    protected registerAction(type: Type<Action>) {
        if (this.map.has(type)) return true;
        const instance = new type(this) as Action & IActionSetup;

        this.map.set(type, instance);
        if (isFunction(instance.setup)) instance.setup();
    }

    /**
     * get injector
     * @param type
     */
    getInjector<T extends Injector = Injector>(type: ClassType): T {
        return this.states.get(type)?.injector as T;
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

    regType<T extends Registered>(type: ClassType, data: T) {
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

    }

    onDestroy(callback: () => void): void {
        this.destroyCbs?.push(callback);
    }

}
