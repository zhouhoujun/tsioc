import { BuilderService, SelectorManager, ResolveHandle, BuildContext } from '@tsdi/boot';
import { ActivityContext, ActivityOption, Activity } from '../core';
import { isArray, Type, isClass, isFunction } from '@tsdi/ioc';
import { SequenceActivity } from '../activities';

export class TaskDecorBootBuildHandle extends ResolveHandle {
    async execute(ctx: BuildContext, next: () => Promise<void>): Promise<void> {
        if (!(ctx.target instanceof Activity)) {
            let template = ctx.template;
            let md: Type<any>;
            if (isArray(template)) {
                md = SequenceActivity;
            } else {
                if (isClass(template)) {
                    md = template;
                } else {
                    let mgr = this.container.get(SelectorManager);
                    if (isClass(template.activity)) {
                        md = template.activity;
                    } else {
                        md = mgr.get(template.activity)
                    }
                }
            }
            ctx.target = await this.container.get(BuilderService).resolve(md, template, ctx.getRaiseContainer(), ...(ctx.providers || []));
        }

        await next();
    }
}
