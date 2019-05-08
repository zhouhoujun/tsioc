import { ParseHandle, ParseContext, SelectorManager } from '@tsdi/boot';
import { isString, isClass, hasOwnClassMetadata, lang, Type, isMetadataObject } from '@tsdi/ioc';
import { Activity } from '../core';

export class TaskDecorSelectorHandle extends ParseHandle {
    async execute(ctx: ParseContext, next: () => Promise<void>): Promise<void> {
        if (this.isActivity(ctx.decorator, ctx.template)) {
            ctx.selector = ctx.template;
            ctx.template = null
        } else if (isMetadataObject(ctx.template) && ctx.template.activity) {
            let mgr = this.container.get(SelectorManager);
            let activity = ctx.template.activity;
            if (isString(activity) && mgr.has(activity)) {
                ctx.selector = mgr.get(activity);
            } else if (this.isActivity(ctx.decorator, activity)) {
                ctx.selector = activity;
            }
            ctx.template.activity = null;
        }
        if (!ctx.selector && this.isActivity(ctx.decorator, ctx.binding.provider)) {
            ctx.selector = ctx.binding.provider;
        }
        if (!ctx.selector && this.isActivity(ctx.decorator, ctx.binding.type)) {
            ctx.selector = ctx.binding.type;
        }

        if (!ctx.selector) {
            await next();
        }
    }

    isActivity(decorator: string, activity: any): activity is Type<Activity<any>> {
        return isClass(activity) && (hasOwnClassMetadata(decorator, activity) || lang.isExtendsClass(activity, Activity));
    }
}
