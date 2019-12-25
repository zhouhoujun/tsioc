import { isNullOrUndefined } from '@tsdi/ioc';
import { ResolveHandle, BuildContext } from '@tsdi/boot';
import { ViewRef, ComponentRef, RootViewRef } from '../ComponentRef';
import { TemplateContext } from '../parses/TemplateContext';
import { TemplateParseScope } from '../parses/TemplateParseScope';
import { IComponentMetadata } from '../decorators/IComponentMetadata';


export class ResolveTemplateScope extends ResolveHandle {
    async execute(ctx: BuildContext, next: () => Promise<void>): Promise<void> {
        let options = ctx.getOptions();
        let annoation = ctx.annoation as IComponentMetadata;
        if (!options.scope && !options.parsing && options.template && !annoation.template) {
            annoation.template = options.template;
        }
        if (ctx.target && annoation.template) {
            let pCtx = TemplateContext.parse(ctx.injector, {
                scope: ctx.target,
                template: annoation.template,
                annoation: annoation,
                decorator: ctx.decorator
            });

            await this.actInjector.get(TemplateParseScope)
                .execute(pCtx);

            if (!isNullOrUndefined(pCtx.value)) {
                pCtx.set(ViewRef, new RootViewRef(pCtx));
                ctx.set(ComponentRef, new ComponentRef(ctx.type, ctx.target, pCtx));
            }
        }
        await next();
    }
}
