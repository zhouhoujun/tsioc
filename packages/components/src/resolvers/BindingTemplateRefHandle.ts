import { DecoratorProvider, PromiseUtil, lang } from '@tsdi/ioc';
import { BuildContext, StartupDecoratorRegisterer, StartupScopes } from '@tsdi/boot';
import { IComponentReflect } from '../IComponentReflect';
import { RefSelector } from '../RefSelector';
import { CTX_COMPONENT_REF, ElementRef, ComponentRef, NodeRef } from '../ComponentRef';
import { ComponentBuilderToken } from '../IComponentBuilder';

/**
 * binding temlpate handle.
 *
 * @export
 * @class BindingTemplateHandle
 * @extends {ResolveHandle}
 */
export const BindingTemplateRefHandle = async function (ctx: BuildContext, next?: () => Promise<void>): Promise<void> {

    let ref = ctx.targetReflect as IComponentReflect;
    let actInjector = ctx.reflects.getActionInjector();
    if (ref && ref.propRefChildBindings) {
        let dpr = actInjector.getInstance(DecoratorProvider);
        if (dpr.has(ctx.decorator, RefSelector)) {
            // todo ref child view
            let refSelector = dpr.resolve(ctx.decorator, RefSelector);
            let cref = ctx.get(CTX_COMPONENT_REF);
            let builder = ctx.injector.get(ComponentBuilderToken);
            ref.propRefChildBindings.forEach(b => {
                let result = refSelector.select(cref, b.bindingName || b.name);
                if (result) {
                    if (lang.isExtendsClass(b.type, ElementRef)) {
                        ctx.value[b.name] = builder.getElementRef(result, ctx.injector);
                    } else if (lang.isExtendsClass(b.type, ComponentRef)) {
                        ctx.value[b.name] = builder.getComponentRef(result, ctx.injector);
                    } else {
                        ctx.value[b.name] = result;
                    }
                }
            });
        }
    }

    let startupRegr = actInjector.getInstance(StartupDecoratorRegisterer);

    let bindRegs = startupRegr.getRegisterer(StartupScopes.Binding);
    if (bindRegs.has(ctx.decorator)) {
        await PromiseUtil.runInChain(bindRegs.getFuncs(this.actInjector, ctx.decorator), ctx);
    }

    if (next) {
        await next();
    }
};
