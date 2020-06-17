import { Token, Type, TokenId } from '../types';
import { Handler } from '../utils/lang';
import { ProviderTypes } from '../providers/types';
import { IInjector, IProviders } from '../IInjector';
import { tokenId } from '../InjectToken';

/**
 * action context option.
 *
 * @export
 * @interface ActCtxOption
 */
export interface ActCtxOption {
    /**
     * providers for contexts.
     *
     * @type {(ProviderTypes[] | IProviders)}
     * @memberof BootOption
     */
    contexts?: ProviderTypes[] | IProviders;
}

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
    getAction<T extends Function>(target: Token<Action> | Action | Function): T;
}

export const ActionInjectorToken: TokenId<IActionInjector> = tokenId<IActionInjector>('ACTION_INJECTOR');

/**
 * action interface.
 */
export abstract class Action {
    constructor(actInjector?: IActionInjector) {
    }

    abstract toAction(): Function;
}

/**
 * action setup.
 */
export interface IActionSetup {
    /**
     * setup action.
     */
    setup();
}


/**
 * ioc action type.
 */
export type ActionType<T extends Action = Action, TAction = Handler> = Token<T> | T | TAction;

