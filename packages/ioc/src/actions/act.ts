import { Actions } from '../action';
import { IocContext } from './ctx';



/**
 * actions.
 *
 * @export
 * @class IocActions
 * @extends {IocAction<T>}
 * @template T
 */
export class IocActions<T extends IocContext = IocContext> extends Actions<T, void> {

    protected override getPlatform(ctx: T) {
        return ctx.injector.platform();
    }

}
