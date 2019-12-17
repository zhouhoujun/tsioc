import { IActionSetup } from '@tsdi/ioc';
import { StartupDecoratorRegisterer, StartupScopes } from '@tsdi/boot';
import { TemplatesHandle, TemplateHandle } from './TemplateHandle';
import { TemplateContext } from './TemplateContext';



/**
 * translate selector scope.
 *
 * @export
 * @class TranslateSelectorScope
 * @extends {TemplatesHandle}
 */
export class TranslateSelectorScope extends TemplatesHandle implements IActionSetup {
    async execute(ctx: TemplateContext, next?: () => Promise<void>): Promise<void> {
        await super.execute(ctx);
        if (next) {
            await next();
        }
    }
    setup() {
        this.use(TranslateElementHandle);
    }
}

/**
 * translate element handle.
 *
 * @export
 * @class TranslateElementHandle
 * @extends {TemplateHandle}
 */
export class TranslateElementHandle extends TemplateHandle {
    async execute(ctx: TemplateContext, next: () => Promise<void>): Promise<void> {
        let reg = this.actInjector.getInstance(StartupDecoratorRegisterer).getRegisterer(StartupScopes.TranslateTemplate);
        if (reg.has(ctx.decorator)) {
            await this.execFuncs(ctx, reg.getFuncs(this.actInjector, ctx.decorator));
        }

        if (!ctx.selector) {
            await next();
        }
    }
}

