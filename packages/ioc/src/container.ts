import { Registered, TypeReflect } from './decor/type';
import { ClassType, LoadType, Type } from './types';
import { isFunction, isPlainObject } from './utils/chk';
import { Handler } from './utils/hdl';
import { isBaseOf } from './utils/lang';
import { IInjector, IModuleLoader, IProvider, ProviderOption, ResolveOption, ServiceOption, ServicesOption } from './IInjector';
import { IContainer, IServiceProvider, RegisteredState } from './IContainer';
import { MethodType } from './Invoker';
import { ProviderType, Token } from './tokens';
import { INJECTOR, INJECTOR_FACTORY, INVOKER, MODULE_LOADER, PROVIDERS, SERVICE_PROVIDER } from './utils/tk';
import { Action, IActionSetup } from './action';
import { IActionProvider } from './actions/act';
import { delReged, get, getReged, setReged } from './decor/refl';
import { Strategy } from './strategy';
import { Provider, Injector, getFacInstance } from './injector';
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

    createInjector(): IInjector {
        return this.getInstance(INJECTOR_FACTORY);
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
        return getReged(type, this.container.id)?.injector as T;
    }

    /**
     * get injector
     * @param type
     */
    getTypeProvider(type: ClassType): IProvider {
        return getReged(type, this.container.id)?.providers;
    }

    setTypeProvider(type: ClassType | TypeReflect, ...providers: ProviderType[]) {
        if (isFunction(type)) {
            get(type)?.extProviders.push(...providers);
            getReged(type, this.container.id)?.providers.inject(...providers);
        } else {
            type.extProviders.push(...providers);
            getReged(type.type, this.container.id)?.providers.inject(...providers);
        }
    }

    getInstance<T>(type: ClassType<T>, ...providers: ProviderType[]): T {
        const state = getReged(type, this.container.id);
        return (state.providers?.has(type)) ? state.providers.getInstance(type, ...providers) : state?.injector.getInstance(type, ...providers) ?? null;
    }

    resolve<T>(type: ClassType<T>, ...providers: ProviderType[]): T {
        return getReged(type, this.container.id)?.injector.resolve(type, ...providers) ?? null;
    }

    getRegistered<T extends Registered>(type: ClassType): T {
        return getReged(type, this.container.id);
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

    protected regType<T>(target: Type<T>, option?: ProviderOption) {
        if (!option && isBaseOf(target, Action)) {
            this.registerAction(target);
            return;
        }
        super.regType(target, option);
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
    }

}
