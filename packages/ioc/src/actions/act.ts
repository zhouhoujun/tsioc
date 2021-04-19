import { isBaseOf } from '../utils/lang';
import { Action, Actions } from '../action';
import { IocContext } from './ctx';
import { IActionProvider } from '../IInjector';



/**
 * actions.
 *
 * @export
 * @class IocActions
 * @extends {IocAction<T>}
 * @template T
 */
export class IocActions<T extends IocContext = IocContext> extends Actions<T> {


    protected getActionProvider(ctx: T) {
        return ctx.injector.action();
    }


    protected parseHandle(provider: IActionProvider, ac: any) {
        if (isBaseOf(ac, Action) && !provider.has(ac)) {
            provider.regAction(ac);
        }
        return provider.getAction(ac);
    }

}


