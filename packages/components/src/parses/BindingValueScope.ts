import { isNullOrUndefined, lang, isString, isBaseType, isClassType, ClassType, PromiseUtil } from '@tsdi/ioc';
import { StartupDecoratorRegisterer, StartupScopes, BaseTypeParser, BuildHandles } from '@tsdi/boot';
import { TemplateParseScope } from './TemplateParseScope';
import { TemplateContext } from './TemplateContext';
import { ComponentBuilderToken } from '../IComponentBuilder';
import { DataBinding } from '../bindings/DataBinding';
import { BindingDirection } from '../bindings/IBinding';
import { OneWayBinding } from '../bindings/OneWayBinding';
import { TwoWayBinding } from '../bindings/TwoWayBinding';
import { EventBinding } from '../bindings/EventBinding';
import { ParseBinding } from '../bindings/ParseBinding';
import { IComponentReflect } from '../IComponentReflect';
import { IParseContext, CTX_BIND_EXPRESSION, CTX_BIND_DATABINDING } from './ParseContext';
import { IComponentOption } from '../ComponentContext';


/**
 * binding value scope.
 *
 * @export
 * @class BindingValueScope
 * @extends {ParsersHandle}
 */
export class BindingValueScope extends BuildHandles<IParseContext> {
    setup() {
        this.use(BindingScopeHandle)
            .use(TranslateExpressionHandle)
            .use(TranslateAtrrHandle)
            .use(AssignBindValueHandle)
            .use(AssignDefaultValueHandle);
    }
}

const bindPref = 'binding:';
const twobindPref = 'binding=:';
const two2bindPref = '[(binding)]:';
const eventBindPref = '(binding):'
/**
 * binding scope handle.
 *
 * @export
 * @class BindingScopeHandle
 * @extends {ParseHandle}
 */
export const BindingScopeHandle = async function (ctx: IParseContext, next?: () => Promise<void>): Promise<void> {
    let expression = ctx.bindExpression;
    if (!ctx.hasValue(CTX_BIND_DATABINDING) && expression instanceof DataBinding) {
        ctx.setValue(CTX_BIND_DATABINDING, expression);
    }
    let binding = ctx.binding;
    if (!ctx.hasValue(CTX_BIND_DATABINDING) && isString(expression)) {
        let actInjector = ctx.reflects.getActionInjector();
        let regs = actInjector.getInstance(StartupDecoratorRegisterer)
            .getRegisterer(StartupScopes.BindExpression);
        let compdect = ctx.componentDecorator;
        // translate binding expression via current decorator.
        if (regs.has(compdect)) {
            await PromiseUtil.runInChain(regs.getFuncs(actInjector, compdect), ctx);
        } else {
            let exp = expression.trim();
            let dataBinding: DataBinding;
            if (binding.direction === BindingDirection.input) {
                if (exp.startsWith(bindPref)) {
                    dataBinding = new OneWayBinding(ctx.injector, ctx.componentProvider, ctx.scope, binding, exp.replace(bindPref, '').trim());
                } else if (exp.startsWith(twobindPref)) {
                    dataBinding = new TwoWayBinding(ctx.injector, ctx.componentProvider, ctx.scope, binding, exp.replace(twobindPref, '').trim());
                } else if (exp.startsWith(two2bindPref)) {
                    dataBinding = new TwoWayBinding(ctx.injector, ctx.componentProvider, ctx.scope, binding, exp.replace(two2bindPref, '').trim());
                }
            } else if (binding.direction === BindingDirection.output && exp.startsWith(eventBindPref)) {
                dataBinding = new EventBinding(ctx.injector, ctx.componentProvider, ctx.scope, binding, exp.replace(eventBindPref, '').trim());
            }
            dataBinding && ctx.setValue(CTX_BIND_DATABINDING, dataBinding);
        }
    }

    let dataBinding = ctx.dataBinding;
    if (dataBinding instanceof ParseBinding) {
        if (!dataBinding.source) {
            dataBinding.source = ctx.component;
        }
        ctx.setValue(CTX_BIND_EXPRESSION, dataBinding.resolveExression());
    } else if (dataBinding instanceof DataBinding) {
        if (!dataBinding.source) {
            dataBinding.source = ctx.component;
        }
        ctx.value = dataBinding.resolveExression();
    }

    if (next && isNullOrUndefined(ctx.value)) {
        await next();
    }
};


export const TranslateExpressionHandle = async function (ctx: IParseContext, next: () => Promise<void>): Promise<void> {
    let expression = ctx.bindExpression;
    let binding = ctx.binding;
    if (ctx.componentProvider.isTemplate(expression)) {
        let tpCtx = TemplateContext.parse(ctx.injector, {
            parent: ctx.getParent(),
            template: expression,
            providers: ctx.providers
        });
        await ctx.reflects.getActionInjector()
            .getInstance(TemplateParseScope)
            .execute(tpCtx);

        if (!tpCtx.destroyed) {
            if (ctx.reflects.isExtends(lang.getClass(tpCtx.value), binding.type)) {
                ctx.value = tpCtx.value;
            } else {
                ctx.setValue(CTX_BIND_EXPRESSION, tpCtx.value);
            }
            tpCtx.destroy();
        }
    }
    if (isNullOrUndefined(ctx.value)) {
        await next();
    }
};

/**
 * translate attr hanlde.
 *
 * @export
 * @class TranslateAtrrHandle
 * @extends {ParseHandle}
 */
export const TranslateAtrrHandle = async function (ctx: IParseContext, next: () => Promise<void>): Promise<void> {
    let expression = ctx.bindExpression;
    let binding = ctx.binding;
    if (!isNullOrUndefined(expression)) {
        let injector = ctx.injector;
        let pdr = binding.provider;
        let selector: ClassType;
        let reflects = ctx.reflects;
        let compdr = ctx.componentProvider;
        if (isString(pdr) && compdr && injector.hasRegister(compdr.toAttrSelectorToken(pdr))) {
            selector = injector.getTokenProvider(compdr.toAttrSelectorToken(pdr));
        } else if (binding.type !== Array) {
            if (isClassType(binding.provider)) {
                if (reflects.get<IComponentReflect>(binding.provider).component) {
                    selector = binding.provider;
                }
            }
            if (!selector && isClassType(binding.type)) {
                if (reflects.get<IComponentReflect>(binding.type).component) {
                    selector = binding.type;
                }
            }
        }

        if (selector) {
            let bindings = ctx.getExtenalBindings();
            bindings[binding.bindingName || binding.name] = expression;
            ctx.value = await injector.getInstance(ComponentBuilderToken).resolve(<IComponentOption>{
                type: selector,
                attr: true,
                parent: ctx.getParent(),
                template: bindings,
                providers: ctx.providers,
                injector: injector
            });
        }
    }

    if (isNullOrUndefined(ctx.value)) {
        await next();
    }
};


export const AssignBindValueHandle = async function (ctx: IParseContext, next: () => Promise<void>): Promise<void> {
    let expression = ctx.bindExpression;
    let binding = ctx.binding;
    if (!isNullOrUndefined(expression)) {
        let type = binding.type;
        if (isBaseType(type)) {
            ctx.value = ctx.injector.getInstance(BaseTypeParser).parse(type, expression);
        } else if (isClassType(type)) {
            let ttype = lang.getClass(expression);
            if (ctx.reflects.isExtends(ttype, type)) {
                ctx.value = expression;
            }
        } else {
            ctx.value = expression;
        }
    }

    if (isNullOrUndefined(ctx.value)) {
        await next();
    }
};

export const AssignDefaultValueHandle = async function (ctx: IParseContext, next: () => Promise<void>): Promise<void> {
    ctx.value = ctx.binding?.defaultValue;
    if (isNullOrUndefined(ctx.value)) {
        await next();
    }
};
