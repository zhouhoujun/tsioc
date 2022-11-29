import { get } from '../metadata/refl';
import { IocActions } from './act';
import { RegContext } from './ctx';


/**
 * register action scope.
 *  the register type class can only register in ioc as:
 * ` container.registerSingleton(SubRegisterAction, () => new SubRegisterAction(container));`
 *
 */
export abstract class IocRegScope<T extends RegContext = RegContext> extends IocActions<T> { }


export const InitReflectAction = function (ctx: RegContext, next?: () => void): void {
    if(!ctx.class){
        ctx.class = get(ctx.type)
    }
    if (ctx.class.annotation.singleton) {
        ctx.singleton = ctx.class.annotation.singleton
    }

    if (next) {
        return next()
    }
}
