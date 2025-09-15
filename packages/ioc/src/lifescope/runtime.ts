import { createContext, InvocationContext } from '../context';
import { ArgumentException, Exception } from '../exception';
import { Context, ContextToken, HandlerFn, InterceptorFn, InterceptorLike, invokeTail } from '../handler';
import { PropertyMetadata } from '../metadata/meta';
import { ctorName, DecoratorFn, DecoratorScope, Decors } from '../metadata/class';
import { Platform } from '../platform';
import { AbstractType } from '../types';
import { isDefined } from '../utils/chk';
import { initReflectInterceptor } from './commom';
import { RuntimeContext } from './ctx';
import { HandlerScope } from './lifescope';


export const cleanContextInterceptor: InterceptorFn<RuntimeContext, void> = (input: RuntimeContext, next: HandlerFn, context: Context) => {

    return invokeTail(() => next(input, context), {
        finally: () => {
            // after create.
            if (input.isNewContext && input.context && !input.context.used) {
                input.context.destroy()
            }
        }
    });
}

export const runtimeAutorunInterceptor: InterceptorFn<RuntimeContext, void> = (input: RuntimeContext, next: HandlerFn, context: Context) => {

    return invokeTail(() => next(input, context), (res) => {
        const autos = input.classRef.runnables.filter(c => c.auto && c.decorType === Decors.method)
        if (autos.length) {
            const { injector, classRef: def, instance, context } = input;
            const invocation = def.createInvocation(injector, { instance, parent: context });
            autos.forEach(aut => {
                invocation.invoke(aut.propertyKey);
            })
        }
    });

}


const RUNTIME_CLASS_SCOPE = new ContextToken<HandlerScope>(() => null!);
export const runtimeAnnoInterceptor: InterceptorFn<RuntimeContext, void> = (input: RuntimeContext, next: HandlerFn, context: Context) => {
    return invokeTail(() => next(input, context), () => getRuntimeClassScope(input.platform).handle(input, context));
}

function invokeRuntimeHandler(decors: DecoratorFn[], ctx: RuntimeContext, scope: DecoratorScope, context?: any) {
    decors?.forEach(d => {
        ctx.currDecor = d;
        d.getRuntimeHandler?.(scope)?.(ctx, context);
    });
}

export function getRuntimeClassScope(platform: Platform): HandlerScope<RuntimeContext> {
    let scope = platform.context.get(RUNTIME_CLASS_SCOPE);
    if (!scope) {
        scope = new HandlerScope<RuntimeContext>(platform, (ctx, context) => {
            invokeRuntimeHandler(ctx.classRef.classDecors, ctx, Decors.CLASS, context);
        });
        platform.context.set(RUNTIME_CLASS_SCOPE, scope);
    }
    return scope;
}

export const singletonInterceptor: InterceptorFn<RuntimeContext, void> = (input: RuntimeContext, next: HandlerFn, context: Context) => {

    return invokeTail(() => next(input, context), () => {
        if (input.type && input.instance && input.singleton) {
            input.platform.setSingleton(input.injector, input.provide || input.type, input.instance)
        }
    })
}


export const cacheInterceptor: InterceptorFn<RuntimeContext, void> = (input: RuntimeContext, next: HandlerFn, context: Context) => {

    return invokeTail(() => next(input, context), () => {

        if (!input.instance || input.singleton) return;
        const ann = input.classRef.getAnnotation();
        if (!ann.expires || ann.expires! <= 0) return;

        input.injector.cache(input.type, input.instance, ann.expires!);
    });
}




export const methodInterceptor: InterceptorFn<RuntimeContext, void> = (input: RuntimeContext, next: HandlerFn, context: Context) => {
    return invokeTail(() => next(input, context), () => {
        getRuntimeMethodScope(input.platform).handle(input, context);
    })
}

const RUNTIME_METHOD_SCOPE = new ContextToken<HandlerScope>(() => null!);
export function getRuntimeMethodScope(platform: Platform): HandlerScope<RuntimeContext> {
    let scope = platform.context.get(RUNTIME_METHOD_SCOPE);
    if (!scope) {
        scope = new HandlerScope<RuntimeContext>(platform, (ctx, context) => {
            invokeRuntimeHandler(ctx.classRef.methodDecors, ctx, Decors.method, context)

        });
        platform.context.set(RUNTIME_METHOD_SCOPE, scope);
    }
    return scope;
}


export const propertyInterceptor: InterceptorFn<RuntimeContext, void> = (input: RuntimeContext, next: HandlerFn, context: Context) => {

    return invokeTail(() => next(input, context), () => {
        const ictx = input.context;
        if (!ictx || !input.instance) throw new Exception('autowride property need InvocationContext');
        let meta: PropertyMetadata, key: string, val;

        input.classRef.eachPropertyProviders((metas, propertyKey) => {
            // if (!(define.metadata.type || define.metadata.provider)) return;
            key = `${propertyKey.toString()}_INJECTED`;
            meta = metas.find(m => m.provider)!;
            if (!meta) {
                meta = metas.find(m => m.type)!
            }
            if (!meta) return;
            if (!(input as any)[key]) {

                val = ictx.resolveArgument(meta, input.type, onError);

                if (isDefined(val)) {
                    input.instance[propertyKey] = val;
                    (input as any)[key] = true
                }
            }
        });

        return getRuntimePropertyScope(input.platform).handle(input, context);

    })

}

const RUNTIME_PROPERTY_SCOPE = new ContextToken<HandlerScope>(() => null!);
export function getRuntimePropertyScope(platform: Platform): HandlerScope<RuntimeContext> {
    let scope = platform.context.get(RUNTIME_PROPERTY_SCOPE);
    if (!scope) {
        scope = new HandlerScope<RuntimeContext>(platform, (ctx, context) => {
            invokeRuntimeHandler(ctx.classRef.propDecors, ctx, Decors.property, context)
        });
        platform.context.set(RUNTIME_PROPERTY_SCOPE, scope);
    }
    return scope;
}


const onError = (target: AbstractType, propertyKey: string) => {
    throw new ArgumentException(`can not autowride property ${propertyKey} of class ${target}`)
}

/**
 * resolve constructor args action.
 */
export const ctorArgsInterceptor: InterceptorFn<RuntimeContext, void> = (input: RuntimeContext, next: HandlerFn, context: Context) => {
    if (!input.params) {
        input.params = input.classRef.getParameters(ctorName)
    }

    const uctx = input.context;
    const providers = input.classRef.providers;
    let newCtx: InvocationContext | undefined;
    if (!uctx || (uctx.targetType && uctx.targetType !== input.type)) {
        newCtx = createContext(input.injector, {
            targetType: input.type,
            parent: uctx,
            providers,
            resolvers: input.classRef.resolvers,
            propertyKey: ctorName
        });
        input.context = newCtx;
        input.isNewContext = true;
    } else if (uctx && providers.length) {
        uctx.injector.inject(providers)
    }

    if (!input.args) {
        input.args = input.classRef.resolveArguments(ctorName, input.context!)
    }

    return next(input, context);
}




export const RUNTIME_INTERCEPTORS = [
    initReflectInterceptor,
    cleanContextInterceptor,
    runtimeAutorunInterceptor,
    runtimeAnnoInterceptor,
    cacheInterceptor,
    singletonInterceptor,
    methodInterceptor,
    propertyInterceptor,
    ctorArgsInterceptor
] as InterceptorLike<RuntimeContext>[]

