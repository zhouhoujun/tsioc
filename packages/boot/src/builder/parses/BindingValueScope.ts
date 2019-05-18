import { ParseHandle, ParsersHandle } from './ParseHandle';
import { ParseContext } from './ParseContext';
import { isNullOrUndefined, lang, isString, isMetadataObject, Singleton, Type, isClass } from '@tsdi/ioc';
import { BindingExpression } from '../../bindings';
import { IocASyncDecoratorRegisterer, SelectorManager, RegScope } from '../../core';
import { BuilderService } from '../BuilderService';


export class BindingValueScope extends ParsersHandle {

    setup() {
        this.container.register(BindExpressionDecoratorRegisterer);
        this.use(BindingScopeHandle)
            .use(TranslateAtrrHandle)
            .use(AssignBindValueHandle)
            .use(AssignDefaultValueHandle)
    }

}

@Singleton
export class BindExpressionDecoratorRegisterer extends IocASyncDecoratorRegisterer<Type<ParseHandle>> {

}

export class BindingScopeHandle extends ParseHandle {

    async execute(ctx: ParseContext, next: () => Promise<void>): Promise<void> {

        let regs = this.container.get(BindExpressionDecoratorRegisterer);
        if (isString(ctx.bindExpression) && regs.has(ctx.decorator)) {
            await this.execFuncs(ctx, regs.getFuncs(this.container, ctx.decorator));
        }

        if (ctx.bindExpression instanceof BindingExpression) {
            ctx.bindExpression = ctx.bindExpression.resolve(ctx.scope);
        } else if (isString(ctx.bindExpression) && ctx.bindExpression.trim().startsWith('binding:')) {
            let bindingField = ctx.bindExpression.replace('binding:', '').trim();
            ctx.bindExpression = ctx.scope ? ctx.scope[bindingField] : undefined;
        }

        if (isNullOrUndefined(ctx.value)) {
            await next();
        }
    }
}

export class TranslateAtrrHandle extends ParseHandle {
    async execute(ctx: ParseContext, next: () => Promise<void>): Promise<void> {

        if (ctx.binding && !isNullOrUndefined(ctx.bindExpression)) {
            let mgr = this.container.get(SelectorManager);
            let pdr = ctx.binding.provider;
            let selector: Type<any>;
            let template = ctx.bindExpression;
            // template[ctx.binding.bindingName || ctx.binding.name] = ctx.bindExpression;
            if (isString(pdr) && mgr.hasAttr(pdr)) {
                selector = mgr.getAttr(pdr);
            } else if (isClass(ctx.binding.provider) && mgr.has(ctx.binding.provider)) {
                selector = ctx.binding.provider;
            } else if (isClass(ctx.binding.type) && mgr.has(ctx.binding.type)) {
                selector = ctx.binding.type;
            }

            if (selector) {
                let container = ctx.getRaiseContainer();
                if (container.has(selector)) {
                    ctx.value = await this.container.get(BuilderService).resolve(selector, {
                        scope: ctx.scope,
                        template: template,
                        providers: ctx.providers
                    });
                } else {
                    ctx.value = await this.container.get(BuilderService).createBoot({
                        module: selector,
                        scope: ctx.scope,
                        template: template,
                        regScope: RegScope.boot, providers: ctx.providers
                    });
                }
            }

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


// export class AssignRefBindParseHandle extends ParseHandle {
//     async execute(ctx: ParseContext, next: () => Promise<void>): Promise<void> {
//         if (ctx.binding && isMetadataObject(ctx.template)) {
//             let refBind = ctx.template[ctx.binding.bindingName || ctx.binding.name];
//             if (!isNullOrUndefined(refBind)) {
//                 if (ctx.binding.type) {
//                     let ttype = lang.getClass(refBind);
//                     if (lang.isExtendsClass(ttype, ctx.binding.type)) {
//                         ctx.value = refBind;
//                     }
//                 } else {
//                     ctx.value = refBind;
//                 }
//             }
//         }

//         if (isNullOrUndefined(ctx.value)) {
//             await next();
//         }
//     }
// }
