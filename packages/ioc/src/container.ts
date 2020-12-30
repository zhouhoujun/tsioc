import { Action, IActionProvider, IActionSetup } from './actions/Action';
import { DesignContext } from './actions/des-act';
import { DesignLifeScope } from './actions/design';
import { ResolveLifeScope } from './actions/resolve';
import { IContainer } from './IContainer';
import { IInjector, IModuleLoader, IProvider, ResolveOption, ServiceOption, ServicesOption } from './IInjector';
import { MethodType } from './IMethodAccessor';
import { Injector, Provider } from './injector';
import { ITypeReflects } from './services/ITypeReflects';
import { Factory, FactoryLike, getTokenKey, InjectToken, isToken, ProviderType, SymbolType, Token } from './tokens';
import { ClassType, LoadType, Type } from './types';
import { Handler, isClass, isFunction, isNil, lang } from './utils/lang';
import { registerCores } from './utils/regs';
import { INJECTOR, InjectorProxyToken, INJECTOR_FACTORY, METHOD_ACCESSOR, MODULE_LOADER, PROVIDERS, SERVICE_PROVIDER, TypeReflectsToken } from './utils/tk';




/**
 * injector implantment.
 */
export class InjectorImpl extends Injector {

    constructor(parent: IInjector) {
        super(parent);
        this.initReg();
    }

    getValue<T>(token: Token<T>, deep?: boolean): T {
        return this.factories.get(getTokenKey(token))?.value || (deep !== false ? this.parent?.getValue(token, deep) : null);
    }

    /**
     * register provider.
     *
     * @template T
     * @param {Token<T>} provide
     * @param { FactoryLike<T>} fac
     * @returns {this}
     */
    register<T>(provide: Token<T>, fac?: FactoryLike<T>): this {
        this.getContainer().registerFactory(this, provide, fac);
        return this;
    }

    /**
     * register provider.
     *
     * @template T
     * @param {Token<T>} provide
     * @param { FactoryLike<T>} fac
     * @returns {this}
     */
    registerSingleton<T>(provide: Token<T>, fac?: FactoryLike<T>): this {
        this.getContainer().registerFactory(this, provide, fac, true);
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
        return this.getValue(SERVICE_PROVIDER)?.getService(this, target, ...providers) ?? null;
    }

    getServices<T>(target: Token<T> | ServicesOption<T>, ...providers: ProviderType[]): T[] {
        return this.getValue(SERVICE_PROVIDER)?.getServices(this, target, ...providers) ?? [];
    }

    getServiceProviders<T>(target: Token<T> | ServicesOption<T>): IProvider {
        return this.getValue(SERVICE_PROVIDER)?.getServiceProviders(this, target) ?? NULL_PDR;
    }

    protected initReg() {
        this.setValue(INJECTOR, this);
        this.setValue(Injector, this);
        this.setValue(InjectorProxyToken, () => this);
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

    readonly provider: IActionProvider;
    readonly id: string;

    constructor() {
        super(null);
        this.id = `c${id++}`;
        this.provider = new ActionProvider(this);
        this.initReg();
    }

    getContainer(): this {
        return this;
    }

    getActionInjector() {
        return this.provider;
    }

    private reflects: ITypeReflects;
    getTypeReflects(): ITypeReflects {
        if (!this.reflects) {
            this.reflects = this.getValue(TypeReflectsToken);
        }
        return this.reflects;
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

    getInjector(type: Type): IInjector {
        return this.getTypeReflects().getInjector(type);
    }

    /**
     * register type.
     * @abstract
     * @template T
     * @param {Token<T>} token
     * @param {T} [fac]
     * @returns {this}
     */
    register<T>(token: Token<T>, fac?: FactoryLike<T>): this {
        this.registerFactory(this, token, fac);
        return this;
    }

    registerSingleton<T>(token: Token<T>, fac?: FactoryLike<T>): this {
        this.registerFactory(this, token, fac, true);
        return this;
    }

    registerFactory<T>(injector: IInjector, token: Token<T>, value?: FactoryLike<T>, singleton?: boolean): this {
        let key = getTokenKey(token);
        if (!isNil(value)) {
            if (isFunction(value)) {
                if (isClass(value)) {
                    this.registerIn(injector, value, { provide: key, singleton });
                } else {
                    const classFactory = this.createCustomFactory(injector, key, value, singleton);
                    injector.set(key, classFactory);
                }
            } else if (!isNil(value)) {
                injector.set(key, { value });
            }

        } else if (isClass(key)) {
            this.registerIn(injector, key, { singleton });
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
        if (this.getTypeReflects().hasRegister(type) || injector.has(type, true)) {
            if (options?.provide) {
                this.set(options?.provide, (...providers) => this.getTypeReflects().getInjector(type).get(type, ...providers));
            }
            return this;
        }

        const ctx = {
            injector,
            ...options,
            token: options?.provide,
            type
        } as DesignContext;
        this.provider.getInstance(DesignLifeScope).register(ctx);
        lang.cleanObj(ctx);

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
        this.setValue(InjectorProxyToken, () => this);
        registerCores(this);
    }

    protected parse(...providers: ProviderType[]): IProvider {
        return this.getInstance(PROVIDERS).inject(...providers);
    }

    protected createCustomFactory<T>(injector: IInjector, key: SymbolType<T>, factory?: Factory<T>, singleton?: boolean) {
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
            if (this.hasTokenKey(type)) return;
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
        if (!provide && this.registerAction(type)) return this;
        return super.registerType(type, provide, singleton);
    }

    protected registerAction(type: Type) {
        if (lang.isExtendsClass(type, Action)) {
            if (this.hasTokenKey(type)) {
                return true;
            }
            let instance = this.setupAction(type) as Action & IActionSetup;
            if (instance instanceof Action && isFunction(instance.setup)) {
                instance.setup();
            }
            return true;
        }
        return false;
    }

    protected setupAction(type: Type<Action>): Action {
        let instance = new type(this);
        this.setValue(type, instance);
        return instance;
    }

    getAction<T extends Handler>(target: Token<Action> | Action | Function): T {
        if (target instanceof Action) {
            return target.toAction() as T;
        } else if (isToken(target)) {
            let act = this.get(target);
            return act ? act.toAction() as T : null;
        } else if (isFunction(target)) {
            return target as T
        }
        return null;
    }
}

