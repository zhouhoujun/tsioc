import { Registered } from './decor/type';
import { ClassType, LoadType, Type } from './types';
import { isClass, isNil, isFunction, isPlainObject, isArray } from './utils/chk';
import { Handler } from './utils/hdl';
import { cleanObj, isBaseOf } from './utils/lang';
import { IInjector, IModuleLoader, IProvider, ResolveOption, ServiceOption, ServicesOption } from './IInjector';
import { IContainer, IServiceProvider, RegisteredState } from './IContainer';
import { MethodType } from './IMethodAccessor';
import { FactoryLike, InjectToken, Factory, ProviderType, Token } from './tokens';
import { INJECTOR, INJECTOR_FACTORY, METHOD_ACCESSOR, MODULE_LOADER, PROVIDERS, SERVICE_PROVIDER } from './utils/tk';
import { Action, IActionSetup } from './action';
import { IActionProvider } from './actions/act';
import { DesignContext } from './actions/ctx';
import { DesignLifeScope } from './actions/design';
import { ResolveLifeScope } from './actions/resolve';
import { delReged, getReged, setReged } from './decor/refl';
import { Provider, Injector, Strategy, getFacInstance } from './injector';
import { registerCores } from './utils/regs';

/**
 * injector implantment.
 */
export class InjectorImpl extends Injector {

    constructor(parent?: IInjector, strategy?: Strategy) {
        super(parent, strategy);
        this.initReg();
    }

    /**
     * register types.
     * @param types
     */
    register(types: Type[]): this;
    /**
     * register provider.
     *
     * @template T
     * @param {Token<T>} token
     * @param { FactoryLike<T>} fac
     * @returns {this}
     */
    register<T>(token: Token<T>, fac?: FactoryLike<T>): this;
    register(token: any, fac?: FactoryLike<any>) {
        if (isArray(token)) {
            const ct = this.getContainer();
            token.forEach((t: Type) => ct.registerIn(this, t));
        } else {
            this.getContainer().registerFactory(this, token, fac);
        }
        return this;
    }

    /**
     * register provider.
     *
     * @template T
     * @param {Token<T>} token
     * @param { FactoryLike<T>} fac
     * @returns {this}
     */
    registerSingleton<T>(token: Token<T>, fac?: FactoryLike<T>): this {
        this.getContainer().registerFactory(this, token, fac, true);
        return this;
    }

    /**
     * resolve instance with token and param provider via resolve scope.
     *
     * @template T
     * @param {(Token<T> | ResolveOption<T>)} token
     * @param {...ProviderType[]} providers
     * @returns {T}
     */
    resolve<T>(token: Token<T> | ResolveOption<T>, ...providers: ProviderType[]): T {
        return this.getContainer().provider.getInstance(ResolveLifeScope).resolve(this, token, ...providers);
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
        return this.getValue(METHOD_ACCESSOR).invoke(this, target, propertyKey, ...providers);
    }

    /**
     * get module loader.
     *
     * @returns {IModuleLoader}
     */
    getLoader(): IModuleLoader {
        return this.getValue(MODULE_LOADER);
    }

    async load(...modules: LoadType[]): Promise<Type[]> {
        return await this.getLoader()?.register(this, ...modules) ?? [];
    }

    getService<T>(target: Token<T> | ServiceOption<T>, ...providers: ProviderType[]): T {
        return this.getSerPdr().getService(this, target, ...providers);
    }

    getServices<T>(target: Token<T> | ServicesOption<T>, ...providers: ProviderType[]): T[] {
        return this.getSerPdr().getServices(this, target, ...providers) ?? [];
    }

    getServiceProviders<T>(target: Token<T> | ServicesOption<T>): IProvider {
        return this.getSerPdr().getServiceProviders(this, target) ?? NULL_PDR;
    }

    protected getSerPdr() {
        return this.getValue(SERVICE_PROVIDER) ?? SERVICE;
    }

    protected initReg() {
        this.setValue(INJECTOR, this);
        this.setValue(Injector, this);
    }
}

let id = 0;
/**
 * Container
 *
 * @export
 * @class Container
 * @implements {IContainer}
 */
export class Container extends Injector implements IContainer {

    readonly regedState: RegisteredState;
    readonly provider: IActionProvider;
    readonly id: string;

    constructor() {
        super(null);
        this.id = `c${id++}`;
        this.regedState = new RegisteredStateImpl(this);
        this.provider = new ActionProvider(this);
        this.initReg();
    }

    getContainer(): this {
        return this;
    }


    /**
     * resolve instance with token and param provider via resolve scope.
     *
     * @template T
     * @param {(Token<T> | ResolveOption<T>)} token
     * @param {...ProviderType[]} providers
     * @returns {T}
     */
    resolve<T>(token: Token<T> | ResolveOption<T>, ...providers: ProviderType[]): T {
        return this.provider.getInstance(ResolveLifeScope).resolve(this, token, ...providers);
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
        return this.getValue(METHOD_ACCESSOR).invoke(this, target, propertyKey, ...providers);
    }

    createInjector(): IInjector {
        return this.getInstance(INJECTOR_FACTORY);
    }

    /**
     * register types.
     * @param types
     */
    register(types: Type[]): this;
    /**
     * register provider.
     *
     * @template T
     * @param {Token<T>} token
     * @param { FactoryLike<T>} fac
     * @returns {this}
     */
    register<T>(token: Token<T>, fac?: FactoryLike<T>): this;
    /**
     * register type.
     * @abstract
     * @template T
     * @param {Token<T>} token
     * @param {T} [fac]
     * @returns {this}
     */
    register(token: any, fac?: FactoryLike<any>) {
        if (isArray(token)) {
            token.forEach(t => this.registerType(t));
        } else {
            this.registerFactory(this, token, fac);
        }
        return this;
    }

    registerSingleton<T>(token: Token<T>, fac?: FactoryLike<T>): this {
        this.registerFactory(this, token, fac, true);
        return this;
    }

    registerFactory<T>(injector: IInjector, token: Token<T>, value?: FactoryLike<T>, singleton?: boolean): this {
        if (!isNil(value)) {
            if (isFunction(value)) {
                if (isClass(value)) {
                    this.registerIn(injector, value, { provide: token, singleton });
                } else {
                    const classFactory = this.createCustomFactory(injector, token, value, singleton);
                    injector.set(token, classFactory);
                }
            } else if (!isNil(value)) {
                injector.set(token, { value });
            }

        } else if (isClass(token)) {
            this.registerIn(injector, token, { singleton });
        }

        return this;
    }

    /**
     * register type class.
     * @param injector register in the injector.
     * @param type the class.
     * @param [provide] the class prodvider to.
     * @param [singleton]
     */
    registerIn<T>(injector: IInjector, type: Type<T>, options?: { provide?: Token<T>, singleton?: boolean, regIn?: 'root' }) {
        // make sure class register once.
        if (this.regedState.isRegistered(type)) {
            if (options?.provide) {
                injector.bindProvider(options.provide, type, this.regedState.getRegistered(type));
            }
            return this;
        }
        if (injector.has(type, true)) {
            return this;
        }

        const ctx = {
            injector,
            ...options,
            token: options?.provide,
            type
        } as DesignContext;
        this.provider.getInstance(DesignLifeScope).register(ctx);
        cleanObj(ctx);

        return this;
    }


    /**
    * get module loader.
    *
    * @returns {IModuleLoader}
    */
    getLoader(): IModuleLoader {
        return this.getValue(MODULE_LOADER);
    }

    async load(...modules: LoadType[]): Promise<Type[]> {
        return await this.getLoader()?.register(this, ...modules) ?? [];
    }

    getService<T>(target: Token<T> | ServiceOption<T>, ...providers: ProviderType[]): T {
        return this.getValue(SERVICE_PROVIDER)?.getService(this, target, ...providers) ?? null;
    }

    getServices<T>(target: Token<T> | ServicesOption<T>, ...providers: ProviderType[]): T[] {
        return this.getValue(SERVICE_PROVIDER)?.getServices(this, target, ...providers) ?? [];
    }

    getServiceProviders<T>(target: Token<T> | ServicesOption<T>): IProvider {
        return this.getValue(SERVICE_PROVIDER)?.getServiceProviders(this, target) ?? NULL_PDR;
    }

    protected initReg() {
        this.setValue(Injector, this);
        this.setValue(INJECTOR, this);
        registerCores(this);
    }

    protected parse(...providers: ProviderType[]): IProvider {
        return this.getInstance(PROVIDERS).inject(...providers);
    }

    protected createCustomFactory<T>(injector: IInjector, key: Token<T>, factory?: Factory<T>, singleton?: boolean) {
        return singleton ?
            (...providers: ProviderType[]) => {
                if (injector.hasValue(key)) {
                    return injector.getValue(key);
                }
                let instance = factory(this.parse({ provide: InjectToken, useValue: injector }, ...providers));
                injector.setValue(key, instance);
                return instance;
            }
            : (...providers: ProviderType[]) => factory(this.parse({ provide: InjectToken, useValue: injector }, ...providers));
    }

}

export const IocContainer = Container;


const NULL_PDR = new Provider(null);


const SERVICE: IServiceProvider = {

    getService<T>(injector: IInjector, target: Token<T> | ServiceOption<T>, ...providers: ProviderType[]): T {
        return injector.resolve(target as ResolveOption<T>, ...providers);
    },
    getServices<T>(injector: IInjector, target: Token<T> | ServicesOption<T>, ...providers: ProviderType[]): T[] {
        const tokens = isPlainObject(target) ?
            ((target as ServicesOption<T>).tokens ?? [(target as ServicesOption<T>).token])
            : [target];
        const services: T[] = [];
        injector.iterator((fac, key) => {
            if (tokens.indexOf(key)) {
                services.push(getFacInstance(fac, ...providers));
            }
        });
        return services;
    },
    getServiceProviders<T>(injector: IInjector, target: Token<T> | ServicesOption<T>): IProvider {
        return NULL_PDR;
    }
};

class RegisteredStateImpl implements RegisteredState {

    private decors: Map<string, IProvider>;
    constructor(private readonly container: IContainer) {
        this.decors = new Map();
    }

    /**
     * get injector
     * @param type
     */
    getInjector<T extends IInjector = IInjector>(type: ClassType): T {
        return getReged(type, this.container.id)?.getInjector() as T;
    }

    getRegistered<T extends Registered>(type: ClassType): T {
        return getReged(type, this.container.id) as T;
    }

    regType<T extends Registered>(type: ClassType, data: T) {
        setReged(type, this.container.id, data);
    }

    deleteType(type: ClassType) {
        delReged(type, this.container.id);
    }

    isRegistered(type: ClassType): boolean {
        return getReged(type, this.container.id) !== null;
    }

    hasProvider(decor: string) {
        return this.decors.has(decor);
    }

    getProvider(decor: string) {
        return this.decors.get(decor) ?? NULL_PDR;
    }

    regDecoator(decor: string, ...providers: ProviderType[]) {
        this.decors.set(decor, this.container.getInstance(PROVIDERS).inject(...providers));
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
class ActionProvider extends Provider implements IActionProvider {

    regAction(...types: Type<Action>[]): this {
        types.forEach(type => {
            if (this.has(type)) return;
            this.registerAction(type);
        });
        return this;
    }

    /**
    * register type class.
    * @param type the class type.
    * @param [options] the class prodvider to.
    * @returns {this}
    */
    registerType<T>(type: Type<T>, options?: { provide?: Token<T>, singleton?: boolean, regIn?: 'root' }): this;
    /**
     * register type class.
     * @param Type the class.
     * @param [provide] the class prodvider to.
     * @param [singleton]
     * @returns {this}
     */
    registerType<T>(type: Type<T>, provide?: Token<T>, singleton?: boolean): this;
    registerType<T>(type: Type<T>, provide?: any, singleton?: boolean): this {
        if (!provide && isBaseOf(type, Action)) {
            this.registerAction(type);
            return this;
        }
        return super.registerType(type, provide, singleton);
    }

    getAction<T extends Handler>(target: Token<Action> | Action | Function): T {
        if (target instanceof Action) {
            return target.toAction() as T;
        } else if (isBaseOf(target, Action)) {
            let act = this.get(target);
            return act ? act.toAction() as T : null;
        } else if (isFunction(target)) {
            return target as T
        }
        return null;
    }

    protected registerAction(type: Type<Action>) {
        if (this.has(type)) return true;
        const instance = new type(this) as Action & IActionSetup;

        this.setValue(type, instance);
        if (isFunction(instance.setup)) instance.setup();

        return true;
    }

}
