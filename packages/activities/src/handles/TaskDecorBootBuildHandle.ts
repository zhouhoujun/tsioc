import { BootHandle, BuilderService, SelectorManager } from '@tsdi/boot';
import { ActivityContext, ActivityOption, Activity } from '../core';
import { isArray, Type, isClass, isFunction } from '@tsdi/ioc';
import { SequenceActivity } from '../activities';

export class TaskDecorBootBuildHandle extends BootHandle {
    async execute(ctx: ActivityContext, next: () => Promise<void>): Promise<void> {
        if (!(ctx.target instanceof Activity)) {
            let template = ctx.template;
            let option: ActivityOption<ActivityContext> | Type<any>;
            if (isArray(template)) {
                option = { template: template, module: SequenceActivity };
            } else {
                if (isClass(template)) {
                    option = template;
                } else if (isFunction(template)) {
                    option = null;
                } else {
                    let md: Type<any>;
                    let mgr = this.container.get(SelectorManager);
                    if (isClass(template.activity)) {
                        md = template.activity;
                    } else {
                        md = mgr.get(template.activity)
                    }

                    option = {
                        module: md,
                        template: template
                    };
                }
            }
            if (option) {
                let bootctx = await this.container.get(BuilderService).build(option) as ActivityContext;
                ctx.bootstrap = bootctx.getBootTarget();
            }
        }

        await next();
    }
}
