import { Type, DecoratorScope } from '../types';
import { isClass, Handler } from '../utils/lang';
import { IocActions } from './act';
import { Action, IocAction } from '../action';
import { refl } from '../decor/reflects';
import { RegContext } from './ctx';


/**
 * ioc register action.
 *
 * the register type class can only register in ioc as:
 * ` container.registerSingleton(SubRegisterAction, () => new SubRegisterAction(container));`
 */
export abstract class IocRegAction<T extends RegContext> extends IocAction<T> { }

/**
 * register action scope.
 *  the register type class can only register in ioc as:
 * ` container.registerSingleton(SubRegisterAction, () => new SubRegisterAction(container));`
 *
 */
export abstract class IocRegScope<T extends RegContext = RegContext> extends IocActions<T> { }

export interface IScopeAction<TAction extends Function = Handler> {
    scope: DecoratorScope;
    action: TAction | Type<Action> | (TAction | Type<Action>)[];
}


export const InitReflectAction = function (ctx: RegContext, next?: () => void): void {
    if (!isClass(ctx.type)) {
        return;
    }
    const tgref = ctx.reflect = refl.get(ctx.type);
    if (tgref.singleton) {
        ctx.singleton = tgref.singleton;
    }

    if (next) {
        return next();
    }
}
