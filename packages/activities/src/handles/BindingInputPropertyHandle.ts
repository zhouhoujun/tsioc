import { BootHandle, BuilderService } from '@tsdi/boot';
import { ActivityContext, SelectorManager, Activity, TemplateType, IPropertyBinding } from '../core';
import { isString, hasOwnClassMetadata, lang, isToken, isBaseType, isClass, Token, isMetadataObject, isNullOrUndefined, isArray } from '@tsdi/ioc';

export class BindingInputPropertyHandle extends BootHandle {
    async execute(ctx: ActivityContext, next: () => Promise<void>): Promise<void> {
        let binding = ctx.currPropertyBinding;
        let value = await this.resolveBindingProperty(ctx, binding, binding.bindingValue);
        if (!isNullOrUndefined(value)) {
            let activity = ctx.getActivity();
            activity[binding.name] = value;
        } else {
            await next();
        }
    }

    protected async resolveBindingProperty<T>(ctx: ActivityContext, binding: IPropertyBinding<T>, bindingValue: any) {
        let value: any = null;
        if (isClass(bindingValue) && !isBaseType(bindingValue) && bindingValue !== Error) {
            value = await this.resolveBindingValue(ctx, binding.name, bindingValue, null);
        } else if (isMetadataObject(bindingValue)) {
            value = await this.resolveBindingValue(ctx, binding.name, binding.provider, null, bindingValue);
        } else {
            value = await this.resolveBindingValue(ctx, binding.name, binding.provider, bindingValue);
        }
        console.log(value);
        return value;
    }

    protected async resolveBindingValue<T>(ctx: ActivityContext, name: string, tk: Token<T>, value: any, template?: TemplateType) {

        let mgr = this.container.get(SelectorManager);
        let hasValue = isNullOrUndefined(value);

        if (isString(tk) && mgr.hasRef(tk)) {
            let providers = hasValue ? [{ provide: mgr.getRefName(tk), useValue: value }, ...ctx.providers] : ctx.providers;
            let actx = await this.container.get(BuilderService).build<ActivityContext>({ module: mgr.getRef(tk), template: template, providers: providers });
            return actx.getActivity();
        } else if (mgr.hasRef(name)) {
            let providers = hasValue ? [{ provide: mgr.getRefName(name), useValue: value }, ...ctx.providers] : ctx.providers;
            let actx = await this.container.get(BuilderService).build<ActivityContext>({ module: mgr.getRef(name), template: template, providers: providers });
            return actx.getActivity();
        } else if (isClass(tk) && (hasOwnClassMetadata(ctx.decorator, tk) || lang.isExtendsClass(tk, Activity))) {
            let providers = hasValue ? [{ provide: name, useValue: value }, ...ctx.providers] : ctx.providers;
            let actx = await this.container.get(BuilderService).build<ActivityContext>({ module: tk, template: template, providers: providers });
            return actx.getActivity();
        } else if (isToken(tk)) {
            let providers = hasValue ? [{ provide: name, useValue: value }, ...ctx.providers] : ctx.providers;
            return this.container.resolve(tk, ...providers);
        } else {
            return value;
        }
    }
}

export class BindingArrayInputPropertyHandle extends BindingInputPropertyHandle {
    async execute(ctx: ActivityContext, next: () => Promise<void>): Promise<void> {
        let binding = ctx.currPropertyBinding;
        if (binding.type === Array) {
            if (isArray(binding.bindingValue)) {
                let value = await Promise.all(binding.bindingValue.map(bval => this.resolveBindingProperty(ctx, binding, bval)));
                let activity = ctx.getActivity();
                activity[binding.name] = value;
            } else {
                throw new Error(`Template for '${ctx.module}', it binding property '${binding.bindingName || binding.name}' type error, binding value is not Array.`)
            }
        } else {
            await next();
        }
    }
}
