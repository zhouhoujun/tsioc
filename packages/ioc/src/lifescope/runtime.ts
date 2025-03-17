import { createContext, InvocationContext } from '../context';
import { ArgumentExecption, Execption } from '../execption';
import { Context, ContextToken, HandlerFn, InterceptorFn, invokeTail } from '../handler';
import { PropertyMetadata } from '../metadata/meta';
import { ctorName, DecoratorFn, DecoratorScope, Decors } from '../metadata/type';
import { Platform } from '../platform';
import { ReflectiveFactory } from '../reflective';
import { Parameter } from '../resolver';
import { Type } from '../types';
import { isDefined } from '../utils/chk';
import { initReflectInterceptor } from './commom';
import { RuntimeContext } from './ctx';
import { LifeScope } from './lifescope';


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
        const autos = input.class.runnables.filter(c => c.auto && c.decorType === Decors.method)
        if (autos.length) {
            const { injector, class: def, instance, context } = input;
            const factory = injector.get(ReflectiveFactory).create(def, context);
            autos.forEach(aut => {
                factory.invoke(aut.method, context, instance)
            })
        }
    });

}


const RUNTIME_CLASS_SCOPE = new ContextToken<LifeScope>(() => null!);
export const runtimeAnnoInterceptor: InterceptorFn<RuntimeContext, void> = (input: RuntimeContext, next: HandlerFn, context: Context) => {
    return invokeTail(() => next(input, context), () => getRuntimeClassScope(input.platform).handle(input, context));
}

function invokeRuntimeHandler(decors: DecoratorFn[], ctx: RuntimeContext, scope: DecoratorScope, context?: any) {
    decors.forEach(d => {
        ctx.currDecor = d;
        d.getRuntimeHandler?.(scope)?.forEach(h => {
            h(ctx, context);
        })
    });
}

export function getRuntimeClassScope(platform: Platform): LifeScope<RuntimeContext> {
    let scope = platform.context.get(RUNTIME_CLASS_SCOPE);
    if (!scope) {
        scope = new LifeScope<RuntimeContext>(platform, (ctx, context) => {
            invokeRuntimeHandler(ctx.class.classDecors, ctx, Decors.CLASS, context);
        });
        platform.context.set(RUNTIME_CLASS_SCOPE, scope);
    }
    return scope;
}

export const singletonInterceptor: InterceptorFn<RuntimeContext, void> = (input: RuntimeContext, next: HandlerFn, context: Context) => {

    next(input, context);

    if (input.type && input.instance && input.singleton) {
        input.platform.registerSingleton(input.injector, input.provide || input.type, input.instance)
    }
}


export const cacheInterceptor: InterceptorFn<RuntimeContext, void> = (input: RuntimeContext, next: HandlerFn, context: Context) => {

    return invokeTail(() => next(input, context), () => {

        if (!input.instance || input.singleton) return;
        const ann = input.class.getAnnotation();
        if (!ann.expires || ann.expires! <= 0) return;

        input.injector.cache(input.type, input.instance, ann.expires!);
    });
}




export const methodInterceptor: InterceptorFn<RuntimeContext, void> = (input: RuntimeContext, next: HandlerFn, context: Context) => {
    return invokeTail(() => next(input, context), () => {
        getRuntimeMethodScope(input.platform).handle(input, context);
    })
}

const RUNTIME_METHOD_SCOPE = new ContextToken<LifeScope>(() => null!);
export function getRuntimeMethodScope(platform: Platform): LifeScope<RuntimeContext> {
    let scope = platform.context.get(RUNTIME_METHOD_SCOPE);
    if (!scope) {
        scope = new LifeScope<RuntimeContext>(platform, (ctx, context) => {
            invokeRuntimeHandler(ctx.class.methodDecors, ctx, Decors.method, context)

        });
        platform.context.set(RUNTIME_METHOD_SCOPE, scope);
    }
    return scope;
}


export const propertyInterceptor: InterceptorFn<RuntimeContext, void> = (input: RuntimeContext, next: HandlerFn, context: Context) => {

    return invokeTail(() => next(input, context), () => {
        const ictx = input.context;
        if (!ictx) throw new Execption('autowride property need InvocationContext');
        let meta: PropertyMetadata, key: string, val;

        input.class.eachProperty((metas, propertyKey) => {
            key = `${propertyKey}_INJECTED`;
            meta = metas.find(m => m.provider)!;
            if (!meta) {
                meta = metas.find(m => m.type)!
            }
            if (meta && !(input as any)[key]) {

                val = ictx.resolveArgument(meta as Parameter, input.type, onError);

                if (isDefined(val)) {
                    input.instance[propertyKey] = val;
                    (input as any)[key] = true
                }
            }
        });

        return getRuntimePropertyScope(input.platform).handle(input, context);

    })

}

const RUNTIME_PROPERTY_SCOPE = new ContextToken<LifeScope>(() => null!);
export function getRuntimePropertyScope(platform: Platform): LifeScope<RuntimeContext> {
    let scope = platform.context.get(RUNTIME_PROPERTY_SCOPE);
    if (!scope) {
        scope = new LifeScope<RuntimeContext>(platform, (ctx, context) => {
            invokeRuntimeHandler(ctx.class.propDecors, ctx, Decors.property, context)
        });
        platform.context.set(RUNTIME_PROPERTY_SCOPE, scope);
    }
    return scope;
}


const onError = (target: Type, propertyKey: string) => {
    throw new ArgumentExecption(`can not autowride property ${propertyKey} of class ${target}`)
}

/**
 * resolve constructor args action.
 */
export const ctorArgsInterceptor: InterceptorFn<RuntimeContext, void> = (input: RuntimeContext, next: HandlerFn, context: Context) => {
    if (!input.params) {
        input.params = input.class.getParameters(ctorName)
    }

    const uctx = input.context;
    const providers = input.class.providers;
    let newCtx: InvocationContext | undefined;
    if (!uctx || (uctx.targetType && uctx.targetType !== input.type)) {
        newCtx = createContext(input.injector, {
            targetType: input.type,
            parent: uctx,
            providers,
            methodName: ctorName
        });
        input.context = newCtx;
        input.isNewContext = true;
    } else if (uctx && providers.length) {
        uctx.injector.inject(providers)
    }

    if (!input.args) {
        input.args = input.class.resolveArguments(ctorName, input.context!)
    }

    return next(input, context);
}

const BEFORE_CTOR_SCOPE = new ContextToken<LifeScope>(() => null!);
export function getRuntimeBeforeCtorScope(platform: Platform): LifeScope<RuntimeContext> {
    let scope = platform.context.get(BEFORE_CTOR_SCOPE);
    if (!scope) {
        scope = new LifeScope<RuntimeContext>(platform, (ctx, context) => {
            invokeRuntimeHandler(ctx.class.classDecors, ctx, Decors.beforeConstructor, context)
        });
        platform.context.set(BEFORE_CTOR_SCOPE, scope);
    }
    return scope;
}

const AFTER_CTOR_SCOPE = new ContextToken<LifeScope>(() => null!);
export function getRuntimeAfterCtorScope(platform: Platform): LifeScope<RuntimeContext> {
    let scope = platform.context.get(AFTER_CTOR_SCOPE);
    if (!scope) {
        scope = new LifeScope<RuntimeContext>(platform, (ctx, context) => {
            invokeRuntimeHandler(ctx.class.classDecors, ctx, Decors.afterConstructor, context)
        });
        platform.context.set(AFTER_CTOR_SCOPE, scope);
    }
    return scope;
}


/**
 * after constructor decorator.
 *
 */
export const ctorInterceptor: InterceptorFn<RuntimeContext, void> = (input: RuntimeContext, next: HandlerFn, context: Context) => {

    getRuntimeBeforeCtorScope(input.platform).handle(input, context);

    next(input, context);

    getRuntimeAfterCtorScope(input.platform).handle(input, context);
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
    ctorArgsInterceptor,
    ctorInterceptor
]

