import { isClassType } from '@tsdi/ioc';
import { ResolveServicesContext } from './ResolveServicesContext';

export const ResovleServicesAction = function (ctx: ResolveServicesContext, next: () => void): void {
    let types = ctx.types;
    let services = ctx.services;
    let reflects = ctx.reflects;
    ctx.injector.iterator((fac, tk) => {
        if (!services.has(tk) && isClassType(tk) && types.some(ty => reflects.isExtends(tk, ty))) {
            services.set(tk, fac);
        }
    }, true)
    next();
};
