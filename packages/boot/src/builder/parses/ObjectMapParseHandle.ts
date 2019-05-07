import { CompositeParserHandle } from './ParseHandle';
import { ParseContext } from './ParseContext';
import { isBaseObject, isNullOrUndefined } from '@tsdi/ioc';
import { BuilderService } from '../services';

export class ObjectMapParseHandle extends CompositeParserHandle {
    async execute(ctx: ParseContext, next: () => Promise<void>): Promise<void> {
        if (isNullOrUndefined(ctx.bindingValue) && isBaseObject(ctx.template)) {
            let binding = ctx.binding;
            let template = ctx.template;
            let selector = ctx.selector;
            if (!selector) {
                selector = this.container.getTokenProvider(binding.provider || binding.type);
            }
            let bindingName = binding.bindingName || binding.name;
            let subTeamplat = template[bindingName];
            if (!isNullOrUndefined(subTeamplat)) {
                return await this.container.get(BuilderService).create({ module: selector, template: subTeamplat });
            }
        }
        if (isNullOrUndefined(ctx.bindingValue)) {
            await next();
        }
    }
}
