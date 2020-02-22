import { lang } from '@tsdi/ioc';
import { InjectActionContext } from './InjectActionContext';

export const ModuleToTypesAction = function (ctx: InjectActionContext, next: () => void): void {
    if (!ctx.types) {
        ctx.types = lang.getTypes(ctx.module);
    }
    ctx.registered = ctx.registered || [];
    next();
};
