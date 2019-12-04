import { Type } from '../types';
import { IIocContainer } from '../IIocContainer';
import { IocCoreService } from '../IocCoreService';
import { isFunction } from '../utils/lang';

/**
 * action registerer.
 *
 * @export
 * @class ActionRegisterer
 */
export class ActionRegisterer extends IocCoreService {
    private maps: Map<Type, any>;

    constructor() {
        super()
        this.maps = new Map();
    }

    /**
     * has action type or not.
     *
     * @param {Type<T>} type
     * @returns {boolean}
     * @memberof ActionRegisterer
     */
    has<T>(type: Type<T>): boolean {
        return this.maps.has(type);
    }

    /**
     * get action of type.
     *
     * @template T
     * @param {Type<T>} type
     * @returns {T}
     * @memberof ActionRegisterer
     */
    get<T>(type: Type<T>): T {
        return this.maps.get(type) as T || null;
    }

    /**
     * register action.
     *
     * @param {IIocContainer} container
     * @param {Type<T>} action
     * @param {boolean} [setup]
     * @returns {this}
     * @memberof ActionRegisterer
     */
    register<T>(container: IIocContainer, action: Type<T>, setup?: boolean): this {
        if (this.maps.has(action)) {
            return this;
        }
        let instance = new action(container);
        this.maps.set(action, instance);
        if (setup) {
            this.setup(instance);
        }
        return this;
    }

    protected setup(action: any) {
        if (isFunction(action.setup)) {
            action.setup();
        }
    }
}
