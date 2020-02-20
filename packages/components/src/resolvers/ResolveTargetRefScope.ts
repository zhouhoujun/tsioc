import { IActionSetup } from '@tsdi/ioc';
import { BuildHandles } from '@tsdi/boot';
import { ResolveTemplateHanlde } from './ResolveTemplateHanlde';
import { ValifyTeamplateHandle } from './ValifyTeamplateHandle';
import { BindingTemplateRefHandle } from './BindingTemplateRefHandle';
import { ComponentProvider } from '../ComponentProvider';
import { CTX_ELEMENT_REF, CTX_COMPONENT_REF } from '../ComponentRef';
import { IComponentContext } from '../ComponentContext';



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
            if (compdr.parseElementRef && compdr?.isElementType(ctx.type)) {
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
