import { IActionSetup, DecoratorProvider } from '@tsdi/ioc';
import { BuildHandles, IBuildContext } from '@tsdi/boot';
import { ResolveTemplateHanlde } from './ResolveTemplateHanlde';
import { ValifyTeamplateHandle } from './ValifyTeamplateHandle';
import { BindingTemplateRefHandle } from './BindingTemplateRefHandle';
import { IComponentMetadata } from '../decorators/IComponentMetadata';
import { ComponentProvider } from '../ComponentProvider';
import { CTX_ELEMENT_REF, CTX_COMPONENT_REF } from '../ComponentRef';



export class ResolveTargetRefScope extends BuildHandles<IBuildContext> implements IActionSetup {
    async execute(ctx: IBuildContext, next?: () => Promise<void>): Promise<void> {
        let annoation = ctx.annoation as IComponentMetadata;
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
            let decorPdr = ctx.reflects.getActionInjector().getInstance(DecoratorProvider);
            let refSelector = decorPdr.resolve(ctx.decorator, ComponentProvider);
            if (refSelector.parseElementRef && refSelector?.isElementType(ctx.type)) {
                let elRef = refSelector.createElementRef(ctx, ctx.value);
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
