import { ParseHandle, ParsersHandle } from './ParseHandle';
import { ParseContext } from './ParseContext';
import { isNullOrUndefined, lang, isString, Singleton, Type, isClass, isArray, isBaseType } from '@tsdi/ioc';
import { BindingExpression } from '../bindings';
import { IocBuildDecoratorRegisterer, RegFor, BuildHandleRegisterer, BuilderServiceToken, BaseTypeParserToken } from '@tsdi/boot';
import { TemplateParseScope } from './TemplateParseScope';
import { TemplateContext } from './TemplateContext';
import { SelectorManager } from '../SelectorManager';


export class BindingValueScope extends ParsersHandle {

    setup() {
        this.container.register(BindExpressionDecoratorRegisterer);
        this.use(BindingScopeHandle)
            .use(TranslateExpressionHandle)
            .use(TranslateAtrrHandle)
            .use(AssignBindValueHandle)
            .use(AssignDefaultValueHandle)
    }

}

@Singleton
export class BindExpressionDecoratorRegisterer extends IocBuildDecoratorRegisterer<Type<ParseHandle>> {

}


export class BindingScopeHandle extends ParseHandle {

    async execute(ctx: ParseContext, next: () => Promise<void>): Promise<void> {

        let regs = this.container.get(BindExpressionDecoratorRegisterer);
        if (isString(ctx.bindExpression) && regs.has(ctx.decorator)) {
            await this.execFuncs(ctx, regs.getFuncs(this.container, ctx.decorator));
        }
        // console.log(ctx.type, '\n--------------start----------------')
        // console.log(ctx.binding.bindingName || ctx.binding.name);
        // console.log(ctx.bindExpression)
        // console.log(ctx.scope);
        if (ctx.bindExpression instanceof BindingExpression) {
            ctx.bindExpression = ctx.bindExpression.resolve(ctx.scope);
        } else if (isString(ctx.bindExpression) && ctx.bindExpression.trim().startsWith('binding:')) {
            let bindingField = ctx.bindExpression.replace('binding:', '').trim();
            ctx.bindExpression = ctx.scope ? ctx.scope[bindingField] : undefined;
        }
        // console.log(ctx.bindExpression, '\n--------------end----------------\n')

        if (isNullOrUndefined(ctx.value)) {
            await next();
        }
    }
}

export class TranslateExpressionHandle extends ParseHandle {
    async execute(ctx: ParseContext, next: () => Promise<void>): Promise<void> {
        if (!isNullOrUndefined(ctx.bindExpression)) {
            let tpCtx = TemplateContext.parse(ctx.type, {
                scope: ctx.scope,
                template: ctx.bindExpression,
                decorator: ctx.decorator,
                annoation: ctx.annoation,
                providers: ctx.providers
            }, ctx.getRaiseContainer());
            await this.container.get(BuildHandleRegisterer)
                .get(TemplateParseScope)
                .execute(tpCtx);
            if (!isNullOrUndefined(tpCtx.value)) {
                ctx.bindExpression = tpCtx.value;
            }
        }
        if (isNullOrUndefined(ctx.value)) {
            await next();
        }
    }
}

export class TranslateAtrrHandle extends ParseHandle {
    async execute(ctx: ParseContext, next: () => Promise<void>): Promise<void> {

        if (!isNullOrUndefined(ctx.bindExpression)) {
            let mgr = this.container.get(SelectorManager);
            let pdr = ctx.binding.provider;
            let selector: Type<any>;
            let template = isArray(ctx.template) ? {} : (ctx.template || {});
            template[ctx.binding.bindingName || ctx.binding.name] = ctx.bindExpression;
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
                    ctx.value = await this.container.get(BuilderServiceToken).resolve(selector, {
                        scope: ctx.scope,
                        template: template
                    }, ...ctx.providers);
                } else {
                    ctx.value = await this.container.get(BuilderServiceToken).buildTarget({
                        module: selector,
                        scope: ctx.scope,
                        template: template,
                        regFor: RegFor.boot,
                        providers: ctx.providers
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
            let type = ctx.binding.type;
            if (isBaseType(type)) {
                ctx.value = this.container.get(BaseTypeParserToken)
                    .parse(type, ctx.bindExpression);
            } else if (isClass(type)) {
                let ttype = lang.getClass(ctx.bindExpression);
                if (lang.isExtendsClass(ttype, type)) {
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
        ctx.value = ctx.binding.defaultValue;

        if (isNullOrUndefined(ctx.value)) {
            await next();
        }
    }
}
