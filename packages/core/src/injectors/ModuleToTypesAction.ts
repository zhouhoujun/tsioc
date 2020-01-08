import { InjectActionContext } from './InjectActionContext';
import { ModuleLoader } from '../services/ModuleLoader';

export const ModuleToTypesAction = function (ctx: InjectActionContext, next: () => void): void {
    if (!ctx.types) {
        ctx.types = ctx.get(ModuleLoader).getTypes(ctx.module);
    }
    ctx.registered = ctx.registered || [];
    next();
};
