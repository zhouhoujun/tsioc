import { DecoratorProvider } from '@tsdi/ioc';
import { ResolveHandle, BuildContext, StartupDecoratorRegisterer, StartupScopes } from '@tsdi/boot';
import { IComponentReflect } from '../IComponentReflect';
import { RefSelector } from '../RefSelector';
import { CTX_COMPONENT_REF } from '../ComponentRef';

/**
 * binding temlpate handle.
 *
 * @export
 * @class BindingTemplateHandle
 * @extends {ResolveHandle}
 */
export class BindingTemplateRefHandle extends ResolveHandle {
    async execute(ctx: BuildContext, next?: () => Promise<void>): Promise<void> {
        if (ctx.target && ctx.has(CTX_COMPONENT_REF)) {
            let ref = ctx.targetReflect as IComponentReflect;
            if (ref && ref.propRefChildBindings) {
                let dpr = this.actInjector.getInstance(DecoratorProvider);
                if (dpr.has(ctx.decorator, RefSelector)) {
                    // todo ref chile view
                    let refSelector = dpr.resolve(ctx.decorator, RefSelector);
                    let cref = ctx.get(CTX_COMPONENT_REF);
                    ref.propRefChildBindings.forEach(b => {
                        let result = refSelector.select(cref.nodeRef, b.bindingName || b.name);
                        if (result) {
                            ctx.target[b.name] = result;
                        }
                    });
                }
            }

            let startupRegr = this.actInjector.getInstance(StartupDecoratorRegisterer);

            let bindRegs = startupRegr.getRegisterer(StartupScopes.Binding);
            if (bindRegs.has(ctx.decorator)) {
                await this.execFuncs(ctx, bindRegs.getFuncs(this.actInjector, ctx.decorator));
            }

        }
        if (next) {
            await next();
        }
    }
}
