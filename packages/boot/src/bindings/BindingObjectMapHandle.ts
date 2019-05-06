import { CompositeBindingHandle } from './BindingHandle';
import { BindingContext } from './BindingContext';
import { isBaseObject, Type, isNullOrUndefined } from '@tsdi/ioc';
import { SelectorManager } from '../core';
import { BuilderService } from '../services';

export class BindingObjectMapHandle extends CompositeBindingHandle {
    async execute(ctx: BindingContext, next: () => Promise<void>): Promise<void> {
        if (this.isEmpty(ctx) && isBaseObject(ctx.template)) {
            let binding = ctx.binding;
            let template = ctx.template;
            let selector = null; // this.getSelector(template);
            let moduleType: Type<any>;
            if (selector) {
                moduleType = this.container.get(SelectorManager).get(selector);
            }
            if (!moduleType) {
                moduleType = this.container.getTokenProvider(binding.provider || binding.type);
            }
            let bindingName = binding.bindingName || binding.name;
            let subTeamplat = template[bindingName];
            if (!isNullOrUndefined(subTeamplat)) {
                return await this.container.get(BuilderService).create({ module: moduleType, template: subTeamplat });
            }
        }
        if (this.isEmpty(ctx)) {
            await next();
        }
    }
}
