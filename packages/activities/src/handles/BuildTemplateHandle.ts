import { BootHandle } from '@tsdi/boot';
import { ActivityContext, Activities } from '../core';
import { Singleton, isArray, isClass, isFunction } from '@tsdi/ioc';

@Singleton
export class BuildTemplateHandle extends BootHandle {
    async execute(ctx: ActivityContext, next: () => Promise<void>): Promise<void> {
        let template = ctx.template;
        let option = isArray(template) ? { body: template, activity: Activities.sequence } : template;
        if (isClass(option) || isFunction(option)) {
            await ctx.getActivity().init({ body: [option], activity: Activities.sequence })
        } else {
            await ctx.getActivity().init(option);
        }

        await next();
    }
}
