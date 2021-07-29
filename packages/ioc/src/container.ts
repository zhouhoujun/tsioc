import { Registered, TypeReflect } from './metadata/type';
import { ClassType, Type } from './types';
import { isFunction } from './utils/chk';
import { Handler } from './utils/hdl';
import { cleanObj, isBaseOf } from './utils/lang';
import {
    IActionProvider, IInjector, RegisteredState, ProviderType, IContainer
} from './interface';
import { Token } from './tokens';
import { CONTAINER, INVOKER } from './metadata/tk';
import { get } from './metadata/refl';
import { Action, IActionSetup } from './action';
import { DefaultInjector, Injector } from './injector';
import { InvokerImpl } from './actions/invoker';
import { DesignLifeScope } from './actions/design';
import { RuntimeLifeScope } from './actions/runtime';


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

    constructor(providers: ProviderType[] = []) {
        super(providers);
        const red = { value: this };
        this.factories.set(CONTAINER, red);
        this.factories.set(Container, red);
        this._state = new RegisteredStateImpl(this);
        this._action = new ActionProvider([], this);
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
    getTypeProvider(type: ClassType): IInjector {
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
        return (state.providers?.has(type)) ? state.providers.get(type) : state?.injector.get(type) ?? null;
    }

    resolve<T>(type: ClassType<T>): T {
        return this.states.get(type)?.injector.resolve(type) ?? null;
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
class ActionProvider extends DefaultInjector implements IActionProvider {

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
export function registerCores(container: IContainer) {
    container.setValue(INVOKER, new InvokerImpl());
    // bing action.
    container.action().regAction(
        DesignLifeScope,
        RuntimeLifeScope
    );

}
