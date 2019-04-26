import { BootHandle, BuilderService } from '@tsdi/boot';
import { Singleton, isArray, isClass, isUndefined, hasOwnClassMetadata, lang, isString } from '@tsdi/ioc';
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

                await Promise.all(Array.from(ref.inputBindings.keys()).map(async n => {
                    let binding = ref.inputBindings.get(n);
                    let tk = binding.provider;
                    let tempVal = template[binding.bindingName || binding.name];
                    if (!isUndefined(tempVal)) {
                        if (isString(tk) && mgr.hasRef(tk)) {
                            let ctx = await this.container.get(BuilderService).build<ActivityContext>({ module: mgr.getRef(tk), providers: [{ provide: mgr.getRefName(tk), useValue: tempVal }] });
                            activity[n] = ctx.getActivity();
                        } else if (mgr.hasRef(n)) {
                            let ctx = await this.container.get(BuilderService).build<ActivityContext>({ module: mgr.getRef(n), providers: [{ provide: mgr.getRefName(n), useValue: tempVal }] });
                            activity[n] = ctx.getActivity();
                        } else if (isClass(tk) && (hasOwnClassMetadata(ctx.decorator, tk) || lang.isExtendsClass(tk, Activity))) {
                            let providers = [{ provide: n, useValue: tempVal }];
                            let ctx = await this.container.get(BuilderService).build<ActivityContext>({ module: tk, template: tempVal, providers: providers });
                            activity[n] = ctx.getActivity();
                        } else {
                            activity[n] = tempVal;
                        }
                    }
                }));
            }
        }
        await next();
    }
}
