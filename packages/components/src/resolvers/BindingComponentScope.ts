import { IActionSetup, DecoratorProvider } from '@tsdi/ioc';
import { BuildHandles, IBuildContext, IModuleReflect } from '@tsdi/boot';
import { IComponentReflect } from '../IComponentReflect';
import { ModuleBeforeInitHandle } from './ModuleBeforeInitHandle';
import { BindingPropertyHandle } from './BindingPropertyHandle';
import { ModuleInitHandle } from './ModuleInitHandle';
import { ModuleAfterInitHandle } from './ModuleAfterInitHandle';
import { BindingOutputHandle } from './BindingOutputHandle';
import { ResolveTargetRefScope } from './ResolveTargetRefScope';
import { ModuleAfterContentInitHandle } from './ModuleAfterContentInitHandle';
import { CTX_COMPONENT_DECTOR, CTX_ELEMENT_REF, CTX_COMPONENT } from '../ComponentRef';
import { ComponentProvider } from '../ComponentProvider';
import { ComponentContext, IComponentOption, CTX_COMPONENT_CONTEXT } from '../ComponentContext';


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
