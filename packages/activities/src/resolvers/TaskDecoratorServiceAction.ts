import { IocResolveServiceAction, ResolveServiceContext } from '@tsdi/core';
import { Singleton, getOwnTypeMetadata, isClassType, lang } from '@tsdi/ioc';
import { Task } from '../decorators';
import { ActivityMetadata } from '../metadatas';
import { ActivityContext } from '../core';
import { BootContext } from '@tsdi/boot';

@Singleton
export class TaskDecoratorServiceAction extends IocResolveServiceAction {
    execute(ctx: ResolveServiceContext<any>, next: () => void): void {
        if (!isClassType(ctx.currTargetType)) {
            return next();
        }
        let metas = getOwnTypeMetadata<ActivityMetadata>(Task, ctx.currTargetType);
        let stype = this.container.getTokenProvider(ctx.currToken || ctx.token);
        metas.some(m => {
            if (m && lang.isExtendsClass(m.contextType, stype)) {
                ctx.instance = this.container.get(m.contextType, ...ctx.providers);
            }
            return !!ctx.instance;
        });


        if (!ctx.instance && lang.isExtendsClass(stype, BootContext)) {
            this.resolve(ctx, ActivityContext);
        }
        if (!ctx.instance) {
            next();
        }
    }
}
