import { IActionSetup, DecoratorProvider } from '@tsdi/ioc';
import { BuildHandles, IBuildContext } from '@tsdi/boot';
import { IComponentReflect } from '../IComponentReflect';
import { ModuleBeforeInitHandle } from './ModuleBeforeInitHandle';
import { BindingPropertyHandle } from './BindingPropertyHandle';
import { ModuleInitHandle } from './ModuleInitHandle';
import { ModuleAfterInitHandle } from './ModuleAfterInitHandle';
import { BindingOutputHandle } from './BindingOutputHandle';
import { ResolveTargetRefScope } from './ResolveTargetRefScope';
import { ModuleAfterContentInitHandle } from './ModuleAfterContentInitHandle';
import { CTX_COMPONENT_DECTOR, CTX_ELEMENT_REF } from '../ComponentRef';
import { ComponentProvider } from '../ComponentProvider';
import { ComponentContext } from '../ComponentContext';


export class BindingComponentScope extends BuildHandles<IBuildContext> implements IActionSetup {

    async execute(ctx: IBuildContext, next?: () => Promise<void>): Promise<void> {
        if (!ctx.value) {
            return next();
        }

        if ((<IComponentReflect>ctx.targetReflect)?.component) {
            if (!(ctx instanceof ComponentContext)) {
                throw Error(`Component decorator '${ctx.decorator}' is not provide component builder`);
            } else {
                ctx.setValue(CTX_COMPONENT_DECTOR, ctx.decorator);
                await super.execute(ctx);
            }
        } else if (!ctx.getOptions().attr) {
            let mdref = ctx.getModuleRef();
            if (mdref && mdref.reflect.componentDectors) {
                let componentDectors = mdref.reflect.componentDectors;
                let decorPdr = ctx.reflects.getActionInjector().getInstance(DecoratorProvider);
                componentDectors.some(decor => {
                    let refSelector = decorPdr.resolve(decor, ComponentProvider);
                    if (refSelector.parseElementRef && refSelector?.isElementType(ctx.type)) {
                        let elRef = refSelector.createElementRef(ctx, ctx.value);
                        ctx.setValue(CTX_ELEMENT_REF, elRef);
                        return true;
                    }
                    return false;
                });
            }
            if (ctx.hasValue(CTX_ELEMENT_REF)) {
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
