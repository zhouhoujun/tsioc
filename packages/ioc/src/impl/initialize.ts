import { ArgumentException, Exception } from '../exception';
import { ContextToken, HandlerFn, InterceptorFn, InterceptorLike, invokeTail } from '../handler';
import { PropertyMetadata } from '../metadata/meta';
import { ClassRef, ctorName, DecoratorFn, DecoratorScope, Decors } from '../metadata/class';
import { Runtime } from '../runtime';
import { AbstractType, Type } from '../types';
import { HandlerScope } from '../lifescope/lifescope';
import { Operator } from './injector';
import { RuntimeContext } from '../lifescope/context';
import { isDefined } from '../utils/chk';
import { resolveArg, resolveArgs } from './common';


// export const cleanContextInterceptor: InterceptorFn<ClassRef, any, RuntimeContext> = (input: ClassRef, next: HandlerFn, context: RuntimeContext) => {

//     return invokeTail(() => next(input, context), {
//         finally: () => {
//             // after create.
//             if (input.isNewContext && input.context && !input.context.used) {
//                 input.context.destroy()
//             }
//         }
//     });
// }

export const runtimeAutorunInterceptor: InterceptorFn<ClassRef, any, RuntimeContext> = (input: ClassRef, next: HandlerFn, context: RuntimeContext) => {

    return invokeTail(() => next(input, context), (instance) => {
        const autos = input.runnables.filter(c => c.auto && c.decorType === Decors.method)
        if (autos.length) {
            // const { injector, classRef: def, instance, context } = input;
            const injector = context.raiseInjector;
            const invocation = input.createInvocation(injector, { instance });
            autos.forEach(aut => {
                invocation.invoke(aut.propertyKey);
            })
        }
        return instance;
    });

}


const RUNTIME_CLASS_SCOPE = new ContextToken<HandlerScope>(() => null!);
export const runtimeAnnoInterceptor: InterceptorFn<ClassRef, any, RuntimeContext> = (input: ClassRef, next: HandlerFn, context: RuntimeContext) => {
    return invokeTail(() => next(input, context),
        (instance) => {
            getRuntimeClassScope(context.runtime).handle(input, context);
            return instance;
        })
}

function invokeRuntimeHandler(decors: DecoratorFn[], ctx: ClassRef, scope: DecoratorScope, context: RuntimeContext) {
    decors?.forEach(d => {
        context.currDecor = d;
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

// export const singletonInterceptor: InterceptorFn<ClassRef, any, RuntimeContext>  = (input: ClassRef, next: HandlerFn, context: RuntimeContext) => {

//     return invokeTail(() => next(input, context), (instance) => {
//         if (input.type && instance && input.getAnnotation().singleton) {
//             context.get(Runtime).setSingleton(input.provide || input.type, instance, context.get(RAISE_INJECTOR));
//         }
//     })
// }


export const cacheInterceptor: InterceptorFn<ClassRef, any, RuntimeContext> = (input: ClassRef, next: HandlerFn, context: RuntimeContext) => {

    return invokeTail(() => next(input, context), (instance) => {
        const ann = input.getAnnotation();
        if (!ann.singleton && (ann.expires && ann.expires > 0)) {
            const injector = context.raiseInjector;
            Operator.cache(injector, input.type, instance, ann.expires!);
        }
        return instance;
    });
}




export const methodInterceptor: InterceptorFn<ClassRef, any, RuntimeContext> = (input: ClassRef, next: HandlerFn, context: RuntimeContext) => {
    return invokeTail(() => next(input, context), (instance) => {
        getRuntimeMethodScope(context.runtime).handle(input, context);
        return instance;
    })
}

const RUNTIME_METHOD_SCOPE = new ContextToken<HandlerScope>(() => null!);
export function getRuntimeMethodScope(runtime: Runtime): HandlerScope<ClassRef> {
    let scope = runtime.context.get(RUNTIME_METHOD_SCOPE);
    if (!scope) {
        scope = new HandlerScope<ClassRef>(runtime, (input, context) => {
            invokeRuntimeHandler(input.methodDecors, input, Decors.method, context)

        });
        runtime.context.set(RUNTIME_METHOD_SCOPE, scope);
    }
    return scope;
}


export const propertyInterceptor: InterceptorFn<ClassRef, any, RuntimeContext> = (input: ClassRef, next: HandlerFn, context: RuntimeContext) => {

    return invokeTail(() => next(input, context), (instance) => {
        const injector = context.raiseInjector;
        // if (!ictx || !input.instance) throw new Exception('autowride property need InvocationContext');
        let meta: PropertyMetadata, key: string, val;

        input.eachPropertyProviders((metas, propertyKey) => {
            // if (!(define.metadata.type || define.metadata.provider)) return;
            meta = metas.find(m => m.type || m.provider)!;
            if (!meta) return;
            key = `${propertyKey.toString()}_INJECTED`;

            if (!context.has(key)) {
                val = resolveArg(injector, meta);
                if (isDefined(val)) {
                    instance[propertyKey] = val;
                    context.set(key, val);
                }
            }
        });

        return getRuntimePropertyScope(context.runtime).handle(input, context, () => instance);

    })

}

const RUNTIME_PROPERTY_SCOPE = new ContextToken<HandlerScope>(() => null!);
export function getRuntimePropertyScope(runtime: Runtime): HandlerScope<ClassRef> {
    let scope = runtime.context.get(RUNTIME_PROPERTY_SCOPE);
    if (!scope) {
        scope = new HandlerScope<ClassRef>(runtime, (input, context) => {
            invokeRuntimeHandler(input.propDecors, input, Decors.property, context)
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
export const ctorArgsInterceptor: InterceptorFn<ClassRef, any, RuntimeContext> = (input: ClassRef, next: HandlerFn, context: RuntimeContext) => {
    // if (!input.params) {
    //     input.params = input.getParameters(ctorName)
    // }

    // const uctx = context.get(RAISE_INJECTOR);
    // const providers = input.providers;
    // let newCtx: InvocationContext | undefined;
    // if (!uctx || (uctx.targetType && uctx.targetType !== input.type)) {
    //     newCtx = createContext(uctx ?? input.injector, {
    //         targetType: input.type,
    //         providers,
    //         resolvers: input.classRef.resolvers,
    //         propertyKey: ctorName
    //     });
    //     input.context = newCtx;
    //     input.isNewContext = true;
    // } else if (uctx && providers.length) {
    //     Operator.inject(uctx, providers)
    // }

    // if (!input.args) {
    //     input.args = input.resolveArguments(ctorName, input.context!)
    // }

    if (!context.args) {
        const params = context.params ?? input.getParameters(ctorName);
        const args = resolveArgs(context.raiseInjector, params);
        context.args = args;
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

