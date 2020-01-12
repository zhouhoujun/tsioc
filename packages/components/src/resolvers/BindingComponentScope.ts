import { IActionSetup, DecoratorProvider } from '@tsdi/ioc';
import { BuildHandles, BuildContext } from '@tsdi/boot';
import { IComponentReflect } from '../IComponentReflect';
import { ModuleBeforeInitHandle } from './ModuleBeforeInitHandle';
import { BindingPropertyHandle } from './BindingPropertyHandle';
import { ModuleInitHandle } from './ModuleInitHandle';
import { ModuleAfterInitHandle } from './ModuleAfterInitHandle';
import { BindingOutputHandle } from './BindingOutputHandle';
import { ResolveTargetRefScope } from './ResolveTargetRefScope';
import { ModuleAfterContentInitHandle } from './ModuleAfterContentInitHandle';
import { CTX_COMPONENT_DECTOR, CTX_ELEMENT_REF } from '../ComponentRef';
import { RefSelector } from '../RefSelector';


export class BindingComponentScope extends BuildHandles<BuildContext> implements IActionSetup {

    async execute(ctx: BuildContext, next?: () => Promise<void>): Promise<void> {
        if (ctx.value && (<IComponentReflect>ctx.targetReflect)?.component) {
            ctx.set(CTX_COMPONENT_DECTOR, ctx.decorator);
            await super.execute(ctx);
        } else if (ctx.value) {
            let mdref = ctx.getModuleRef();
            if (mdref && mdref.reflect.componentDectors) {
                let componentDectors = mdref.reflect.componentDectors;
                let decorPdr = ctx.reflects.getActionInjector().get(DecoratorProvider);
                componentDectors.some(decor => {
                    let refSelector = decorPdr.resolve(decor, RefSelector);
                    if (refSelector?.isNodeType(ctx.type)) {
                        let elRef = refSelector.createElementRef(ctx.value, ctx);
                        ctx.set(CTX_ELEMENT_REF, elRef);
                        return true;
                    }
                    return false;
                });
            }
        }
        await next();
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
