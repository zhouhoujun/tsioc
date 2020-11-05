import { Type } from '../types';
import { Handler, isClass } from '../utils/lang';
import { Token, tokenId, TokenId } from '../tokens';
import { IInjector, IProvider } from '../IInjector';
import { Action, Actions } from '../Action';
import { IocContext } from './ctx';

/**
 * action injector.
 */
export interface IActionInjector extends IInjector {
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

export const ActionInjectorToken: TokenId<IActionInjector> = tokenId<IActionInjector>('ACTION_INJECTOR');



/**
 * actions.
 *
 * @export
 * @class IocActions
 * @extends {IocAction<T>}
 * @template T
 */
export class IocActions<T extends IocContext = IocContext> extends Actions<T> {


    constructor(protected actInjector: IActionInjector) {
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


