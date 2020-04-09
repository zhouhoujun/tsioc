import { IActionSetup, DecoratorProvider, isFunction, isDefined, isTypeObject, lang, isArray, chain, isNullOrUndefined, isMetadataObject, isBaseValue } from '@tsdi/ioc';
import { BuildHandles, IBuildContext, IModuleReflect, StartupDecoratorRegisterer } from '@tsdi/boot';
import { IComponentReflect } from '../IComponentReflect';
import { CTX_COMPONENT_DECTOR, CTX_ELEMENT_REF, CTX_COMPONENT, CTX_COMPONENT_REF, CTX_TEMPLATE_SCOPE, REFCHILD_SELECTOR } from '../ComponentRef';
import { ComponentProvider } from '../ComponentProvider';
import { ComponentContext, IComponentOption, CTX_COMPONENT_CONTEXT, IComponentContext } from '../ComponentContext';
import { BeforeInit, OnInit, AfterInit, AfterContentInit } from '../ComponentLifecycle';
import { Input } from '../decorators/Input';
import { ParseContext, CTX_BIND_PARSED } from './ParseContext';
import { BindingScope } from './binding-comp';
import { ParseBinding } from '../bindings/ParseBinding';
import { PropBinding } from '../bindings/PropBinding';
import { IPropertyVaildate } from '../bindings/IBinding';
import { Vaildate } from '../decorators/Vaildate';
import { TemplateParseScope } from './parse-templ';
import { RefChild } from '../decorators/RefChild';
import { Output } from '../decorators/Output';
import { BindingScopeHandle } from './binding-comp';
import { ComponentBuilderToken } from '../IComponentBuilder';


export class BindingComponentScope extends BuildHandles<IBuildContext> implements IActionSetup {

    async execute(ctx: IBuildContext, next?: () => Promise<void>): Promise<void> {
        let refl = ctx.getTargetReflect() as IModuleReflect;
        if (refl?.getModuleRef) {
            return ctx.destroy();
        }
        if (!ctx.value) {
            return next();
        }

        let cmpRef = refl as IComponentReflect;
        if (cmpRef?.component) {
            if (!(ctx instanceof ComponentContext)) {
                throw Error(`Component decorator '${ctx.decorator}' is not provide component builder`);
            } else {
                ctx.setValue(CTX_COMPONENT_DECTOR, ctx.decorator);
                ctx.setValue(CTX_COMPONENT, ctx.value);
                ctx.setValue(CTX_COMPONENT_CONTEXT, ctx);
                ctx.getParent()?.addChild(ctx);
                await super.execute(ctx);
            }
        } else if (!(<IComponentOption>ctx.getOptions()).attr) {
            let mdref = ctx.getModuleRef();
            if (mdref && mdref.reflect.componentDectors) {
                let componentDectors = mdref.reflect.componentDectors;
                let decorPdr = ctx.reflects.getActionInjector().getInstance(DecoratorProvider);
                componentDectors.some(decor => {
                    let refSelector = decorPdr.resolve(decor, ComponentProvider);
                    if (refSelector.parseRef && refSelector?.isElementType(ctx.type)) {
                        let elRef = refSelector.createElementRef(ctx, ctx.value);
                        ctx.setValue(CTX_ELEMENT_REF, elRef);
                        return true;
                    }
                    return false;
                });
            }
            if (ctx.hasValue(CTX_ELEMENT_REF)) {
                ctx.getParent()?.addChild(ctx);
                ctx.value = ctx.getValue(CTX_ELEMENT_REF);
            } else {
                ctx.destroy();
            }
        }
        return next();
    }

    setup() {
        this.use(ModuleBeforeInitHandle)
            .use(BindingPropertyHandle)
            .use(ModuleInitHandle)
            .use(ModuleAfterInitHandle)
            .use(ResolveTargetRefScope)
            .use(BindingOutputHandle)
            .use(ModuleAfterContentInitHandle);
    }
}


/**
 * module before init handle
 *
 * @export
 * @class ModuleBeforeInitHandle
 * @extends {ResolveComponentHandle}
 */
export const ModuleBeforeInitHandle = async function (ctx: IComponentContext, next?: () => Promise<void>): Promise<void> {
    let target = ctx.value as BeforeInit;
    if (target && isFunction(target.onBeforeInit)) {
        await target.onBeforeInit();
    }

    if (next) {
        await next();
    }
};


const inputDector = Input.toString();
/**
 * binding property handle.
 *
 * @export
 * @class BindingPropertyHandle
 * @extends {ResolveHandle}
 */
export const BindingPropertyHandle = async function (ctx: IComponentContext, next: () => Promise<void>): Promise<void> {

    let refl = ctx.getTargetReflect();
    let propInBindings = refl?.getBindings(inputDector);
    if (propInBindings) {
        let bindings = ctx.getTemplate();
        let actInjector = ctx.reflects.getActionInjector();
        await Promise.all(Array.from(propInBindings.keys()).map(async n => {
            let binding = propInBindings.get(n);
            let filed = binding.bindingName || binding.name;
            let expression = bindings ? bindings[filed] : null;
            if (isDefined(expression)) {
                if (binding.bindingType === 'dynamic') {
                    ctx.value[binding.name] = expression;
                } else {
                    let pctx = ParseContext.parse(ctx.injector, {
                        type: ctx.type,
                        parent: ctx,
                        bindExpression: expression,
                        binding: binding
                    });
                    await actInjector.getInstance(BindingScope).execute(pctx, async () => {
                        if (pctx.dataBinding instanceof ParseBinding) {
                            if (pctx.getValue(CTX_BIND_PARSED) && isTypeObject(pctx.value)) {
                                ctx.value[binding.name] = pctx.value;
                                pctx.dataBinding.bind(pctx.value);
                            } else {
                                pctx.dataBinding.bind(ctx.value, pctx.value);
                            }
                        } else if (pctx.dataBinding instanceof PropBinding) {
                            pctx.dataBinding.bind(ctx.value, pctx.value);
                        } else {
                            ctx.value[binding.name] = pctx.value;
                        }
                    });
                }
            } else if (isDefined(binding.defaultValue)) {
                ctx.value[binding.name] = binding.defaultValue;
            }

            let bvailds = refl?.getBindings<IPropertyVaildate[]>(Vaildate.toString()).get(binding.name);
            if (bvailds && bvailds.length) {
                await Promise.all(bvailds.map(async bvaild => {
                    if (bvaild.required && isDefined(ctx.value[binding.name])) {
                        throw new Error(`${lang.getClassName(ctx.value)}.${binding.name} is not vaild. ${bvaild.errorMsg}`)
                    }
                    if (bvaild.vaild) {
                        let vaild = await bvaild.vaild(ctx.value[binding.name], ctx.value);
                        if (!vaild) {
                            throw new Error(`${lang.getClassName(ctx.value)}.${binding.name} is not vaild. ${bvaild.errorMsg}`)
                        }
                    }
                }));
            }
        }));
    }
    await next();
};


/**
 * module init handle.
 *
 * @export
 * @class ModuleAfterInitHandle
 * @extends {ResolveHandle}
 */
export const ModuleInitHandle = async function (ctx: IComponentContext, next?: () => Promise<void>): Promise<void> {
    let target = ctx.value as OnInit;
    if (target && isFunction(target.onInit)) {
        await target.onInit();
    }
    if (next) {
        await next();
    }
};

/**
 * module after init handle.
 *
 * @export
 * @class ModuleAfterInitHandle
 * @extends {ResolveHandle}
 */
export const ModuleAfterInitHandle = async function (ctx: IComponentContext, next?: () => Promise<void>): Promise<void> {
    let target = ctx.value as AfterInit;
    if (target && isFunction(target.onAfterInit)) {
        await target.onAfterInit();
    }
    if (next) {
        await next();
    }
};



export class ResolveTargetRefScope extends BuildHandles<IComponentContext> implements IActionSetup {
    async execute(ctx: IComponentContext, next?: () => Promise<void>): Promise<void> {
        let annoation = ctx.getAnnoation();
        if (ctx.getOptions().attr) {
            if (annoation.template) {
                throw new Error('template component can not set as attr of oathor component')
            } else {
                return await next();
            }
        }
        if (annoation.template) {
            await super.execute(ctx);
            ctx.value = ctx.getValue(CTX_COMPONENT_REF);
        } else {
            // current type is component.
            let refl = ctx.getTargetReflect();
            let compdr = refl.getDecorProviders().getInstance(ComponentProvider);
            if (compdr.parseRef && compdr?.isElementType(ctx.type)) {
                let elRef = compdr.createElementRef(ctx, ctx.value);
                ctx.setValue(CTX_ELEMENT_REF, elRef);
                ctx.value = elRef;
            }

            // is not compoent or element.
            if (!ctx.hasValue(CTX_ELEMENT_REF)) {
                ctx.getParent()?.removeChild(ctx);
                ctx.setParent(null);
            }
        }
        await next();
    }

    setup() {
        this.use(ResolveTemplateHanlde)
            .use(ValifyTeamplateHandle)
            .use(BindingTemplateRefHandle);
    }

}

function cloneTemplate(target: any) {
    if (isArray(target)) {
        return target.map(it => cloneTemplate(it));
    }
    if (isFunction(target)) {
        return target;
    } else if (isMetadataObject(target)) {
        let newM = {};
        lang.forIn(target, (val, name) => {
            newM[name] = cloneTemplate(val)
        });
        return newM;
    } else if (isBaseValue(target)) {
        return target;
    }
    return null;
}

export const ResolveTemplateHanlde = async function (ctx: IComponentContext, next: () => Promise<void>): Promise<void> {
    let actInjector = ctx.reflects.getActionInjector();
    let compPdr = ctx.componentProvider;
    let pCtx = compPdr.createTemplateContext(ctx.injector, {
        parent: ctx,
        template: cloneTemplate(ctx.getAnnoation().template)
    });
    pCtx.setValue(CTX_TEMPLATE_SCOPE, ctx.value);
    await actInjector.getInstance(TemplateParseScope)
        .execute(pCtx);

    if (pCtx.value) {
        ctx.setValue(CTX_COMPONENT_REF, isArray(pCtx.value) ?
            compPdr.createComponentRef(ctx.type, ctx.value, ctx, ...pCtx.value)
            : compPdr.createComponentRef(ctx.type, ctx.value, ctx, pCtx.value));
        await next();
    } else {
        ctx.getParent()?.removeChild(ctx);
        ctx.remove(CTX_COMPONENT)
    }
};


export const ValifyTeamplateHandle = async function (ctx: IComponentContext, next?: () => Promise<void>): Promise<void> {

    let actInjector = ctx.reflects.getActionInjector();
    let startupRegr = actInjector.getInstance(StartupDecoratorRegisterer);

    let validRegs = startupRegr.getRegisterer('ValifyComponent');
    if (validRegs.has(ctx.decorator)) {
        await chain(validRegs.getFuncs(actInjector, ctx.decorator), ctx);
    }

    if (next) {
        await next();
    }
};


const RefChildStr = RefChild.toString();
/**
 * binding temlpate handle.
 *
 * @export
 * @class BindingTemplateHandle
 * @extends {ResolveHandle}
 */
export const BindingTemplateRefHandle = async function (ctx: IComponentContext, next?: () => Promise<void>): Promise<void> {
    let refl = ctx.getTargetReflect();
    let cmpdr = ctx.componentProvider;
    let refkey = ctx.getTemplate()?.[cmpdr.getRefSelectKey()];
    if (refkey) {
        ctx.setValue(REFCHILD_SELECTOR, refkey);
    }
    let propRefChildBindings = refl?.getBindings(RefChildStr);
    if (propRefChildBindings) {
        // todo ref child view
        let cref = ctx.getValue(CTX_COMPONENT_REF);
        propRefChildBindings.forEach(b => {
            let result = cmpdr.select(cref, b.bindingName || b.name);
            if (!result) {
                return;
            }
            if (cmpdr.isComponentRef(result)) {
                if (cmpdr.isComponentRefType(b.type)) {
                    ctx.value[b.name] = result;
                } else {
                    ctx.value[b.name] = result.instance;
                }
            } else if (cmpdr.isElementRef(result)) {
                if (cmpdr.isElementRefType(b.type)) {
                    ctx.value[b.name] = result;
                } else {
                    ctx.value[b.name] = result.nativeElement;
                }
            } else {
                if (cmpdr.isElementRefType(b.type)) {
                    ctx.value[b.name] = cmpdr.getElementRef(result, ctx.injector) ?? cmpdr.createElementRef(ctx, result);
                } else if (cmpdr.isComponentRefType(b.type)) {
                    ctx.value[b.name] = cmpdr.getComponentRef(result, ctx.injector) ?? cmpdr.createComponentRef(lang.getClass(result), result, ctx);
                } else {
                    ctx.value[b.name] = result;
                }
            }
        });

    }

    let actInjector = ctx.reflects.getActionInjector();
    let startupRegr = actInjector.getInstance(StartupDecoratorRegisterer);

    let bindRegs = startupRegr.getRegisterer('Binding');
    if (bindRegs.has(ctx.decorator)) {
        await chain(bindRegs.getFuncs(this.actInjector, ctx.decorator), ctx);
    }

    if (next) {
        await next();
    }
};

const outputDecor = Output.toString();

export const BindingOutputHandle = async function (ctx: IComponentContext, next: () => Promise<void>): Promise<void> {
    let bindings = ctx.getTemplate();
    if (!bindings) {
        return next();
    }
    let refl = ctx.getTargetReflect();
    let propOutBindings = refl?.getBindings(outputDecor);
    if (propOutBindings) {
        await Promise.all(Array.from(propOutBindings.keys()).map(async n => {
            let binding = propOutBindings.get(n);
            let filed = binding.bindingName || binding.name;
            let expression = bindings ? bindings[filed] : null;
            if (!isNullOrUndefined(expression)) {
                let pctx = ParseContext.parse(ctx.injector, {
                    type: ctx.type,
                    parent: ctx,
                    bindExpression: expression,
                    binding: binding
                });
                await BindingScopeHandle(pctx);
                pctx.dataBinding.bind(ctx.value);
                pctx.destroy();
            }
        }));
    }

    await next();
};

/**
 * module ater content init handle.
 *
 * @export
 * @class ModuleAfterContentInitHandle
 * @extends {ResolveHandle}
 */
export const ModuleAfterContentInitHandle = async function (ctx: IComponentContext, next?: () => Promise<void>): Promise<void> {
    let target = ctx.value as AfterContentInit;
    if (target && isFunction(target.onAfterContentInit)) {
        await target.onAfterContentInit();
    }

    if (next) {
        await next();
    }
};

export const ParseTemplateHandle = async function (ctx: IBuildContext, next: () => Promise<void>): Promise<void> {
    let template = ctx.getTemplate();
    if (!ctx.value && !ctx.type && template) {
        let options = {
            parent: ctx,
            template: template
        };
        ctx.value = ctx.injector.getInstance(ComponentBuilderToken)
            .resolveTemplate(options, ctx.providers);
    }
    await next();
};
