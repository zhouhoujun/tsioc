import { Token, Type } from '../types';
import { lang } from '../utils/lang';
import { ProviderTypes } from '../providers/types';
import { IInjector } from '../IInjector';
import { InjectToken } from '../InjectToken';

/**
 * action context option.
 *
 * @export
 * @interface ActionContextOption
 */
export interface ActionContextOption {
    /**
     * providers for contexts.
     *
     * @type {(ProviderTypes[] | IInjector)}
     * @memberof BootOption
     */
    contexts?: ProviderTypes[] | IInjector;
    /**
     * injector.
     */
    injector?: IInjector;
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

export const ActionInjectorToken = new InjectToken<IActionInjector>('ACTION_INJECTOR');


/**
 * action interface.
 */
export abstract class Action {
    abstract toAction(): Function;
}

/**
 * action setup.
 */
export interface IActionSetup {
    setup();
}


/**
 * ioc action type.
 */
export type ActionType<T extends Action = Action, TAction = lang.Action> = Token<T> | T | TAction;

