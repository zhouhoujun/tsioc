import { createContext, InvocationContext } from '../context';
import { ArgumentException, Exception } from '../exception';
import { Context, ContextToken, HandlerFn, InterceptorFn, InterceptorLike, invokeTail } from '../handler';
import { PropertyMetadata } from '../metadata/meta';
import { ClassRef, ctorName, DecoratorFn, DecoratorScope, Decors } from '../metadata/class';
import { Runtime } from '../runtime';
import { AbstractType } from '../types';
import { HandlerScope } from '../lifescope/lifescope';
import { Operator } from './base';
import { RAISE_INJECTOR } from '../lifescope/tokens';


export const cleanContextInterceptor: InterceptorFn<ClassRef, any, Context> = (input: ClassRef, next: HandlerFn, context: Context) => {

    return invokeTail(() => next(input, context), {
        finally: () => {
            // after create.
            if (input.isNewContext && input.context && !input.context.used) {
                input.context.destroy()
            }
        }
    });
}

export const runtimeAutorunInterceptor: InterceptorFn<ClassRef, any, Context>  = (input: ClassRef, next: HandlerFn, context: Context) => {

    return invokeTail(() => next(input, context), (instance) => {
        const autos = input.runnables.filter(c => c.auto && c.decorType === Decors.method)
        if (autos.length) {
            // const { injector, classRef: def, instance, context } = input;
            const injector = context.get(RAISE_INJECTOR);
            const invocation = input.createInvocation(injector, { instance });
            autos.forEach(aut => {
                invocation.invoke(aut.propertyKey);
            })
        }
    });

}


const RUNTIME_CLASS_SCOPE = new ContextToken<HandlerScope>(() => null!);
export const runtimeAnnoInterceptor: InterceptorFn<ClassRef, any, Context>  = (input: ClassRef, next: HandlerFn, context: Context) => {
    return invokeTail(() => next(input, context), () => getRuntimeClassScope(context.get(Runtime)).handle(input, context));
}

function invokeRuntimeHandler(decors: DecoratorFn[], ctx: ClassRef, scope: DecoratorScope, context: Context) {
    decors?.forEach(d => {
        // ctx.currDecor = d;
        context
        d.getRuntimeHandler?.(scope)?.(ctx, context);
    });
}

export function getRuntimeClassScope(runtime: Runtime): HandlerScope<ClassRef> {
    let scope = runtime.context.get(RUNTIME_CLASS_SCOPE);
    if (!scope) {
        scope = new HandlerScope<ClassRef>(runtime, (input, context) => {
            invokeRuntimeHandler(input.classDecors, input, Decors.CLASS, context);
        });
        runtime.context.set(RUNTIME_CLASS_SCOPE, scope);
    }
    return scope;
}

export const singletonInterceptor: InterceptorFn<ClassRef, any, Context>  = (input: ClassRef, next: HandlerFn, context: Context) => {

    return invokeTail(() => next(input, context), (instance) => {
        if (input.type && instance && input.singleton) {
            input.runtime.setSingleton(input.provide || input.type, input.instance, input.injector)
        }
    })
}


export const cacheInterceptor: InterceptorFn<ClassRef, any, Context>  = (input: ClassRef, next: HandlerFn, context: Context) => {

    return invokeTail(() => next(input, context), () => {

        if (!input.instance || input.singleton) return;
        const ann = input.classRef.getAnnotation();
        if (!ann.expires || ann.expires! <= 0) return;

        Operator.cache(input.injector, input.type, input.instance, ann.expires!);
    });
}




export const methodInterceptor: InterceptorFn<ClassRef, any, Context>  = (input: ClassRef, next: HandlerFn, context: Context) => {
    return invokeTail(() => next(input, context), () => {
        getRuntimeMethodScope(input.runtime).handle(input, context);
    })
}

const RUNTIME_METHOD_SCOPE = new ContextToken<HandlerScope>(() => null!);
export function getRuntimeMethodScope(runtime: Runtime): HandlerScope<ClassRef> {
    let scope = runtime.context.get(RUNTIME_METHOD_SCOPE);
    if (!scope) {
        scope = new HandlerScope<ClassRef>(runtime, (ctx, context) => {
            invokeRuntimeHandler(ctx.classRef.methodDecors, ctx, Decors.method, context)

        });
        runtime.context.set(RUNTIME_METHOD_SCOPE, scope);
    }
    return scope;
}


export const propertyInterceptor: InterceptorFn<ClassRef, any, Context>  = (input: ClassRef, next: HandlerFn, context: Context) => {

    return invokeTail(() => next(input, context), () => {
        const ictx = input.context;
        if (!ictx || !input.instance) throw new Exception('autowride property need InvocationContext');
        let meta: PropertyMetadata, key: string, val;

        input.classRef.eachPropertyProviders((metas, propertyKey) => {
            // if (!(define.metadata.type || define.metadata.provider)) return;
            meta = metas.find(m => m.type || m.provider)!;
            if (!meta) return;
            key = `${propertyKey.toString()}_INJECTED`;

            if (!(input as any)[key]) {
                val = ictx.resolveArgument(meta, input.type, onError);
                // if (isDefined(val)) {
                input.instance[propertyKey] = val;
                (input as any)[key] = true
                // }
            }
        });

        return getRuntimePropertyScope(input.runtime).handle(input, context);

    })

}

const RUNTIME_PROPERTY_SCOPE = new ContextToken<HandlerScope>(() => null!);
export function getRuntimePropertyScope(runtime: Runtime): HandlerScope<ClassRef> {
    let scope = runtime.context.get(RUNTIME_PROPERTY_SCOPE);
    if (!scope) {
        scope = new HandlerScope<ClassRef>(runtime, (ctx, context) => {
            invokeRuntimeHandler(ctx.classRef.propDecors, ctx, Decors.property, context)
        });
        runtime.context.set(RUNTIME_PROPERTY_SCOPE, scope);
    }
    return scope;
}


const onError = (target: AbstractType, propertyKey: string) => {
    throw new ArgumentException(`can not autowride property ${propertyKey} of class ${target}`)
}

/**
 * resolve constructor args action.
 */
export const ctorArgsInterceptor: InterceptorFn<ClassRef, any, Context>  = (input: ClassRef, next: HandlerFn, context: Context) => {
    if (!input.params) {
        input.params = input.classRef.getParameters(ctorName)
    }

    const uctx = input.context;
    const providers = input.classRef.providers;
    let newCtx: InvocationContext | undefined;
    if (!uctx || (uctx.targetType && uctx.targetType !== input.type)) {
        newCtx = createContext(uctx ?? input.injector, {
            targetType: input.type,
            providers,
            resolvers: input.classRef.resolvers,
            propertyKey: ctorName
        });
        input.context = newCtx;
        input.isNewContext = true;
    } else if (uctx && providers.length) {
        Operator.inject(uctx, providers)
    }

    if (!input.args) {
        input.args = input.classRef.resolveArguments(ctorName, input.context!)
    }

    return next(input, context);
}




export const INITIALIZE_INTERCEPTORS = [
    cleanContextInterceptor,
    runtimeAutorunInterceptor,
    runtimeAnnoInterceptor,
    cacheInterceptor,
    singletonInterceptor,
    methodInterceptor,
    propertyInterceptor,
    ctorArgsInterceptor
] as InterceptorLike<ClassRef>[]

