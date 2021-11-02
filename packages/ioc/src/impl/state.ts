import { Injector, ProviderType, Registered, RegisteredState } from '../injector';
import { get } from '../metadata/refl';
import { TypeReflect } from '../metadata/type';
import { ClassType } from '../types';
import { isFunction } from '../utils/chk';
import { cleanObj } from '../utils/lang';

/**
 * registered state.
 */
export class RegisteredStateImpl implements RegisteredState {

    private states: Map<ClassType, Registered>;
    constructor() {
        this.states = new Map();
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

    destroy() {
        this.states.forEach(v => {
            if (!v) return;
            v.providers?.destroy();
            v.injector?.destroy();
            cleanObj(v);
        });
        this.states.clear();
    }
}
