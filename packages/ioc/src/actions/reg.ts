import { Type } from '../types';
import { Handler } from '../utils/hdl';
import { DecoratorScope } from '../metadata/type';
import { get } from '../metadata/refl';
import { IocActions } from './act';
import { Action, IocAction } from '../action';
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
    if(!ctx.reflect){
        ctx.reflect = get(ctx.type, true);
    }
    if (ctx.reflect.singleton) {
        ctx.singleton = ctx.reflect.singleton;
    }

    if (next) {
        return next();
    }
}
