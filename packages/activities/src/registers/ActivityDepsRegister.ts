import { IocDesignAction, DesignActionContext } from '@tsdi/ioc';
import { ActivityMetadata } from '../core/ActivityMetadata';

export class ActivityDepsRegister extends IocDesignAction {

    execute(ctx: DesignActionContext, next: () => void): void {
        let metas = ctx.reflects.getMetadata<ActivityMetadata>(ctx.currDecoractor, ctx.type);
        let injector = ctx.injector;
        if (metas.length) {
            metas.forEach(m => {
                if (m.deps && m.deps.length) {
                    injector.inject(...m.deps);
                }
            });
        }
        next();
    }
}
