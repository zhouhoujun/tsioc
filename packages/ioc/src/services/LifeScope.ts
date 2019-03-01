import { IocCoreService } from './IocCoreService';
import { IAction, IocAction, IocActionContext, execAction } from '../actions';
import { Type } from '../types';
import { IocContainer } from '../IocContainer';
import { isClass } from '../utils';

/**
 * register Type init life scope action.
 *
 * @export
 * @class LifeScope
 * @extends {IocCoreService}
 */
export class LifeScope extends IocCoreService {

    actions: (IocAction | Type<IocAction> | IAction<any>)[];
    constructor() {
        super();
        this.actions = [];
    }

    use<T>(action: IocAction | Type<IocAction> | IAction<T>): this {
        this.actions.push(action);
        return this;
    }

    execute(container: IocContainer, ctx: IocActionContext, next?: () => void) {
        execAction(this.actions.map(ac => {
            if (isClass(ac)) {
                return (ctx: IocActionContext) => container.resolve(ac).execute(container, ctx);
            } else if (ac instanceof IocAction) {
                return (ctx: IocActionContext) => ac.execute(container, ctx);
            }
            return ac
        }), ctx, next);
    }
}

