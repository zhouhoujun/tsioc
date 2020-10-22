import { isFunction } from '@tsdi/ioc';
import { ComponentContext } from '../context';
import { ComponentReflect, DirectiveReflect } from '../reflect';
import { ComponentType, DirectiveType } from '../type';
import { CompilerFacade } from './facade';

/**
 * build component handle
 *
 * @export
 * @class ModuleBeforeInitHandle
 * @extends {ResolveComponentHandle}
 */
export const BuildComponentHandle = async function (ctx: ComponentContext, next?: () => Promise<void>): Promise<void> {
    const reflect = ctx.reflect as ComponentReflect;
    const type = ctx.type as ComponentType;
    if (reflect.annoType === 'component' && isFunction(type.ρcmp)) {
        // use compiler of component, register in module of current injector.
        ctx.value = type.ρcmp(ctx);
    }

    if (next) {
        await next();
    }
};


/**
 * build directive handle
 *
 * @export
 * @class ModuleBeforeInitHandle
 * @extends {ResolveComponentHandle}
 */
export const BuildDirectiveHandle = async function (ctx: ComponentContext, next?: () => Promise<void>): Promise<void> {
    const reflect = ctx.reflect as DirectiveReflect;
    const type = ctx.type as DirectiveType;
    if (reflect.annoType === 'directive' && isFunction(type.ρdir)) {
        // use compiler of component, register in module of current injector.
        ctx.value = type.ρdir(ctx);
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
