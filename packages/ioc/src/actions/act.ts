import { Type } from '../types';
import { Handler, isClass } from '../utils/lang';
import { Token } from '../tokens';
import { IProvider } from '../IInjector';
import { Action, Actions } from '../action';
import { IocContext } from './ctx';

/**
 * action injector.
 */
export interface IActionProvider extends IProvider {
    /**
     * register action, simple create instance via `new type(this)`.
     * @param type
     */
    regAction<T extends Action>(type: Type<T>): this;
    /**
     * get action via target.
     * @param target target.
     */
    getAction<T extends Handler>(target: Token<Action> | Action | Function): T;
}



/**
 * actions.
 *
 * @export
 * @class IocActions
 * @extends {IocAction<T>}
 * @template T
 */
export class IocActions<T extends IocContext = IocContext> extends Actions<T> {


    constructor(protected actInjector: IActionProvider) {
        super();
    }

    protected regAction(ac: any) {
        if (isClass(ac)) {
            this.actInjector.regAction(ac);
        }
    }

    protected toHandle(ac: any) {
        return this.actInjector.getAction(ac);
    }

}


