import { Actions, ActionType } from '../action';
import { IocContext } from './ctx';
import { Handler } from '../utils/hdl';



/**
 * actions.
 *
 * @export
 * @class IocActions
 * @extends {IocAction<T>}
 * @template T
 */
export class IocActions<T extends IocContext = IocContext> extends Actions<T, ActionType, Handler, void> {

    protected getActionProvider(ctx: T) {
        return ctx.injector.action();
    }

}


