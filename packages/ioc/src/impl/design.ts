import { Context, ContextToken, HandlerFn, InterceptorLike, invokeTail } from '../handler';
import { InjectorRecord } from '../injector';
import { ClassRef, DecoratorFn, DecoratorScope, Decors } from '../metadata/class';
import { AbstractInjector, Operator } from './injector';
import { Runtime } from '../runtime';
import { HandlerScope } from '../lifescope/lifescope';
import { IocContext } from '../lifescope/context';
import { isFunction } from '../utils/chk';
import { Provider } from '../providers';
import { createRecord, LAZY } from './common';

export const autorunInterceptor = (input: ClassRef, next: HandlerFn, context: IocContext) => {
    return invokeTail(() => next(input, context), (res) => {
        const runs = input.runnables.filter(c => c.auto && c.decorType === Decors.CLASS);
        if (runs.length < 1) {
            return
        }

        const invocation = input.createInvocation(context.injector);
        runs.forEach(meta => {
            invocation.invoke(meta.propertyKey);
        });
    })
}



function invokeHandler(decors: DecoratorFn[], input: ClassRef, scope: DecoratorScope, context: IocContext) {
    decors?.forEach(d => {
        context.currDecor = d;
        d.getDesignHandler?.(scope)?.(input, context);
    });
}

const BEFORE_ANNOATION_SCOPE = new ContextToken<HandlerScope<ClassRef, IocContext>>(() => null!);
export function getDesignBeforeAnnoationScope(runtime: Runtime): HandlerScope<ClassRef, IocContext> {
    let scope = runtime.get(BEFORE_ANNOATION_SCOPE);
    if (!scope) {
        scope = new HandlerScope<ClassRef, IocContext>(runtime, (input, context) => {
            invokeHandler(input.classDecors, input, Decors.beforeAnnoation, context)
        });
        runtime.set(BEFORE_ANNOATION_SCOPE, scope);
    }
    return scope;
}


const AFTER_ANNOATION_SCOPE = new ContextToken<HandlerScope<ClassRef, IocContext>>(() => null!);
export function getDesignAfterAnnoationScope(runtime: Runtime): HandlerScope<ClassRef, IocContext> {
    let scope = runtime.get(AFTER_ANNOATION_SCOPE);
    if (!scope) {
        scope = new HandlerScope<ClassRef, IocContext>(runtime, (input, context) => {
            invokeHandler(input.classDecors, input, Decors.afterAnnoation, context)
        });
        runtime.set(AFTER_ANNOATION_SCOPE, scope);
    }
    return scope;
}

/**
 * property decorator scope.
 */
const DESIGN_PROPERTY_SCOPE = new ContextToken<HandlerScope<ClassRef, IocContext>>(() => null!);
export function getDesignPropertyScope(runtime: Runtime): HandlerScope<ClassRef, IocContext> {
    let scope = runtime.get(DESIGN_PROPERTY_SCOPE);
    if (!scope) {
        scope = new HandlerScope<ClassRef>(runtime, (input, context) => {
            invokeHandler(input.propDecors, input, Decors.property, context)
        });
        runtime.set(DESIGN_PROPERTY_SCOPE, scope);
    }
    return scope;
}

const DESIGN_METHOD_SCOPE = new ContextToken<HandlerScope<ClassRef, IocContext>>(() => null!);

export function getDesignMethodScope(runtime: Runtime): HandlerScope<ClassRef, IocContext> {
    let scope = runtime.get(DESIGN_METHOD_SCOPE);
    if (!scope) {
        scope = new HandlerScope<ClassRef, IocContext>(runtime, (input, context) => {
            invokeHandler(input.methodDecors, input, Decors.method, context);
        });
        runtime.set(DESIGN_METHOD_SCOPE, scope);
    }
    return scope;
}


export const afterPropertyAnnoationInterceptor = (input: ClassRef, next: HandlerFn, context: IocContext) => {
    return invokeTail(() => next(input, context), (res) => {
        getDesignPropertyScope(context.runtime).handle(input, context);
        return res;
    });
}
export const afterMethodAnnoationInterceptor = (input: ClassRef, next: HandlerFn, context: IocContext) => {
    return invokeTail(() => next(input, context), (res) => {
        getDesignMethodScope(context.runtime).handle(input, context);
        return res;
    });
}
export const afterAnnoationInterceptor = (input: ClassRef, next: HandlerFn, context: IocContext) => {
    return invokeTail(() => next(input, context), (res) => {
        getDesignAfterAnnoationScope(context.runtime).handle(input, context);
        return res;
    });
}

export const beforeAnnoactionInterceptor = (input: ClassRef, next: HandlerFn, context: IocContext) => {
    return invokeTail(() => getDesignBeforeAnnoationScope(context.runtime).handle(input, context), () => next(input, context));
}


export const dependencyInterceptor = (input: ClassRef, next: HandlerFn, context: IocContext) => {
    // const { injector, type, provide, regProvides } = input;
    const type = input.type;
    const injector = context.injector as AbstractInjector;
    const provide = context.provide;
    if (provide && provide !== type) {
        const pType = input.getAnnotation().providedIn;
        if (isFunction(pType)) {
            // if (input.providedIn && isFunction(input.providedIn)) {
            const runtime = injector.getRuntime();
            //     if (!runtime.getInjector(type)) {
            const prd = { provide, useExisting: type } as Provider;
            runtime.setTypeProvider(pType, prd);
            injector.onDestroy(() => {
                runtime.removeTypeProvider(pType, prd);
            });
            //     }
        }
        const factory = ()=> injector.get(provide);
        input.provides.forEach(pdr => {
            if (provide != pdr) {
                injector.getRecords().set(pdr, createRecord(factory, injector.isStatic))
                // Operator.inject(injector, { provide: pdr, useExisting: provide })
            }
        })
    } else {
        const factory = ()=> injector.get(type);
        input.provides.forEach(provide => {
            injector.getRecords().set(provide, createRecord(factory, injector.isStatic))
            // regProvides !== false && Operator.inject(injector, { provide, useClass: type })
        })
    }
    return next(input, context);
}


// export const registerHandler: HandlerFn = (ctx: ClassRef, context: Context) => {
//     const { type, injector, runtime: runtime, provide } = ctx;
//     const singleton = ctx.singleton ?? ctx.classRef.getAnnotation().singleton === true;
//     const isStatic = ctx.static ?? ctx.classRef.getAnnotation().static;

//     const recd = {
//         type,
//         fn: (...fnArgs: any[]) => {
//             // make sure has value.
//             if (singleton && runtime.hasSingleton(type)) {
//                 return runtime.getSingleton(type)
//             }
//             let args: any[] | undefined;
//             let context: InvocationContext | undefined;
//             if (fnArgs.length) {
//                 const last = fnArgs[fnArgs.length - 1];
//                 if (last instanceof InvocationContext) {
//                     context = last;
//                     if (fnArgs.length > 1) {
//                         args = fnArgs.slice(0, fnArgs.length - 1);
//                     }
//                 } else {
//                     args = fnArgs;
//                 }
//             }
//             const ctx = {
//                 injector,
//                 provide,
//                 type,
//                 args,
//                 singleton,
//                 runtime,
//                 context
//             } as InitializeContext;

//             let instance: any;
//             runtime.initHandler.handle(ctx, null, {
//                 finally: () => {
//                     instance = ctx.instance;
//                     if (singleton || isStatic) {
//                         recd.value = instance
//                     }
//                     // clean context
//                     cleanObj(ctx);
//                 }
//             });

//             return instance ?? ctx.instance;
//         },
//         stic: isStatic,
//         fy: FnType.Inj
//     } as InjectorRecord;
//     ctx.getRecords().set(provide ?? type, recd)
// }

export const DESIGN_INTERECPTORS = [
    autorunInterceptor,
    afterAnnoationInterceptor,
    afterMethodAnnoationInterceptor,
    afterPropertyAnnoationInterceptor,
    beforeAnnoactionInterceptor,
    dependencyInterceptor
] as InterceptorLike<ClassRef, InjectorRecord, Context>[];