import { ParseHandle, ParsersHandle } from './ParseHandle';
import { ParseContext } from './ParseContext';
import { isNullOrUndefined, lang, isString, Singleton, Type, isClass, isArray, isBaseType } from '@tsdi/ioc';
import { BindingExpression } from '../../bindings';
import { IocASyncDecoratorRegisterer, SelectorManager, RegScope, HandleRegisterer } from '../../core';
import { BuilderService } from '../BuilderService';
import { TemplateParseScope } from './TemplateParseScope';
import { TemplateContext } from './TemplateContext';


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
            console.log(ctx.bindExpression, ctx.scope);
        }

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
            await this.container.get(HandleRegisterer)
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
                    ctx.value = await this.container.get(BuilderService).resolve(selector, {
                        scope: ctx.scope,
                        template: template
                    }, ...(ctx.providers || []));
                } else {
                    ctx.value = await this.container.get(BuilderService).create({
                        module: selector,
                        scope: ctx.scope,
                        template: template,
                        regScope: RegScope.boot,
                        providers: [...(ctx.providers || [])]
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
            if (isBaseType(type) && isString(ctx.bindExpression)) {
                if (type === Boolean) {
                    ctx.value = new Boolean(ctx.bindExpression);
                } else if (type === Number) {
                    ctx.value = parseFloat(ctx.bindExpression);
                } else if (type === Date) {
                    ctx.value = new Date(ctx.bindExpression);
                } else {
                    ctx.value = ctx.bindExpression;
                }
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
