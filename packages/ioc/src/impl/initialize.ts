import { Exception } from '../exception';
import { ContextToken, HandlerFn, InterceptorFn, InterceptorLike } from '../handler';
import { PropertyMetadata } from '../metadata/meta';
import { ClassRef, ctorName, DecoratorFn, DecoratorScope, Decors } from '../metadata/class';
import { Runtime } from '../runtime';
import { Type } from '../types';
import { RuntimeHandler } from '../lifescope/handler';
import { InjectUtil } from './injector';
import { RuntimeContext } from '../lifescope/context';
import { isDefined } from '../utils/chk';
import { resolveArgs, resolveParameters } from './common';
import { getResolver, ResolveContext } from '../resolver';


export const runtimeAutorunInterceptor: InterceptorFn<ClassRef, any, RuntimeContext> = (input: ClassRef, next: HandlerFn, context: RuntimeContext) => {

    return next(input, context, (instance) => {
        const autos = input.runnables.filter(c => c.auto && c.decorType === Decors.method)
        if (autos.length) {
            // const { injector, classRef: def, instance, context } = input;
            const injector = context.raiseInjector;
            const invocation = input.createInvocation(injector, { instance });
            for (const aut of autos) {
                invocation.invoke(aut.propertyKey);
            }
        }
        return instance;
    });

}


const RUNTIME_CLASS_SCOPE = new ContextToken<RuntimeHandler<ClassRef, any, RuntimeContext>>(() => null!);
export const runtimeAnnoInterceptor: InterceptorFn<ClassRef, any, RuntimeContext> = (input: ClassRef, next: HandlerFn, context: RuntimeContext) => {
    return next(input, context,
        (instance) => {
            getRuntimeClassScope(context.runtime).handle(input, context);
            return instance;
        })
}

function invokeRuntimeHandler(decors: DecoratorFn[], ctx: ClassRef, scope: DecoratorScope, context: RuntimeContext) {
    if (!decors || decors.length < 1) {
        return
    }
    for (const d of decors) {
        context.currDecor = d;
        d.getRuntimeHandler?.(scope)?.(ctx, context);
    }
}

export function getRuntimeClassScope(runtime: Runtime): RuntimeHandler<ClassRef, any, RuntimeContext> {
    let scope = runtime.get(RUNTIME_CLASS_SCOPE);
    if (!scope) {
        scope = new RuntimeHandler<ClassRef, any, RuntimeContext>((input, context) => {
            invokeRuntimeHandler(input.classDecors, input, Decors.CLASS, context);
        });
        runtime.set(RUNTIME_CLASS_SCOPE, scope);
    }
    return scope;
}


export const cacheInterceptor: InterceptorFn<ClassRef, any, RuntimeContext> = (input: ClassRef, next: HandlerFn, context: RuntimeContext) => {

    return next(input, context, (instance) => {
        const ann = input.getAnnotation();
        if (!ann.singleton && (ann.expires && ann.expires > 0)) {
            const injector = context.raiseInjector;
            InjectUtil.cache(injector, input.type, instance, ann.expires!);
        }
        return instance;
    });
}




export const methodInterceptor: InterceptorFn<ClassRef, any, RuntimeContext> = (input: ClassRef, next: HandlerFn, context: RuntimeContext) => {
    return next(input, context, (instance) => {
        return getRuntimeMethodScope(context.runtime).handle(input, context, () => instance);
    })
}

const RUNTIME_METHOD_SCOPE = new ContextToken<RuntimeHandler<ClassRef, any, RuntimeContext>>(() => null!);
export function getRuntimeMethodScope(runtime: Runtime): RuntimeHandler<ClassRef, any, RuntimeContext> {
    let scope = runtime.get(RUNTIME_METHOD_SCOPE);
    if (!scope) {
        scope = new RuntimeHandler<ClassRef, any, RuntimeContext>((input, context) => {
            invokeRuntimeHandler(input.methodDecors, input, Decors.method, context)

        });
        runtime.set(RUNTIME_METHOD_SCOPE, scope);
    }
    return scope;
}


export const propertyInterceptor: InterceptorFn<ClassRef, any, RuntimeContext> = (input: ClassRef, next: HandlerFn, context: RuntimeContext) => {

    return next(input, context, (instance) => {
        const injector = context.raiseInjector;
        if (!instance) throw new Exception('autowride property need instance');
        let meta: PropertyMetadata, key: string, val;

        const rctx = context.as(ResolveContext)
            .setInjector(injector);

        const resolver = getResolver(injector);
        input.eachPropertyProviders((metas, propertyKey) => {
            meta = metas.find(m => m.type || m.provider)!;
            if (!meta) return;
            key = `${propertyKey.toString()}_INJECTED`;

            if (!context.has(key)) {
                val = resolver.resolve(meta, rctx);
                if (isDefined(val)) {
                    instance[propertyKey] = val;
                    context.set(key, val);
                }
            }
        });
        rctx.onDestroy();

        return getRuntimePropertyScope(context.runtime).handle(input, context, () => instance);

    })

}

const RUNTIME_PROPERTY_SCOPE = new ContextToken<RuntimeHandler<ClassRef, any, RuntimeContext>>(() => null!);
export function getRuntimePropertyScope(runtime: Runtime): RuntimeHandler<ClassRef, any, RuntimeContext> {
    let scope = runtime.get(RUNTIME_PROPERTY_SCOPE);
    if (!scope) {
        scope = new RuntimeHandler<ClassRef, any, RuntimeContext>((input, context) => {
            invokeRuntimeHandler(input.propDecors, input, Decors.property, context)
        });
        runtime.set(RUNTIME_PROPERTY_SCOPE, scope);
    }
    return scope;
}


/**
 * resolve constructor args action.
 */
export const ctorArgsInterceptor: InterceptorFn<ClassRef, any, RuntimeContext> = (input: ClassRef, next: HandlerFn, context: RuntimeContext) => {

    if (!context.args) {
        const injector = context.raiseInjector;
        const resolver = getResolver(injector);
        const rctx = context.as(ResolveContext).setInjector(injector);
        const args = context.params ? resolveArgs(injector, context.params, resolver, rctx)
            : resolveParameters(injector, input.getParameters(ctorName), resolver, rctx);
        context.args = args;

        rctx.onDestroy();
    }

    return next(input, context);


}


export const instanceHandler = (typeRef: ClassRef, context: RuntimeContext) => {
    const args = context.args ?? [];

    const instance = new (typeRef.type as Type)(...args);
    context.instance = instance;
    return instance;

}


export const INITIALIZE_INTERCEPTORS = [
    // cleanContextInterceptor,
    runtimeAutorunInterceptor,
    runtimeAnnoInterceptor,
    cacheInterceptor,
    // singletonInterceptor,
    methodInterceptor,
    propertyInterceptor,
    ctorArgsInterceptor
] as InterceptorLike<ClassRef>[]

