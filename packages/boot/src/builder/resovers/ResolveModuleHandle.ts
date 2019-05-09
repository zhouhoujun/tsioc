import { BuildContext } from './BuildContext';
import { IBindingTypeReflect } from '../../core';
import { InjectReference, isNullOrUndefined, RuntimeLifeScope, isMetadataObject } from '@tsdi/ioc';
import { ParseScope, ParseContext } from '../parses';
import { ResolveHandle } from './ResolveHandle';


export class ResolveModuleHandle extends ResolveHandle {
    async execute(ctx: BuildContext, next: () => Promise<void>): Promise<void> {
        if (!ctx.target) {
            let container = ctx.getRaiseContainer();
            ctx.providers = ctx.providers || [];
            if (ctx.template) {
                let ref = container.getTypeReflects().get(ctx.type) as IBindingTypeReflect;
                // init if not init constructor params action.
                if (!ref.methodParams.has('constructor')) {
                    container.get(RuntimeLifeScope).getConstructorParameters(container, ctx.type);
                }
                if (ref.paramsBindings) {
                    let bparams = ref.paramsBindings.get('constructor');
                    if (bparams && bparams.length) {
                        await Promise.all(bparams.map(async bp => {
                            let pCtx = ParseContext.parse(ctx.type, ctx.template, bp, ctx.getRaiseContainer());
                            await this.container.get(ParseScope).execute(pCtx);
                            let paramVal = pCtx.bindingValue;
                            // console.log(ctx.type, 'paramVal:', paramVal, ctx.template, bp);
                            if (!isNullOrUndefined(paramVal)) {
                                ctx.providers.push({ provide: new InjectReference(bp.provider || bp.type || bp.name, '__binding'), useValue: paramVal });
                            }
                        }));
                    }
                }
            }
            ctx.target = this.resolve(ctx, ctx.type, ...ctx.providers);
        }
        if (ctx.target) {
            await next();
        }
    }
}
