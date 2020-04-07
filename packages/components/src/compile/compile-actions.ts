import { ModuleRef } from '@tsdi/boot';
import { IComponentContext } from '../ComponentContext';
import { CompilerFacade } from './CompilerFacade';
import { DecoratorProvider, IProviders } from '@tsdi/ioc';

/**
 * parse template handle
 *
 * @export
 * @class ModuleBeforeInitHandle
 * @extends {ResolveComponentHandle}
 */
export const ParseTemplateHandle = async function (ctx: IComponentContext, next?: () => Promise<void>): Promise<void> {
    let temp = ctx.getTemplate();
    if (!ctx.value && temp) {
        // use compiler of component, register in module of current injector.
        const injector = ctx.injector;
        let moduleRefl = injector.get(ModuleRef)?.reflect;
        let prods: IProviders;
        if (moduleRefl.componentDectors) {
            const decpdrs = injector.getInstance(DecoratorProvider);
            moduleRefl.componentDectors.some(d => {
                prods = decpdrs.getProviders(d);
                return prods;
            });
        }
        prods = prods ?? injector;
        let compiler = prods.getInstance(CompilerFacade);
        ctx.value = compiler.compileTemplate(temp);
    }

    if (next) {
        await next();
    }
};
