import { ParseHandle, ParsersHandle } from './ParseHandle';
import { ParseContext } from './ParseContext';
import { isNullOrUndefined, lang, isString, isMetadataObject } from '@tsdi/ioc';
import { BindingScopeDecoratorRegisterer } from './BindingScopeDecoratorRegisterer';
import { BindingExpression } from '../../bindings';


export class AssignValueScope extends ParsersHandle {

    setup() {
        this.container.register(BindingScopeDecoratorRegisterer);
        this.use(BindingScopeHandle)
            .use(AssignBindValueHandle)
            .use(AssignRefBindParseHandle)
            .use(AssignDefaultValueHandle)
    }

}

export class BindingScopeHandle extends ParseHandle {

    async execute(ctx: ParseContext, next: () => Promise<void>): Promise<void> {

        let regs = this.container.get(BindingScopeDecoratorRegisterer);
        if (isString(ctx.bindExpression) && regs.has(ctx.decorator)) {
            await this.execFuncs(ctx, regs.getFuncs(this.container, ctx.decorator));
        }

        if (ctx.bindExpression instanceof BindingExpression) {
            ctx.value = ctx.bindExpression.resolve(ctx.scope);
        } else if (isString(ctx.bindExpression) && ctx.bindExpression.trim().startsWith('binding:')) {
            let bindingField = ctx.bindExpression.replace('binding:', '').trim();
            ctx.value = ctx.scope ? ctx.scope[bindingField] : undefined;
        }

        if (isNullOrUndefined(ctx.value)) {
            await next();
        }

    }
}

export class AssignBindValueHandle extends ParseHandle {
    async execute(ctx: ParseContext, next: () => Promise<void>): Promise<void> {

        if (!isNullOrUndefined(ctx.bindExpression)) {
            if (ctx.binding && ctx.binding.type) {
                let ttype = lang.getClass(ctx.bindExpression);
                if (lang.isExtendsClass(ttype, ctx.binding.type)) {
                    ctx.value = ctx.bindExpression;
                }
            } else {
                ctx.value = ctx.bindExpression;
            }
        }

        if (isNullOrUndefined(ctx.value)) {
            await next();
        }
    }
}

export class AssignRefBindParseHandle extends ParseHandle {
    async execute(ctx: ParseContext, next: () => Promise<void>): Promise<void> {

        if (ctx.binding && isMetadataObject(ctx.template)) {
            let refBind = ctx.template[ctx.binding.bindingName || ctx.binding.name];
            if (!isNullOrUndefined(refBind)) {
                if (ctx.binding.type) {
                    let ttype = lang.getClass(refBind);
                    if (lang.isExtendsClass(ttype, ctx.binding.type)) {
                        ctx.value = refBind;
                    }
                } else {
                    ctx.value = refBind;
                }
            }
        }

        if (isNullOrUndefined(ctx.value)) {
            await next();
        }
    }
}


export class AssignDefaultValueHandle extends ParseHandle {
    async execute(ctx: ParseContext, next: () => Promise<void>): Promise<void> {

        if (ctx.binding) {
            ctx.value = ctx.binding.defaultValue;
        }

        if (isNullOrUndefined(ctx.value)) {
            await next();
        }
    }
}
