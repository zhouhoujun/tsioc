import { ComponentContext } from '../context';
import { CompilerFacade } from './facade';

/**
 * parse template handle
 *
 * @export
 * @class ModuleBeforeInitHandle
 * @extends {ResolveComponentHandle}
 */
export const ParseTemplateHandle = async function (ctx: ComponentContext, next?: () => Promise<void>): Promise<void> {
    let temp = ctx.template;
    if (!ctx.value && temp) {
        // use compiler of component, register in module of current injector.
        const injector = ctx.injector;
        ctx.value = injector.getInstance(CompilerFacade).compileTemplate(temp);
    }

    if (next) {
        await next();
    }
};
