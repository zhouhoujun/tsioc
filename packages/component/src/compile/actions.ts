import { isFunction } from '@tsdi/ioc';
import { ComponentContext } from '../context';
import { ComponentReflect } from '../reflect';
import { CompilerFacade } from './facade';

/**
 * parse template handle
 *
 * @export
 * @class ModuleBeforeInitHandle
 * @extends {ResolveComponentHandle}
 */
export const BuildComponentHandle = async function (ctx: ComponentContext, next?: () => Promise<void>): Promise<void> {
    const reflect = ctx.reflect as ComponentReflect;
    const type = ctx.type;
    if (reflect.annoType === 'component' && isFunction(type.ρCmp)) {
        // use compiler of component, register in module of current injector.
        ctx.value = type.ρCmp(ctx);
    }

    if (next) {
        await next();
    }
};


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
