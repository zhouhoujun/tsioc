import { get } from '../metadata/refl';
import { IocActions } from './act';
import { Action } from '../action';
import { RegContext } from './ctx';


/**
 * ioc register action.
 *
 * the register type class can only register in ioc as:
 * ` container.registerSingleton(SubRegisterAction, () => new SubRegisterAction(container));`
 */
export abstract class IocRegAction<T extends RegContext> extends Action<T> { }

/**
 * register action scope.
 *  the register type class can only register in ioc as:
 * ` container.registerSingleton(SubRegisterAction, () => new SubRegisterAction(container));`
 *
 */
export abstract class IocRegScope<T extends RegContext = RegContext> extends IocActions<T> { }


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
