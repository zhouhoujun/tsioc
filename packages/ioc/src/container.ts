import { Action, IActionSetup } from './action';
import { IActionProvider } from './actions/act';
import { DesignContext } from './actions/ctx';
import { DesignLifeScope } from './actions/design';
import { ResolveOption } from './actions/res';
import { ResolveLifeScope } from './actions/resolve';
import { delReged, getReged, setReged } from './decor/refl';
import { Registered } from './decor/type';
import { IInjector, IProvider } from './IInjector';
import { IIocContainer, RegisteredState } from './IIocContainer';
import { MethodType } from './IMethodAccessor';
import { Provider, Injector } from './injector';
import { FactoryLike, InjectToken, Factory, isToken, ProviderType, SymbolType, Token, getTokenKey } from './tokens';
import { ClassType, Type } from './types';
import { getClass, isClass, isNil, isFunction } from './utils/chk';
import { Handler } from './utils/hdl';
import { cleanObj, isExtendsClass } from './utils/lang';
import { registerCores } from './utils/regs';
import { INJECTOR, INJECTOR_FACTORY, METHOD_ACCESSOR, PROVIDERS } from './utils/tk';


/**
 * injector implantment.
 */
export class InjectorImpl extends Injector {

    constructor(parent: IInjector) {
        super(parent);
        this.initReg();
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
     * register type.
     * @param type type.
     * @param provide provide.
     * @param singleton singleton or not.
     */
    registerType<T>(type: Type<T>, provide?: Token<T>, singleton?: boolean): this {
        this.getContainer().registerIn(this, type, provide, singleton);
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

    protected initReg() {
        this.setValue(INJECTOR, this, getClass(this));
    }
}

let id = 0;
/**
 * Container
 *
 * @export
 * @class IocContainer
 * @implements {IIocContainer}
 */
export class IocContainer extends Injector implements IIocContainer {

    readonly regedState: RegisteredState;
    readonly provider: IActionProvider;
    readonly id: string;

    constructor() {
        super();
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
                    this.registerIn(injector, value, key, singleton);
                } else {
                    const classFactory = this.createCustomFactory(injector, key, value, singleton);
                    injector.set(key, classFactory);
                }
            } else if (!isNil(value)) {
                injector.set(key, { value });
            }

        } else if (isClass(key)) {
            this.registerIn(injector, key, null, singleton);
        }

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
        this.provider.getInstance(DesignLifeScope).register(ctx);
        cleanObj(ctx);

        return this;
    }

    protected initReg() {
        const type = getClass(this);
        this.setValue(Injector, this, type);
        this.setValue(INJECTOR, this, type);
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



const NULL_PDR = new Provider();

class RegisteredStateImpl implements RegisteredState {

    private decors: Map<string, IProvider>;
    constructor(private readonly container: IIocContainer) {
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

    registerType<T>(type: Type<T>, provide?: Token<T>, singleton?: boolean): this {
        if (!provide && this.registerAction(type)) {
            return this;
        }
        this.getContainer().registerIn(this, type, provide, singleton);
        return this;
    }

    protected registerAction(type: Type) {
        if (isExtendsClass(type, Action)) {
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
