import { IocResolveServiceAction, ResolveServiceContext } from '@tsdi/core';
import { Singleton, getOwnTypeMetadata } from '@tsdi/ioc';
import { Task } from '../decorators';
import { ActivityMetadata } from '../metadatas';
import { ActivityContext } from '../core';

@Singleton
export class TaskDecoratorServiceAction extends IocResolveServiceAction {
    execute(ctx: ResolveServiceContext<any>, next: () => void): void {
        let metas = getOwnTypeMetadata<ActivityMetadata>(Task, ctx.currTargetType);
        metas.some(m => {
            if (m && m.contextType) {
                ctx.instance = this.container.get(m.contextType, ...ctx.providers);
            }
            return !!ctx.instance;
        });

        console.log(metas);
        if (!ctx.instance) {
            if (!ctx.defaultToken) {
                ctx.defaultToken = ActivityContext;
            }
            return next();
        }
    }
}
