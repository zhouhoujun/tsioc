import { IBuildContext } from '@tsdi/boot';
import { ComponentReflect } from '../reflect';
import { CompilerFacade } from './facade';

/**
 * build component handle
 *
 * @export
 * @class ModuleBeforeInitHandle
 * @extends {ResolveComponentHandle}
 */
export const BuildComponentHandle = async function (ctx: IBuildContext, next?: () => Promise<void>): Promise<void> {
    const reflect = ctx.reflect as ComponentReflect;
    if ((ctx.reflect as ComponentReflect).annoType === 'component') {
        if (!reflect.def && reflect.annotation.templateUrl) {
            const injector = ctx.injector;
            // const tmp = await ctx.injector.getLoader().load(reflect.annotation.templateUrl);
            // reflect.annotation.template = tmp;
            const compiler = injector.getService({ token: CompilerFacade, target: reflect.annoDecor });
            reflect.def = compiler.compileComponent(reflect);
        }
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
export const ParseTemplateHandle = async function (ctx: IBuildContext, next?: () => Promise<void>): Promise<void> {
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
