import { BuilderService, SelectorManager, BootHandle, BootContext } from '@tsdi/boot';
import { Activity } from '../core';
import { isArray, Type, isClass } from '@tsdi/ioc';
import { SequenceActivity } from '../activities';

export class TaskDecorBootBuildHandle extends BootHandle {

    async execute(ctx: BootContext, next: () => Promise<void>): Promise<void> {
        if (!(ctx.target instanceof Activity) && !(ctx.bootstrap instanceof Activity)) {
            let template = ctx.template || ctx.annoation.template;
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
            ctx.target = await this.container.get(BuilderService).resolve(md, { template: template, providers: ctx.providers }, ctx.getRaiseContainer());
        }
        await next();
    }
}
