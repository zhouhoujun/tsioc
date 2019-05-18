import { SelectorManager, TemplateContext, TemplateHandle } from '@tsdi/boot';
import { isString, isClass, hasOwnClassMetadata, lang, Type, isMetadataObject, isArray } from '@tsdi/ioc';
import { Activity } from '../core';
import { SequenceActivity } from '../activities';

export class TaskDecorSelectorHandle extends TemplateHandle {
    async execute(ctx: TemplateContext, next: () => Promise<void>): Promise<void> {
        if (isArray(ctx.template) && ctx.annoation.template === ctx.template) {
            ctx.selector = SequenceActivity;
        } else if (this.isActivity(ctx.decorator, ctx.template)) {
            ctx.selector = ctx.template;
            ctx.template = null;
        } else if (isMetadataObject(ctx.template) && ctx.template.activity) {
            let mgr = this.container.get(SelectorManager);
            let activity = ctx.template.activity;
            if (isString(activity) && mgr.has(activity)) {
                ctx.selector = mgr.get(activity);
            } else if (this.isActivity(ctx.decorator, activity)) {
                ctx.selector = activity;
            }
        }

        if (!ctx.selector) {
            await next();
        }
    }

    isActivity(decorator: string, activity: any): activity is Type<Activity<any>> {
        return isClass(activity) && (hasOwnClassMetadata(decorator, activity) || lang.isExtendsClass(activity, Activity));
    }
}
