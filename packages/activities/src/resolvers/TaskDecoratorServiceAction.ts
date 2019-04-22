import { IocResolveServiceAction, ResolveServiceContext } from '@tsdi/core';
import { Singleton, getOwnTypeMetadata, isClassType } from '@tsdi/ioc';
import { Task } from '../decorators';
import { ActivityMetadata } from '../metadatas';
import { ActivityContext } from '../core';

@Singleton
export class TaskDecoratorServiceAction extends IocResolveServiceAction {
    execute(ctx: ResolveServiceContext<any>, next: () => void): void {
        console.log('TaskDecoratorServiceAction');
        if (!isClassType(ctx.currTargetType)) {
            return next();
        }
        let metas = getOwnTypeMetadata<ActivityMetadata>(Task, ctx.currTargetType);
        metas.some(m => {
            if (m && m.contextType) {
                ctx.instance = this.container.get(m.contextType, ...ctx.providers);
            }
            return !!ctx.instance;
        });

        if (!ctx.instance) {
            if (!ctx.defaultToken) {
                ctx.defaultToken = ActivityContext;
            }
            return next();
        }
    }
}
