import { BootHandle, BuilderService } from '@tsdi/boot';
import { Singleton, isArray, isClass, isUndefined, isString, hasOwnClassMetadata, lang } from '@tsdi/ioc';
import { ActivityContext, CompoiseActivity, SelectorManager, IActivityReflect, Activity } from '../core';


@Singleton
export class BuildTemplateHandle extends BootHandle {
    async execute(ctx: ActivityContext, next: () => Promise<void>): Promise<void> {
        let activity = ctx.getActivity();
        let template = ctx.template;
        if (template) {
            if (isArray(template)) {
                if (activity instanceof CompoiseActivity) {
                    activity.add(...template);
                }
            } else {
                let ref = this.container.getTypeReflects().get(ctx.module) as IActivityReflect;
                let mgr = this.container.get(SelectorManager);

                await Promise.all(Array.from(ref.inputs.keys()).map(async n => {
                    let tk = ref.inputs.get(n);
                    if (!isUndefined(template[n])) {
                        if (isString(tk) && mgr.hasRef(tk)) {
                            let ctx = await this.container.get(BuilderService).build<ActivityContext>({ module: mgr.getRef(tk), template: template[n] });
                            activity[n] = ctx.getActivity();
                        } else if (isClass(tk) && (
                            hasOwnClassMetadata(ctx.decorator, tk)
                            || lang.isExtendsClass(tk, Activity))) {
                            let ctx = await this.container.get(BuilderService).build<ActivityContext>({ module: tk, template: template[n] });
                            activity[n] = ctx.getActivity();
                        } else {
                            activity[n] = template[n];
                        }
                    }
                }));
            }
        }
        await next();
    }
}
