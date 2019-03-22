import { IocCompositeAction, IocActionContext, IocActionType } from '../actions';
import { Type } from '../types';
import { isArray } from '../utils';
import { IIocContainer } from '../IIocContainer';
import { getOwnParamerterNames } from '../factories';

/**
 * register Type init life scope action.
 *
 * @export
 * @class LifeScope
 * @extends {IocCoreService}
 */
export class LifeScope<T extends IocActionContext> extends IocCompositeAction<T> {

    protected afters: IocActionType[];
    constructor() {
        super();
        this.afters = [];
    }

    /**
     * resgister default action.
     *
     * @param {IIocContainer} container
     * @memberof LifeScope
     */
    registerDefault(container: IIocContainer) {
    }

    after(action: IocActionType) {
        if (!this.has(action)) {
            this.afters.push(action);
        }
    }

    execute(ctx: T, next?: () => void): void {
        this.execActions(ctx, this.actions.concat(this.afters), next);
    }

    /**
     * get paramerter names.
     *
     * @template T
     * @param {Type<T>} type
     * @param {string} propertyKey
     * @returns {string[]}
     * @memberof LifeScope
     */
    getParamerterNames<T>(type: Type<T>, propertyKey: string): string[] {
        let metadata = getOwnParamerterNames(type);
        let paramNames = [];
        if (metadata && metadata.hasOwnProperty(propertyKey)) {
            paramNames = metadata[propertyKey]
        }
        if (!isArray(paramNames)) {
            paramNames = [];
        }
        return paramNames;
    }

}
