import { IBinding, SelectorManager } from '../core';
import { isString, hasOwnClassMetadata, isToken, isBaseType, isClass, Token, isMetadataObject, isNullOrUndefined, isArray } from '@tsdi/ioc';
import { BootHandle } from './BootHandle';
import { BootContext } from '../BootContext';
import { BuilderService } from '../services';

export class BindingInputPropertyHandle extends BootHandle {
    async execute(ctx: BootContext, next: () => Promise<void>): Promise<void> {
        let binding = ctx.currPropertyBinding;
        let value = await this.resolveBindingProperty(ctx, binding, binding.bindingValue);
        if (!isNullOrUndefined(value)) {
            let activity = ctx.target;
            activity[binding.name] = value;
        } else {
            await next();
        }
    }

    protected async resolveBindingProperty<T>(ctx: BootContext, binding: IBinding<T>, bindingValue: any) {
        let value: any = null;
        if (isClass(bindingValue) && !isBaseType(bindingValue) && bindingValue !== Error) {
            value = await this.resolveBindingValue(ctx, binding.name, bindingValue, null);
        } else if (isMetadataObject(bindingValue)) {
            value = await this.resolveBindingValue(ctx, binding.name, binding.provider, null, bindingValue);
        } else {
            value = await this.resolveBindingValue(ctx, binding.name, binding.provider, bindingValue);
        }
        return value;
    }

    protected async resolveBindingValue<T>(ctx: BootContext, name: string, tk: Token<T>, value: any, template?: any) {

        let mgr = this.container.get(SelectorManager);
        let hasValue = isNullOrUndefined(value);

        if (isString(tk) && mgr.hasAttr(tk)) {
            let providers = hasValue ? [{ provide: mgr.getAttrName(tk), useValue: value }, ...ctx.providers] : ctx.providers;
            let actx = await this.container.get(BuilderService).build({ module: mgr.getAttr(tk), template: template, providers: providers });
            return actx.getBootTarget();
        } else if (mgr.hasAttr(name)) {
            let providers = hasValue ? [{ provide: mgr.getAttrName(name), useValue: value }, ...ctx.providers] : ctx.providers;
            let actx = await this.container.get(BuilderService).build({ module: mgr.getAttr(name), template: template, providers: providers });
            return actx.getBootTarget();
        } else if (isClass(tk) && (hasOwnClassMetadata(ctx.decorator, tk))) {
            let providers = hasValue ? [{ provide: name, useValue: value }, ...ctx.providers] : ctx.providers;
            let actx = await this.container.get(BuilderService).build({ module: tk, template: template, providers: providers });
            return actx.getBootTarget();
        } else if (isToken(tk)) {
            let providers = hasValue ? [{ provide: name, useValue: value }, ...ctx.providers] : ctx.providers;
            return this.container.resolve(tk, ...providers);
        } else {
            return value;
        }
    }
}

export class BindingArrayInputPropertyHandle extends BindingInputPropertyHandle {
    async execute(ctx: BootContext, next: () => Promise<void>): Promise<void> {
        let binding = ctx.currPropertyBinding;
        if (binding.type === Array) {
            if (isArray(binding.bindingValue)) {
                let value = await Promise.all(binding.bindingValue.map(bval => this.resolveBindingProperty(ctx, binding, bval)));
                let target = ctx.currTarget;
                target[binding.name] = value;
            } else {
                throw new Error(`Template for '${ctx.module}', it binding property '${binding.bindingName || binding.name}' type error, binding value is not Array.`)
            }
        } else {
            await next();
        }
    }
}
