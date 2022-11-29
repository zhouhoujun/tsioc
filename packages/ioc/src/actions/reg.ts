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
    if(!ctx.typeRef){
        ctx.typeRef = get(ctx.type)
    }
    if (ctx.typeRef.annotation.singleton) {
        ctx.singleton = ctx.typeRef.annotation.singleton
    }

    if (next) {
        return next()
    }
}
