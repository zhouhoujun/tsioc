import { IocResolveServiceAction, ResolveServiceContext } from '@tsdi/core';
import { getOwnTypeMetadata, isClassType, lang, InjectReference } from '@tsdi/ioc';
import { ActivityMetadata } from '../../metadatas';
import { BootContext } from '@tsdi/boot';
import { ActivityContext } from '../ActivityContext';

export class TaskDecoratorServiceAction extends IocResolveServiceAction {
    execute(ctx: ResolveServiceContext<any>, next: () => void): void {
        if (!isClassType(ctx.currTargetType)) {
            return next();
        }

        let stype = this.container.getTokenProvider(ctx.currToken || ctx.token);

        if (!ctx.instance && lang.isExtendsClass(stype, BootContext)) {
            let metas = getOwnTypeMetadata<ActivityMetadata>(ctx.currDecorator, ctx.currTargetType);
            metas.some(m => {
                if (m && m.contextType && lang.isExtendsClass(m.contextType, stype)) {
                    ctx.instance = this.container.get(m.contextType, ...ctx.providers);
                }
                return !!ctx.instance;
            });
            if (!ctx.instance) {
                let ref = new InjectReference(BootContext, ctx.currDecorator);
                if (this.container.has(ref)) {
                    this.resolve(ctx, ref);
                } else {
                    this.resolve(ctx, ActivityContext);
                }
            }
        }
        if (!ctx.instance) {
            next();
        }
    }
}
