import { isClassType } from '@tsdi/ioc';
import { ResolveServicesContext } from './ResolveServicesContext';

export const ResovleServicesAction = function (ctx: ResolveServicesContext, next: () => void): void {
    let types = ctx.types;
    ctx.injector.iterator((fac, tk) => {
        if (!ctx.services.has(tk) && isClassType(tk) && types.some(ty => ctx.reflects.isExtends(tk, ty))) {
            ctx.services.set(tk, fac);
        }
    }, true)
    next();
};
