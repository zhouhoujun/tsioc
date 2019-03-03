import { IocCoreService } from './IocCoreService';
import { IAction, IocAction, IocActionContext, execAction } from '../actions';
import { Type } from '../types';
import { isClass, isArray } from '../utils';
import { IIocContainer } from '../IIocContainer';
import { getOwnParamerterNames } from '../factories';

/**
 * register Type init life scope action.
 *
 * @export
 * @class LifeScope
 * @extends {IocCoreService}
 */
export abstract class LifeScope extends IocCoreService {

    actions: (IocAction | Type<IocAction> | IAction<any>)[];
    constructor() {
        super();
        this.actions = [];
    }

    use<T>(action: IocAction | Type<IocAction> | IAction<T>): this {
        this.actions.push(action);
        return this;
    }

    abstract registerDefault(container: IIocContainer);

    execute(container: IIocContainer, ctx: IocActionContext, next?: () => void) {
       this.execActions(container, ctx, this.actions, next);
    }

    protected execActions(container: IIocContainer, ctx: IocActionContext, actions: (IocAction | Type<IocAction> | IAction<any>)[], next?: () => void){
        execAction(actions.map(ac => {
            if (isClass(ac)) {
                return (ctx: IocActionContext) => container.resolve(ac).execute(container, ctx);
            } else if (ac instanceof IocAction) {
                return (ctx: IocActionContext) => ac.execute(container, ctx);
            }
            return ac
        }), ctx, next);
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
