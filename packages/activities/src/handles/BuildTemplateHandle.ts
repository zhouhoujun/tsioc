import { BootHandle, BuilderService } from '@tsdi/boot';
import { ActivityContext, CompoiseActivity, SelectorManager } from '../core';
import { Singleton, isArray } from '@tsdi/ioc';

@Singleton
export class BuildTemplateHandle extends BootHandle {
    async execute(ctx: ActivityContext, next: () => Promise<void>): Promise<void> {
        let activity = ctx.getActivity();
        if (ctx.annoation) {
            activity.onActivityInit(ctx.annoation);
        }
        let template = ctx.template;
        if (template) {
            if (isArray(template)) {
                if (activity instanceof CompoiseActivity) {
                    activity.add(...template);
                }
            } else {
                let mgr = this.container.get(SelectorManager);
                await Promise.all(Object.keys(template).map(async n => {
                    let refSelector = `[${n}]`;
                    if (mgr.has(refSelector)) {
                        let option = { module: mgr.get(refSelector) };
                        option[n] = template[n];
                        let ctx = await this.container.get(BuilderService).build<ActivityContext>(option);
                        activity[n] = ctx.getActivity();
                    }
                }));
            }
        }
        await next();
    }
}
