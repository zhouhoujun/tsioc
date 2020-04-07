import { IComponentContext } from '../ComponentContext';
import { Compiler } from './parser';


/**
 * module before init handle
 *
 * @export
 * @class ModuleBeforeInitHandle
 * @extends {ResolveComponentHandle}
 */
export const ParseTemplateHandle = async function (ctx: IComponentContext, next?: () => Promise<void>): Promise<void> {
    let temp = ctx.getTemplate();
    if (!ctx.value && temp) {
        ctx.value = ctx.injector.getInstance(Compiler).compileTemplate(temp);
    }

    if (next) {
        await next();
    }
};
