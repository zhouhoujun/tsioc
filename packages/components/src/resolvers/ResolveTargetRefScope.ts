import { IActionSetup, DecoratorProvider } from '@tsdi/ioc';
import { BuildHandles, BuildContext, ModuleRef } from '@tsdi/boot';
import { ResolveTemplateHanlde } from './ResolveTemplateHanlde';
import { ValifyTeamplateHandle } from './ValifyTeamplateHandle';
import { BindingTemplateRefHandle } from './BindingTemplateRefHandle';
import { IComponentMetadata } from '../decorators/IComponentMetadata';
import { RefSelector } from '../RefSelector';
import { ELEMENT_REFS, CTX_ELEMENT_REF, CTX_COMPONENT } from '../ComponentRef';


export class ResolveTargetRefScope extends BuildHandles<BuildContext> implements IActionSetup {
    async execute(ctx: BuildContext, next?: () => Promise<void>): Promise<void> {
        let options = ctx.getOptions();
        let annoation = ctx.annoation as IComponentMetadata;
        if (!ctx.template && !options.parsing && options.template && !annoation.template) {
            annoation.template = options.template;
        }
        if (ctx.value && annoation.template) {
            await super.execute(ctx);
        } else {
            let mdref = ctx.injector.getSingleton(ModuleRef);
            if (mdref && mdref.reflect.componentDectors) {
                let componentDectors = mdref.reflect.componentDectors;
                let decorPdr = ctx.reflects.getActionInjector().get(DecoratorProvider);
                componentDectors.some(decor => {
                    let refSelector = decorPdr.resolve(decor, RefSelector)
                    if (refSelector?.isElementType(ctx.type)) {
                        if (!ctx.injector.has(ELEMENT_REFS)) {
                            ctx.injector.registerValue(ELEMENT_REFS, new WeakMap());
                        }
                        let map = ctx.injector.get(ELEMENT_REFS);
                        let elRef = refSelector.createElementRef(ctx.value, ctx);
                        map.set(ctx.value, elRef);
                        ctx.set(CTX_ELEMENT_REF, elRef);
                        return true;
                    }
                    return false;
                });
            }
            // is not compoent or element.
            if (!ctx.has(CTX_ELEMENT_REF)) {
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
