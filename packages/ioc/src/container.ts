import { Registered, TypeReflect } from './decor/type';
import { ClassType, LoadType, Type } from './types';
import { isArray, isFunction, isPlainObject } from './utils/chk';
import { Handler } from './utils/hdl';
import { cleanObj, isBaseOf } from './utils/lang';
import {
    IActionProvider, IInjector, IModuleLoader, IProvider, RegisteredState,
    ServicesOption, ProviderType
} from './IInjector';
import { IContainer } from './IContainer';
import { MethodType } from './Invoker';
import { Token } from './tokens';
import { CONTAINER, INVOKER, MODULE_LOADER } from './utils/tk';
import { Action, IActionSetup } from './action';
import { get } from './decor/refl';
import { Strategy } from './strategy';
import { Provider, Injector, resolveRecord } from './injector';
import { registerCores } from './utils/regs';
import { Abstract } from './decor/decorators';

/**
 * default injector implantment.
 */
export class DefaultInjector extends Injector {
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
        return this.get(INVOKER).invoke(this, target, propertyKey, ...providers);
    }

    /**
     * get module loader.
     *
     * @returns {IModuleLoader}
     */
    getLoader(): IModuleLoader {
        return this.get(MODULE_LOADER);
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

    getServices<T>(target: Token<T> | ServicesOption<T>, ...providers: ProviderType[]): T[] {
        return this.getSvrPdr().getServices(this, target, ...providers) ?? [];
    }

    getServiceProviders<T>(target: Token<T> | ServicesOption<T>): IProvider {
        return this.getSvrPdr().getServiceProviders(this, target) ?? NULL_PROVIDER;
    }

    protected getSvrPdr() {
        return this.getContainer().get(ServicesProvider) ?? SERVICE;
    }

}

/**
 * create new injector.
 * @param parent
 * @param strategy
 * @returns
 */
export function createInjector(parent: IInjector, providers?: ProviderType[], strategy?: Strategy) {
    const inj = new DefaultInjector(parent, strategy);
    if (providers && providers.length) inj.inject(providers);
    return inj;
}

export const NULL_PROVIDER = new Provider(null);


/**
 * Container
 *
 * @export
 * @class Container
 * @implements {IContainer}
 */
export class Container extends DefaultInjector implements IContainer {

    private _state: RegisteredState;
    private _action: IActionProvider;
    readonly id: string;
    private _finals = [];

    constructor(strategy?: Strategy) {
        super(null, strategy);
        const red = { value: this };
        this.factories.set(CONTAINER, red);
        this.factories.set(Container, red);
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

export const IocContainer = Container;


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
     abstract getServices<T>(injector: IInjector, target: Token<T> | ServicesOption<T>, ...providers: ProviderType[]): T[];
     /**
      * get all provider service in the injector.
      *
      * @template T
      * @param {(Token<T> | ServicesOption<T>)} target
      * @returns {IProvider}
      */
      abstract getServiceProviders<T>(injector: IInjector, target: Token<T> | ServicesOption<T>): IProvider;
 }
 


const SERVICE: ServicesProvider = {

    getServices<T>(injector: IInjector, target: Token<T> | ServicesOption<T>, ...providers: ProviderType[]): T[] {
        const tokens = isPlainObject(target) ?
            ((target as ServicesOption<T>).tokens ?? [(target as ServicesOption<T>).token])
            : [target];
        const services: T[] = [];
        const pdr = this.toProvider(providers);
        injector.iterator((fac, key) => {
            if (tokens.indexOf(key)) {
                services.push(resolveRecord(fac, pdr));
            }
        });
        return services;
    },
    getServiceProviders<T>(injector: IInjector, target: Token<T> | ServicesOption<T>): IProvider {
        return NULL_PROVIDER;
    }
};


class RegisteredStateImpl implements RegisteredState {

    private states: Map<ClassType, Registered>;
    constructor(private readonly container: Container) {
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
            this.states.get(type)?.providers.inject(providers)
        } else {
            type.extProviders.push(...providers);
            this.states.get(type.type)?.providers.inject(providers);
        }
    }

    getInstance<T>(type: ClassType<T>, providers?: IProvider): T {
        const state = this.states.get(type);
        return (state.providers?.has(type)) ? state.providers.get(type, providers) : state?.injector.get(type, providers) ?? null;
    }

    resolve<T>(type: ClassType<T>, ...providers: ProviderType[]): T {
        return this.states.get(type)?.injector.resolve(type, ...providers) ?? null;
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
class ActionProvider extends Provider implements IActionProvider {

    protected init(parent: Container) {
        this._container = parent;
        this.parent = null;
        parent.onFinally(() => this.destroy());
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
