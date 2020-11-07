import { Action, IActionSetup } from './Action';
import { IActionProvider } from './actions/act';
import { CacheManager } from './actions/cache';
import { DesignContext } from './actions/ctx';
import { DesignLifeScope } from './actions/design';
import { ResolveOption } from './actions/res';
import { ResolveLifeScope } from './actions/resolve';
import { IInjector, IProvider } from './IInjector';
import { IIocContainer, Registered, RegisteredState } from './IIocContainer';
import { MethodType } from './IMethodAccessor';
import { DIProvider, Injector } from './injector';
import { Factory, InjectToken, InstanceFactory, isToken, Provider, SymbolType, Token } from './tokens';
import { ClassType, Type } from './types';
import { Handler, isClass, isDefined, isFunction, lang } from './utils/lang';
import { registerCores } from './utils/regs';
import { INJECTOR, INJECTOR_FACTORY, METHOD_ACCESSOR, PROVIDERS } from './utils/tk';



export class InjectorImpl extends Injector {

    private rslScope: ResolveLifeScope;

    constructor(parent: IInjector) {
        super(parent);
        this.initReg();
    }


    /**
     * register provider.
     *
     * @template T
     * @param {Token<T>} provide
     * @param { Factory<T>} fac
     * @returns {this}
     * @memberof ProviderMap
     */
    register<T>(provide: Token<T>, fac?: Factory<T>): this {
        this.getContainer()?.registerFactory(this, provide, fac);
        return this;
    }

    registerType<T>(type: Type<T>, provide?: Token<T>, singleton?: boolean): this {
        this.getContainer()?.registerIn(this, type, provide, singleton);
        return this;
    }

    /**
     * register provider.
     *
     * @template T
     * @param {Token<T>} provide
     * @param { Factory<T>} fac
     * @returns {this}
     * @memberof ProviderMap
     */
    registerSingleton<T>(provide: Token<T>, fac?: Factory<T>): this {
        this.getContainer()?.registerFactory(this, provide, fac, true);
        return this;
    }

    /**
     * resolve instance with token and param provider via resolve scope.
     *
     * @template T
     * @param {(Token<T> | ResolveOption<T>)} token
     * @param {...Provider[]} providers
     * @returns {T}
     * @memberof IocContainer
     */
    resolve<T>(token: Token<T> | ResolveOption<T>, ...providers: Provider[]): T {
        if (!this.rslScope) {
            this.rslScope = this.getContainer().actionPdr.getInstance(ResolveLifeScope);
        }
        return this.rslScope.resolve(this, token, ...providers);
    }

    /**
     * invoke method.
     *
     * @template T
     * @param {(T | Type<T>)} target type of class or instance
     * @param {MethodType} propertyKey
     * @param {T} [instance] instance of target type.
     * @param {...Provider[]} providers
     * @returns {TR}
     * @memberof BaseInjector
     */
    invoke<T, TR = any>(target: T | Type<T>, propertyKey: MethodType<T>, ...providers: Provider[]): TR {
        return this.getValue(METHOD_ACCESSOR).invoke(this, target, propertyKey, ...providers);
    }

    protected initReg() {
        this.setValue(INJECTOR, this, lang.getClass(this));
        this.setValue(CacheManager, new CacheManager(this));
    }

}

/**
 * Container
 *
 * @export
 * @class IocContainer
 * @implements {IIocContainer}
 */
export class IocContainer extends Injector implements IIocContainer {

    private rslScope: ResolveLifeScope;

    readonly regedState: RegisteredState;
    readonly actionPdr: IActionProvider;

    constructor() {
        super();
        this.regedState = new RegisteredStateImpl(this);
        this.actionPdr = new ActionProvider(this);
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
     * @param {...Provider[]} providers
     * @returns {T}
     * @memberof IocContainer
     */
    resolve<T>(token: Token<T> | ResolveOption<T>, ...providers: Provider[]): T {
        if (!this.rslScope) {
            this.rslScope = this.actionPdr.getInstance(ResolveLifeScope);
        }
        return this.rslScope.resolve(this, token, ...providers);
    }

    /**
     * invoke method.
     *
     * @template T
     * @param {(T | Type<T>)} target type of class or instance
     * @param {MethodType} propertyKey
     * @param {T} [instance] instance of target type.
     * @param {...Provider[]} providers
     * @returns {TR}
     * @memberof BaseInjector
     */
    invoke<T, TR = any>(target: T | Type<T>, propertyKey: MethodType<T>, ...providers: Provider[]): TR {
        return this.getValue(METHOD_ACCESSOR).invoke(this, target, propertyKey, ...providers);
    }

    createInjector(): IInjector {
        return this.getInstance(INJECTOR_FACTORY);
    }

    /**
     * register type.
     * @abstract
     * @template T
     * @param {Token<T>} token
     * @param {T} [fac]
     * @returns {this}
     * @memberOf Container
     */
    register<T>(token: Token<T>, fac?: Factory<T>): this {
        this.registerFactory(this, token, fac);
        return this;
    }

    registerSingleton<T>(token: Token<T>, fac?: Factory<T>): this {
        this.registerFactory(this, token, fac, true);
        return this;
    }

    registerFactory<T>(injector: IInjector, token: Token<T>, value?: Factory<T>, singleton?: boolean): this {
        (async () => {
            let key = injector.getTokenKey(token);
            let classFactory;
            if (isDefined(value)) {
                if (isFunction(value)) {
                    if (isClass(value)) {
                        this.registerIn(injector, value, key, singleton);
                    } else {
                        classFactory = this.createCustomFactory(injector, key, value, singleton);
                    }
                } else if (singleton && value !== undefined) {
                    classFactory = this.createCustomFactory(injector, key, () => value, singleton);
                }

            } else if (isClass(key)) {
                this.registerIn(injector, key, null, singleton);
            }

            if (classFactory) {
                injector.set(key, classFactory);
            }
        })();
        return this;
    }

    /**
     * register type class.
     * @param type the class.
     * @param [provide] the class prodvider to.
     * @param [singleton]
     */
    registerType<T>(type: Type<T>, provide?: Token<T>, singleton?: boolean): this {
        return this.registerIn(this, type, provide, singleton);
    }
    /**
     * register type class.
     * @param injector register in the injector.
     * @param type the class.
     * @param [provide] the class prodvider to.
     * @param [singleton]
     */
    registerIn<T>(injector: IInjector, type: Type<T>, provide?: Token<T>, singleton?: boolean) {
        // make sure class register once.
        if (this.regedState.isRegistered(type) || this.hasRegister(type)) {
            if (provide) {
                this.set(provide, (...providers) => this.regedState.getInjector(type).get(type, ...providers));
            }
            return this;
        }

        const ctx = {
            injector,
            token: provide,
            type,
            singleton
        } as DesignContext;
        this.actionPdr.getInstance(DesignLifeScope).register(ctx);
        lang.cleanObj(ctx);

        return this;
    }

    protected initReg() {
        this.setValue(INJECTOR, this, lang.getClass(this));
        registerCores(this);
    }

    protected parse(...providers: Provider[]): IProvider {
        return this.getInstance(PROVIDERS).inject(...providers);
    }

    protected createCustomFactory<T>(injector: IInjector, key: SymbolType<T>, factory?: InstanceFactory<T>, singleton?: boolean) {
        return singleton ?
            (...providers: Provider[]) => {
                if (injector.hasValue(key)) {
                    return injector.getValue(key);
                }
                let instance = factory(this.parse({ provide: InjectToken, useValue: injector }, ...providers));
                injector.setValue(key, instance);
                return instance;
            }
            : (...providers: Provider[]) => factory(this.parse({ provide: InjectToken, useValue: injector }, ...providers));
    }

    protected destroying() {
        super.destroying();
    }
}



const NULL_PDR = new DIProvider();

class RegisteredStateImpl implements RegisteredState {
    private types: Map<ClassType, Registered>;
    private decors: Map<string, IProvider>;
    constructor(private readonly container: IIocContainer) {
        this.types = new Map();
        this.decors = new Map();
    }

    /**
      * get injector
      * @param type
      */
    getInjector<T extends IInjector = IInjector>(type: ClassType): T {
        return this.types.get(type)?.getInjector() as T;
    }

    getRegistered<T extends Registered>(type: ClassType): T {
        return this.types.get(type) as T;
    }

    regType<T extends Registered>(type: ClassType, data: T) {
        this.types.set(type, { ... this.types.get(type), ...data });
    }

    deleteType(type: ClassType) {
        this.types.delete(type);
    }

    isRegistered(type: ClassType): boolean {
        return this.types.has(type);
    }

    hasProvider(decor: string) {
        return this.decors.has(decor);
    }

    getProvider(decor: string) {
        return this.decors.get(decor) ?? NULL_PDR;
    }
    regDecoator(decor: string, ...providers: Provider[]) {
        this.decors.set(decor, this.container.getInstance(PROVIDERS).inject(...providers));
    }

}


/**
 * action injector.
 */
class ActionProvider extends DIProvider implements IActionProvider {

    regAction<T extends Action>(type: Type<T>): this {
        if (this.hasTokenKey(type)) {
            return this;
        }
        this.registerAction(type);
        return this;
    }

    registerType<T>(type: Type<T>, provide?: Token<T>, singleton?: boolean): this {
        if (!provide && this.registerAction(type)) {
            return this;
        }
        this.getContainer().registerIn(this, type, provide, singleton);
        return this;
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
