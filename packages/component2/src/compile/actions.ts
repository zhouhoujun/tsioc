import { IComponentContext } from '../ComponentContext';
import { CompilerFacade } from './CompilerFacade';

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
        ctx.value = injector.getInstance(CompilerFacade).compileTemplate(temp);
    }

    if (next) {
        await next();
    }
};
