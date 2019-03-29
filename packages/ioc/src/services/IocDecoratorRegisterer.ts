import { IocCoreService } from './IocCoreService';
import { IocActionType } from '../actions';
import { isString } from '../utils';

/**
 * decorator register.
 *
 * @export
 * @class IocDecoratorRegisterer
 * @extends {IocCoreService}
 */
export class IocDecoratorRegisterer extends IocCoreService {
    protected actionMap: Map<string, IocActionType[]>;
    constructor() {
        super();
        this.actionMap = new Map();
    }

    getActions(): Map<string, IocActionType[]> {
        return this.actionMap;
    }

    /**
     * register decorator actions.
     *
     * @param {(string | Function)} decorator
     * @param {...IocActionType[]} actions
     * @memberof DecoratorRegister
     */
    register(decorator: string | Function, ...actions: IocActionType[]) {
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

    get(decorator: string | Function): IocActionType[] {
        let dec = this.getKey(decorator);
        if (this.actionMap.has(dec)) {
            return this.actionMap.get(dec);
        }
        return [];
    }
}

