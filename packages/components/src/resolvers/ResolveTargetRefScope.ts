import { IActionSetup, DecoratorProvider } from '@tsdi/ioc';
import { BuildHandles, BuildContext, ModuleRef } from '@tsdi/boot';
import { ResolveTemplateHanlde } from './ResolveTemplateHanlde';
import { ValifyTeamplateHandle } from './ValifyTeamplateHandle';
import { BindingTemplateRefHandle } from './BindingTemplateRefHandle';
import { IComponentMetadata } from '../decorators/IComponentMetadata';
import { RefSelector } from '../RefSelector';
import { ELEMENT_REFS, CTX_ELEMENT_REF } from '../ComponentRef';


export class ResolveTargetRefScope extends BuildHandles<BuildContext> implements IActionSetup {
    async execute(ctx: BuildContext, next?: () => Promise<void>): Promise<void> {
        let options = ctx.getOptions();
        let annoation = ctx.annoation as IComponentMetadata;
        if (!options.scope && !options.parsing && options.template && !annoation.template) {
            annoation.template = options.template;
        }
        if (ctx.target && annoation.template) {
            await super.execute(ctx);
            ctx.getParent()?.addChild(ctx);
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
                        let elRef = refSelector.createElementRef(ctx.target, ctx);
                        map.set(ctx.target, elRef);
                        ctx.set(CTX_ELEMENT_REF, elRef);
                        ctx.getParent()?.addChild(ctx);
                        return true;
                    }
                    return false;
                });
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
