import { ParseHandle } from './ParseHandle';
import { ParseContext } from './ParseContext';
import { isString } from '@tsdi/ioc';
import { BindingScopeDecoratorRegisterer } from './BindingScopeDecoratorRegisterer';
import { BindingExpression } from '../../bindings';


export class BindingScopeHandle extends ParseHandle {

    async execute(ctx: ParseContext, next: () => Promise<void>): Promise<void> {


        if (isString(ctx.template)) {
            await this.execFuncs(ctx, this.container.get(BindingScopeDecoratorRegisterer).getFuncs(this.container, ctx.decorator));
        }

        if (ctx.template instanceof BindingExpression) {
            ctx.template = ctx.template.resolve(ctx.scope);
        } else if (isString(ctx.template) && ctx.template.trim().startsWith('binding:')) {
            let bindingField = ctx.template.replace('binding:', '').trim();
            ctx.template = ctx.scope ? ctx.scope[bindingField] : undefined;
        }


        await next();

    }
}
