import { Registered, TypeReflect } from './decor/type';
import { ClassType, LoadType, Type } from './types';
import { isFunction, isPlainObject } from './utils/chk';
import { Handler } from './utils/hdl';
import { isBaseOf } from './utils/lang';
import {
    IActionProvider, IInjector, IModuleLoader, IProvider, RegisteredState,
    ProviderOption, ResolveOption, ServiceOption, ServicesOption
} from './IInjector';
import { IContainer, IServiceProvider } from './IContainer';
import { MethodType } from './Invoker';
import { ProviderType, Token } from './tokens';
import { INJECTOR, INVOKER, MODULE_LOADER, SERVICE_PROVIDER } from './utils/tk';
import { Action, IActionSetup } from './action';
import { get } from './decor/refl';
import { Strategy } from './strategy';
import { Provider, Injector, getFacInstance } from './injector';
import { registerCores } from './utils/regs';

/**
 * injector implantment.
 */
export class InjectorImpl extends Injector {

    constructor(parent?: IInjector, strategy?: Strategy) {
        super(parent, strategy);
        this.setValue(Injector, this);
        this.setValue(INJECTOR, this);
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
        return this.getValue(INVOKER).invoke(this, target, propertyKey, ...providers);
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
        return this.getSvrPdr().getService(this, target, ...providers);
    }

    getServices<T>(target: Token<T> | ServicesOption<T>, ...providers: ProviderType[]): T[] {
        return this.getSvrPdr().getServices(this, target, ...providers) ?? [];
    }

    getServiceProviders<T>(target: Token<T> | ServicesOption<T>): IProvider {
        return this.getSvrPdr().getServiceProviders(this, target) ?? NULL_PROVIDER;
    }

    protected getSvrPdr() {
        return this.getContainer().getValue(SERVICE_PROVIDER) ?? SERVICE;
    }

}

/**
 * create new injector.
 * @param parent
 * @param strategy
 * @returns
 */
export function createInjector(parent: IInjector, strategy?: Strategy) {
    return new InjectorImpl(parent, strategy);
}

export const NULL_PROVIDER = new Provider(null);


/**
 * Container
 *
 * @export
 * @class Container
 * @implements {IContainer}
 */
export class Container extends InjectorImpl implements IContainer {

    private _state: RegisteredState;
    private _action: IActionProvider;
    readonly id: string;

    constructor() {
        super(null);
        this._state = new RegisteredStateImpl(this);
        this._action = new ActionProvider(this);
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
    action(): IActionProvider {
        return this._action;
    }

}

export const IocContainer = Container;




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
                services.push(getFacInstance(fac, providers));
            }
        });
        return services;
    },
    getServiceProviders<T>(injector: IInjector, target: Token<T> | ServicesOption<T>): IProvider {
        return NULL_PROVIDER;
    }
};


class RegisteredStateImpl implements RegisteredState {

    private decors: Map<string, IProvider>;
    private states: WeakMap<ClassType, Registered>;
    constructor(private readonly container: IContainer) {
        this.decors = new Map();
        this.states = new WeakMap();
    }

    /**
     * get injector
     * @param type
     */
    getInjector<T extends IInjector = IInjector>(type: ClassType): T {
        return this.states.get(type)?.injector as T;
    }

    /**
     * get injector
     * @param type
     */
    getTypeProvider(type: ClassType): IProvider {
        return this.states.get(type)?.providers;
    }

    setTypeProvider(type: ClassType | TypeReflect, ...providers: ProviderType[]) {
        if (isFunction(type)) {
            get(type)?.extProviders.push(...providers);
            this.states.get(type)?.providers.inject(...providers)
        } else {
            type.extProviders.push(...providers);
            this.states.get(type.type)?.providers.inject(...providers);
        }
    }

    getInstance<T>(type: ClassType<T>, ...providers: ProviderType[]): T {
        const state = this.states.get(type);
        return (state.providers?.has(type)) ? state.providers.getInstance(type, ...providers) : state?.injector.getInstance(type, ...providers) ?? null;
    }

    resolve<T>(type: ClassType<T>, ...providers: ProviderType[]): T {
        return this.states.get(type)?.injector.resolve(type, ...providers) ?? null;
    }

    getRegistered<T extends Registered>(type: ClassType): T {
        return this.states.get(type) as T;
    }

    regType<T extends Registered>(type: ClassType, data: T) {
        this.states.set(type, data);
    }

    deleteType(type: ClassType) {
        this.states.delete(type);
    }

    isRegistered(type: ClassType): boolean {
        return this.states.has(type);
    }

    hasProvider(decor: string) {
        return this.decors.has(decor);
    }

    getProvider(decor: string) {
        return this.decors.get(decor) ?? NULL_PROVIDER;
    }

    regDecoator(decor: string, ...providers: ProviderType[]) {
        this.decors.set(decor, this.container.parseProvider(...providers));
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

    protected regType<T>(target: Type<T>, option?: ProviderOption) {
        if (!option && isBaseOf(target, Action)) {
            this.registerAction(target);
            return;
        }
        super.regType(target, option);
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
