import { IocCoreService } from './IocCoreService';
import { isString } from '../utils';
import { IocActionType } from '../actions';

/**
 * decorator action registerer.
 *
 * @export
 * @class IocDecoratorRegisterer
 * @extends {IocCoreService}
 */
export class DecoratorRegisterer<T> extends IocCoreService {
    protected actionMap: Map<string, T[]>;
    constructor() {
        super();
        this.actionMap = new Map();
    }

    get size(): number {
        return this.actionMap.size;
    }

    getActions(): Map<string, T[]> {
        return this.actionMap;
    }

    getDecorators(): string[] {
        return Array.from(this.actionMap.keys());
    }

    /**
     * register decorator actions.
     *
     * @param {(string | Function)} decorator
     * @param {...T[]} actions
     * @memberof DecoratorRegister
     */
    register(decorator: string | Function, ...actions: T[]) {
        let dec = this.getKey(decorator);
        if (this.actionMap.has(dec)) {
            this.actionMap.get(dec).concat(actions);
        } else {
            this.actionMap.set(dec, actions);
        }
    }

    has(decorator: string | Function): boolean {
        let dec = this.getKey(decorator);
        return this.actionMap.has(dec);
    }

    getKey(decorator: string | Function) {
        return isString(decorator) ? decorator : decorator.toString();
    }

    get(decorator: string | Function): T[] {
        let dec = this.getKey(decorator);
        if (this.actionMap.has(dec)) {
            return this.actionMap.get(dec);
        }
        return [];
    }
}

/**
 * ioc decorator registerer.
 *
 * @export
 * @class IocDecoratorRegisterer
 * @extends {DecoratorRegisterer<IocActionType>}
 */
export class IocDecoratorRegisterer extends DecoratorRegisterer<IocActionType> {

}
