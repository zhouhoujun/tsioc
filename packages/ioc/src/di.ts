import { ClassType, LoadType, Modules, Type } from './types';
import {
    ProviderType, ResolveOption, ServicesOption, MethodType, FacRecord, Factory, ProviderOption, RegisterOption, TypeOption
} from './interface';
import { isToken, Token } from './tokens';
import { CONTAINER, INJECTOR, TARGET } from './metadata/tk';
import { Abstract } from './metadata/fac';
import { cleanObj, getClass, getTypes, isBaseOf, mapEach } from './utils/lang';
import { KeyValueProvider, StaticProviders } from './providers';
import { isArray, isClass, isDefined, isFunction, isNil, isPlainObject, isString, isTypeObject, isTypeReflect } from './utils/chk';
import { DesignContext } from './actions/ctx';
import { DesignLifeScope } from './actions/design';
import { DefaultStrategy, Strategy } from './strategy';
import { ActionProvider, Container, CONTAINER_IMPL, EMPTY, Injector, INJ_IMPL, isInjector, ModuleLoader, Registered, RegisteredState } from './injector';
import { Action, IActionSetup } from './action';
import { Handler } from './utils/hdl';
import { InvokerImpl } from './actions/invoker';
import { RuntimeLifeScope } from './actions/runtime';
import { TypeReflect } from './metadata/type';
import { get } from './metadata/refl';
import { Invoker } from './invoker';


INJ_IMPL.create = (providers: ProviderType[], parent?: Injector, strategy?: Strategy, name?: string) => new DefaultInjector(providers, parent, strategy, name);
CONTAINER_IMPL.create = (providers: ProviderType[], parent?: Injector, strategy?: Strategy, name?: string) => new DefaultContainer(providers, parent, strategy, name);
/**
 * injector default startegy.
 */
export const injectorStrategy = new DefaultStrategy(p => isInjector(p));

/**
 * provider container.
 *
 * @export
 * @class Provider
 * @extends {Destoryable}
 */
export class DefaultInjector extends Injector {

    /**
     * factories.
     *
     * @protected
     * @type {Map<Token, Function>}
     * @memberof BaseInjector
     */
    protected factories: Map<Token, FacRecord>;
    protected destCb: () => void;
    protected _container: Container;

    constructor(providers: ProviderType[], readonly parent?: Injector, readonly strategy: Strategy = injectorStrategy, readonly source?: string) {
        super();
        this.factories = new Map();
        parent && this.init(parent);
        this.setValue(INJECTOR, this);
        this.setValue(Injector, this);
        this.inject(providers);
    }

    protected init(parent: Injector) {
        this.destCb = () => this.destroy();
        this._container = parent.getContainer();
        if (!this.strategy || this.strategy.vaildParent(parent)) {
            parent.onDestroy(this.destCb);
        } else {
            this._container.onDestroy(this.destCb);
            (this as any).parent = null;
        }
    }

    get size(): number {
        return this.factories.size;
    }

    getContainer(): Container {
        return this._container;
    }

    /**
     * registered state.
     */
    state(): RegisteredState {
        return this._container?.state();
    }

    tokens() {
        return Array.from(this.factories.keys());
    }

    /**
     * action provider.
     */
    action(): ActionProvider {
        return this._container?.action();
    }

    /**
     * set provide.
     *
     * @template T
     * @param {ProviderOption<T>} option
     * @returns {this}
     */
    set<T>(option: ProviderOption<T>): this;
    /**
     * set provide.
     * @param token token.
     * @param option factory option.
     */
    set<T>(token: Token<T>, option: FacRecord<T>): this;
    /**
     * set provide.
     *
     * @template T
     * @param {Token<T>} token
     * @param {Factory<T>} fn
     * @param {Type<T>} [providerType]
     * @returns {this}
     */
    set<T>(token: Token<T>, fn: Factory<T>, type?: Type<T>): this;
    set<T>(target: any, fn?: any, type?: Type<T>): this {
        if (isFunction(fn)) {
            const old = this.factories.get(target);
            if (old) {
                old.fn = fn;
                if (
                    type) old.type = type;
            } else {
                this.factories.set(target, type ? { fn, type } : { fn });
            }
        } else if (fn) {
            this.factories.set(target, fn);
        } else {
            this.factories.set((target as ProviderOption).provide, this.generateRecord(target));
        }
        return this;
    }

    protected generateRecord(target: StaticProviders) {
        return generateRecord(this, target);
    }

    /**
     * register with option.
     * @param options
     */
    register<T>(option: RegisterOption<T>): this;
    /**
     * register type class.
     * @param type the class type.
     * @param [options] the class prodvider to.
     * @returns {this}
     */
    register<T>(type: Type<T>): this;
    /**
     * register types.
     * @param type the class type.
     * @param [options] the class prodvider to.
     * @returns {this}
     */
    register(types: Type[]): this;
    register(...types: Type[]): this;
    register(...args: any[]): this {
        if (args.length === 1) {
            const target = args[0];
            if (isArray(target)) {
                target.forEach(t => this.regType(t));
            } else if (isFunction(target)) {
                this.regType(target);
            } else {
                if ((target as TypeOption).type) {
                    this.registerIn(this, (target as TypeOption).type, target as TypeOption);
                } else if (target.provide) {
                    this.factories.set(target.provide, this.generateRecord(target));
                }
            }
        } else {
            args.forEach(t => this.regType(t));
        }

        return this;
    }

    /**
     * cache instance.
     * @param token 
     * @param instance 
     * @param expires 
     */
    cache<T>(token: Token<T>, cache: T, expires: number): this {
        const pd = this.factories.get(token);
        const ltop = Date.now();
        if (pd) {
            pd.cache = cache;
            pd.ltop = ltop
            pd.expires = expires;
        } else {
            this.factories.set(token, { cache, ltop, expires });
        }
        return this;
    }


    /**
     * register type class.
     * @param injector register in the injector.
     * @param option the type register option.
     * @param [singleton]
     */
    protected registerIn<T>(injector: Injector, type: Type<T>, option?: TypeOption<T>) {
        const state = injector.state();
        // make sure class register once.
        if (state.isRegistered(type) || injector.has(type, true)) {
            return false;
        }

        const ctx = {
            injector,
            ...option,
            type
        } as DesignContext;
        injector.action().get(DesignLifeScope).register(ctx);
        cleanObj(ctx);
        return true;
    }

    protected regType(type: Type) {
        this.registerIn(this, type);
    }

    /**
     * inject providers.
     *
     * @param {...ProviderType[]} providers
     * @returns {this}
     */
    inject(providers: ProviderType[]): this;
    /**
     * inject providers.
     *
     * @param {...ProviderType[]} providers
     * @returns {this}
     */
    inject(...providers: ProviderType[]): this;
    inject(...args: any[]): this {
        const providers = (args.length === 1 && isArray(args[0])) ? args[0] : args;
        providers?.length && providers.forEach(p => {
            if (!p) {
                return;
            }
            if (isFunction(p)) {
                return this.regType(p);
            }

            if (isArray(p)) {
                return this.use(p);
            }

            if (isPlainObject(p)) {
                if ((p as StaticProviders).provide) {
                    this.factories.set((p as StaticProviders).provide, this.generateRecord(p as StaticProviders));
                } else {
                    this.use(p);
                }
            } else if (p instanceof KeyValueProvider) {
                p.each((k, useValue) => {
                    this.factories.set(k, { value: useValue });
                });
            }
        });

        return this;
    }

    /**
     * use modules.
     *
     * @param {...Modules[]} modules
     * @returns {this}
     */
    use(modules: Modules[]): Type[];
    /**
     * use modules.
     *
     * @param {...Modules[]} modules
     * @returns {this}
     */
    use(...modules: Modules[]): Type[];
    use(...args: any[]): Type[] {
        let modules: Modules[];
        if (args.length === 1 && isArray(args[0])) {
            modules = args[0];
        } else {
            modules = args;
        }
        let types = getTypes(modules);
        types.forEach(ty => this.regType(ty));
        return types;
    }

    /**
     * has register.
     *
     * @template T
     * @param {Token<T>} token the token.
     * @param {boolean} deep deep check in parent or not.
     * @returns {boolean}
     */
    has<T>(token: Token<T>, deep?: boolean): boolean {
        return this.factories.has(token) || this.strategy?.hasToken(token, this, deep) || false;
    }

    hasValue<T>(token: Token<T>): boolean {
        return !isNil(this.factories.get(token)?.value) || this.strategy?.hasValue(token, this) || false;
    }

    setValue<T>(token: Token<T>, value: T, type?: Type<T>): this {
        const isp = this.factories.get(token);
        if (isp) {
            isp.value = value;
            if (type) isp.type = type;
        } else if (isDefined(value)) {
            this.factories.set(token, type ? { value, type } : { value });
        }
        return this;
    }

    /**
     * get token factory resolve instace in current BaseInjector.
     *
     * @template T
     * @param {Token<T>} token
     * @param {Injector} providers
     * @returns {T}
     */
    get<T>(key: Token<T>, notFoundValue?: T): T {
        return resolveToken(this, this.factories.get(key)) ?? this.strategy?.getInstance(key, this) ?? notFoundValue ?? null;
    }


    /**
     * resolve instance with token and param provider via resolve scope.
     *
     * @template T
     * @param {Token<T>} token
     * @returns {T}
     * @memberof IocContainer
     */
    resolve<T>(token: Token<T>): T;
    /**
    * resolve instance with token and param provider via resolve scope.
    *
    * @template T
    * @param {(Token<T> | ResolveOption<T>)} token
    * @param {...ProviderType[]} providers
    * @returns {T}
    * @memberof IocContainer
    */
    resolve<T>(option: ResolveOption<T>): T;
    resolve<T>(token: Token<T> | ResolveOption<T>) {
        let inst: T;
        if (isPlainObject(token)) {
            let option = token as ResolveOption;
            const injector = Injector.create([...option.providers || [], { provide: TARGET, useValue: option.target }], this);
            inst = this.resolveStrategy(injector, option);
            injector.destroy();
            cleanObj(option);
        } else {
            inst = this.get(token);
        }
        return inst;
    }

    protected resolveStrategy<T>(injector: Injector, option: ResolveOption<T>) {
        let targetToken: ClassType;
        if (option.target) {
            if (isFunction(option.target)) {
                targetToken = option.target;
            } else if (isTypeReflect(option.target)) {
                targetToken = option.target.type;
            } else {
                targetToken = isTypeObject(option.target) ? getClass(option.target) : null;
            }
        }
        let inst: T;
        const state = this.state();
        if (targetToken) {
            inst = this.resolveWithTarget(state, option.token, targetToken);
        }

        if (option.tagOnly || isDefined(inst)) return inst ?? null;

        return injector.get(option.token) ?? this.resolveFailed(injector, state, option.token, option.regify, option.defaultToken) ?? null;
    }

    protected resolveWithTarget<T>(state: RegisteredState, token: Token<T>, targetToken: ClassType): T {
        return state?.getTypeProvider(targetToken)?.get(token);
    }


    protected resolveFailed<T>(injector: Injector, state: RegisteredState, token: Token<T>, regify?: boolean, defaultToken?: Token): T {
        if (regify && isFunction(token) && !state?.isRegistered(token)) {
            injector.register(token as Type);
            return injector.get(token);
        }
        if (defaultToken) {
            return injector.get(defaultToken);
        }
        return null;
    }

    /**
     * get token provider class type.
     *
     * @template T
     * @param {Token<T>} token
     * @returns {Type<T>}
     * @memberof BaseInjector
     */
    getTokenProvider<T>(token: Token<T>): Type<T> {
        const frd = this.factories.get(token);
        return frd?.type ?? (frd?.value ? getClass(frd.value) : null) ?? (frd && isClass(token) ? token : null) ?? this.strategy?.getTokenProvider(token, this);
    }

    /**
     * unregister the token
     *
     * @template T
     * @param {Token<T>} token
     * @returns {this}
     * @memberof BaseInjector
     */
    unregister<T>(token: Token<T>): this {
        const isp = this.factories.get(token);
        if (isp) {
            this.factories.delete(token);
            if (isFunction(isp.unreg)) isp.unreg();
            cleanObj(isp);
        }
        return this;
    }

    iterator(callbackfn: (fac: FacRecord, key: Token, resolvor?: Injector) => void | boolean, deep?: boolean): void | boolean {
        if (mapEach(this.factories, callbackfn, this) === false) {
            return false;
        }
        return this.strategy?.iterator(callbackfn, this, deep);
    }

    /**
     * copy resolver.
     *
     * @param {BaseInjector} from
     * @returns
     * @memberof ProviderMap
     */
    copy(from: Injector, filter?: (key: Token) => boolean): this {
        if (!from) {
            return this;
        }
        this.merge(from as DefaultInjector, this, filter);
        return this;
    }

    clone(to?: Injector): Injector;
    clone(filter: (key: Token) => boolean, to?: Injector): Injector;
    clone(filter?: any, to?: Injector): Injector {
        if (!isFunction(filter)) {
            to = filter;
            filter = undefined;
        }
        to = to || new (getClass(this))(this.parent);
        this.merge(this, to as DefaultInjector, filter);
        return to;
    }

    /**
    * invoke method.
    *
    * @template T
    * @param {(T | Type<T>)} target type of class or instance
    * @param {MethodType} propertyKey
    * @param {T} [instance] instance of target type.
    * @param {...ProviderType[]} providers
    * @returns {TR}
    */
    invoke<T, TR = any>(target: T | Type<T>, propertyKey: MethodType<T>, ...providers: ProviderType[]): TR {
        return this.getContainer().get(Invoker).invoke(this, target, propertyKey, ...providers);
    }


    /**
     * get module loader.
     *
     * @returns {IModuleLoader}
     */
    getLoader(): ModuleLoader {
        return this.get(ModuleLoader);
    }

    load(modules: LoadType[]): Promise<Type[]>;
    load(...modules: LoadType[]): Promise<Type[]>;
    async load(...args: any[]): Promise<Type[]> {
        let modules: LoadType[];
        if (args.length === 1 && isArray(args[0])) {
            modules = args[0];
        } else {
            modules = args;
        }
        return await this.getLoader()?.register(this, modules) ?? [];
    }

    /**
     * get service or target reference service in the injector.
     *
     * @template T
     * @param {(Token<T> | ResolveOption<T>)} target servive token.
     * @param {...ProviderType[]} providers
     * @returns {T}
     */
    getService<T>(target: Token<T> | ResolveOption<T>): T {
        return this.resolve<T>(target as any);
    }

    getServices<T>(target: Token<T> | ServicesOption<T>): T[] {
        return this.get(ServicesProvider, SERVICE).getServices(this, target) ?? [];
    }


    protected merge(from: DefaultInjector, to: DefaultInjector, filter?: (key: Token) => boolean) {
        from.factories.forEach((pdr, key) => {
            if (filter && !filter(key)) {
                return;
            }
            to.factories.set(key, { ...pdr });
        });
    }

    protected destroying() {
        Array.from(this.factories.keys())
            .forEach(k => {
                this.unregister(k);
            });
        this.factories.clear();
        this.factories = null;
        if (this.parent) {
            !this.parent.destroyed && this.parent.offDestory(this.destCb);
        } else if (this._container) {
            !this._container.destroyed && this._container.offDestory(this.destCb);
        }
        this.destCb = null;
        this._container = null;
        (this as any).parent = null;
        (this as any).strategy = null;
    }
}


/**
 * resolve token.
 * @param rd 
 * @param provider 
 * @returns 
 */
export function resolveToken<T>(injector: Injector, rd: FacRecord<T>): T {
    if (!rd) return null;
    if (!isNil(rd.value)) return rd.value;
    if (rd.expires) {
        if ((rd.expires + rd.ltop) < Date.now()) {
            rd.ltop = Date.now();
            return rd.cache;
        }
        rd.expires = null;
        rd.cache = null;
        rd.ltop = null;
    }

    let args = rd.deps?.map(d => {
        if (isToken(d)) {
            return injector.get(d) ?? (isString(d) ? d : null);
        } else {
            return d;
        }
    }) ?? [];
    return rd.isCtor ? new (rd.fn as Type)(...args) : rd.fn(...args) ?? null;
}

const IDENT = function <T>(value: T): T {
    return value;
};
/**
 * generate record.
 * @param injector 
 * @param option 
 * @returns 
 */
export function generateRecord<T>(injector: Injector, option: StaticProviders): FacRecord<T> {
    let fn: Function = IDENT;
    let value: T;
    let isCtor = false;
    let type = option.useClass;
    const deps = computeDeps(option);
    if (isDefined(option.useValue)) {
        value = option.useValue;
    } else if (option.useFactory) {
        fn = option.useFactory;
    } else if (option.useExisting) {

    } else if (option.useClass) {
        if (deps.length) {
            isCtor = true;
            fn = option.useClass;
        } else {
            fn = () => {
                if (!injector.state().isRegistered(type) && !injector.has(type, true)) {
                    injector.register({ type, deps });
                }
                return injector.get(type);
            };
        }
    } else if (isFunction(option.provide)) {
        isCtor = true;
        fn = option.provide;
    }
    return { value, fn, isCtor, deps, type };
}

function computeDeps(provider: StaticProviders) {
    let deps: any[];
    if (provider.deps && provider.deps.length) {
        deps = provider.deps.slice(0);
    } else if (provider.useExisting) {
        deps = [provider.useExisting];
    }
    return deps ?? EMPTY;
}



/**
 * service provider.
 */
@Abstract()
export abstract class ServicesProvider {
    /**
     * get all service extends type.
     *
     * @template T
     * @param {(Token<T> | ServicesOption<T>)} target servive token or express match token.
     * @param {...ProviderType[]} providers
     * @returns {T[]} all service instance type of token type.
     */
    abstract getServices<T>(injector: Injector, target: Token<T> | ServicesOption<T>): T[];
}



const SERVICE: ServicesProvider = {

    getServices<T>(injector: Injector, target: Token<T> | ServicesOption<T>): T[] {
        const tokens = isPlainObject(target) ?
            ((target as ServicesOption<T>).tokens ?? [(target as ServicesOption<T>).token])
            : [target];
        const services: T[] = [];
        injector.iterator((fac, key) => {
            if (tokens.indexOf(key)) {
                services.push(resolveToken(injector, fac));
            }
        });
        return services;
    }
};



/**
 * Container
 *
 * @export
 * @class Container
 * @implements {IContainer}
 */
export class DefaultContainer extends DefaultInjector implements Container {

    private _state: RegisteredState;
    private _action: ActionProvider;
    readonly id: string;
    private _finals = [];

    constructor(providers: ProviderType[] = [], parent?: Injector, strategy?: Strategy, source?: string) {
        super(providers, parent, strategy, source);
        const red = { value: this };
        this.factories.set(CONTAINER, red);
        this.factories.set(Container, red);
        this._state = new RegisteredStateImpl(this);
        this._action = new ActionProviderImpl([], this);
        registerCores(this);
    }

    getContainer(): this {
        return this;
    }

    /**
     * registered state.
     */
    state(): RegisteredState {
        return this._state;
    }

    /**
     * action provider.
     */
    action(): ActionProvider {
        return this._action;
    }

    onFinally(callback: () => void) {
        this._finals.push(callback);
    }

    protected destroying() {
        super.destroying();
        this._finals.forEach(c => c());
        this._finals = null;
        this._state = null;
        this._action = null;
    }

}




class RegisteredStateImpl extends RegisteredState {

    private states: Map<ClassType, Registered>;
    constructor(private readonly container: Container) {
        super()
        this.states = new Map();
        this.container.onFinally(() => {
            this.states.forEach(v => {
                if (!v) return;
                v.providers?.destroy();
                v.injector?.destroy();
                cleanObj(v);
            });
            this.states.clear();
        });
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
        return this.states.get(type)?.providers;
    }

    setTypeProvider(type: ClassType | TypeReflect, ...providers: ProviderType[]) {
        const trefl = isFunction(type) ? get(type) : type;
        trefl.providers.push(...providers);
        const state = this.states.get(trefl.type);
        if (state) {
            if (!state.providers) {
                state.providers = Injector.create(providers, state.injector as Injector);
            } else {
                state.providers.inject(providers);
            }
        }
    }

    getInstance<T>(type: ClassType<T>): T {
        const state = this.states.get(type);
        return state.providers.get(type) ?? null;
    }

    resolve<T>(token: ClassType<T>, providers?: ProviderType[]): T {
        return this.states.get(token)?.injector.resolve({ token, providers }) ?? null;
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

}

/**
 * is container or not.
 *
 * @export
 * @param {*} target
 * @returns {target is Container}
 */
export function isContainer(target: any): target is Container {
    return target && target instanceof Container;
}

/**
 * action injector.
 */
class ActionProviderImpl extends DefaultInjector implements ActionProvider {

    protected init(parent: Container) {
        parent.onFinally(() => this.destroy());
    }

    /**
     * get token factory resolve instace in current BaseInjector.
     *
     * @template T
     * @param {Token<T>} token
     * @param {IProvider} providers
     * @returns {T}
     */
    get<T>(key: Token<T>, notFoundValue?: T): T {
        if (isFunction(key) && !this.has(key)) {
            this.registerAction(key as Type);
        }
        return super.get(key, notFoundValue);
    }

    regAction(...types: Type<Action>[]): this {
        types.forEach(type => {
            if (this.has(type)) return;
            this.registerAction(type);
        });
        return this;
    }

    protected regType<T>(target: Type<T>) {
        if (isBaseOf(target, Action)) {
            this.registerAction(target);
            return;
        }
        super.regType(target);
    }

    getAction<T extends Handler>(target: Token<Action>): T {
        return this.get(target)?.toHandler() as T ?? null;
    }

    protected registerAction(type: Type<Action>) {
        if (this.has(type)) return true;
        const instance = new type(this) as Action & IActionSetup;

        this.setValue(type, instance);
        if (isFunction(instance.setup)) instance.setup();
    }
}

/**
 * register core for container.
 *
 * @export
 * @param {IContainer} container
 */
export function registerCores(container: Container) {
    container.setValue(Invoker, new InvokerImpl());
    // bing action.
    container.action().regAction(
        DesignLifeScope,
        RuntimeLifeScope
    );

}
