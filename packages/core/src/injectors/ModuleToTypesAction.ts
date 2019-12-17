import { InjectAction } from './InjectAction';
import { InjectActionContext } from './InjectActionContext';
import { ModuleLoader } from '../services/ModuleLoader';

export class ModuleToTypesAction extends InjectAction {
    execute(ctx: InjectActionContext, next: () => void): void {
        if (!ctx.types) {
            ctx.types = ctx.get(ModuleLoader).getTypes(ctx.module);
        }
        ctx.registered = ctx.registered || [];
        next();
    }
}
