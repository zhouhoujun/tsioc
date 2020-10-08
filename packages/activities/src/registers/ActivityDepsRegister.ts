import { DesignContext } from '@tsdi/ioc';
import { ActivityMetadata } from '../core/ActivityMetadata';

export const ActivityDepsRegister = function (ctx: DesignContext, next: () => void): void {
    let metas = ctx.reflects.getMetadata<ActivityMetadata>(ctx.currDecor, ctx.type);
    let injector = ctx.injector;
    if (metas.length) {
        metas.forEach(m => {
            if (m.deps && m.deps.length) {
                injector.inject(...m.deps);
            }
        });
    }
    next();
};

