import { IActionSetup, DecoratorProvider } from '@tsdi/ioc';
import { BuildHandles, BuildContext } from '@tsdi/boot';
import { ResolveTemplateHanlde } from './ResolveTemplateHanlde';
import { ValifyTeamplateHandle } from './ValifyTeamplateHandle';
import { BindingTemplateRefHandle } from './BindingTemplateRefHandle';
import { IComponentMetadata } from '../decorators/IComponentMetadata';
import { RefSelector } from '../RefSelector';
import { CTX_ELEMENT_REF } from '../ComponentRef';


export class ResolveTargetRefScope extends BuildHandles<BuildContext> implements IActionSetup {
    async execute(ctx: BuildContext, next?: () => Promise<void>): Promise<void> {
        let annoation = ctx.annoation as IComponentMetadata;
        if (annoation.template) {
            await super.execute(ctx);
        } else {
            // current type is component.
            let decorPdr = ctx.reflects.getActionInjector().get(DecoratorProvider);
            let refSelector = decorPdr.resolve(ctx.decorator, RefSelector);
            if (refSelector?.isNodeType(ctx.type)) {
                let elRef = refSelector.createElementRef(ctx.value, ctx);
                ctx.set(CTX_ELEMENT_REF, elRef);
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
