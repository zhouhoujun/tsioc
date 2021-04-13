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

    /**
     * actions constructor.
     * @param provider action provider.
     */
    constructor(protected provider: IActionProvider) {
        super();
    }

    protected regHandle(ac: any) {
        if (isBaseOf(ac, Action)) this.provider.regAction(ac);
    }

    protected toHandle(ac: any) {
        return this.provider.getAction(ac);
    }

}


