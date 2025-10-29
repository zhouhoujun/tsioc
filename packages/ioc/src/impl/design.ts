import { Context, ContextToken, HandlerFn, InterceptorLike, invokeTail } from '../handler';
import { InjectorRecord } from '../injector';
import { ClassRef, DecoratorFn, DecoratorScope, Decors } from '../metadata/class';
import { Operator  } from './base';
import { Runtime } from '../runtime';
import { HandlerScope } from '../lifescope/lifescope';
import { CURR_DECOR,  PROVIDERIN_INJECTOR, REGISTER_INJECTOR } from '../lifescope/tokens';

export const autorunInterceptor = (input: ClassRef, next: HandlerFn, context: Context) => {
    return invokeTail(() => next(input, context), (res) => {
        const runs = input.runnables.filter(c => c.auto && c.decorType === Decors.CLASS);
        if (runs.length < 1) {
            return
        }

        const invocation = input.createInvocation(context.get(REGISTER_INJECTOR));
        runs.forEach(meta => {
            invocation.invoke(meta.propertyKey);
        });
    })
}



function invokeHandler(decors: DecoratorFn[], input: ClassRef, scope: DecoratorScope, context: Context) {
    decors?.forEach(d => {
        // ctx.currDecor = d;
        context.set(CURR_DECOR, d);
        d.getDesignHandler?.(scope)?.(input, context);
    });
}

const BEFORE_ANNOATION_SCOPE = new ContextToken<HandlerScope<ClassRef>>(() => null!);
export function getDesignBeforeAnnoationScope(runtime: Runtime): HandlerScope<ClassRef> {
    let scope = runtime.context.get(BEFORE_ANNOATION_SCOPE);
    if (!scope) {
        scope = new HandlerScope<ClassRef>(runtime, (input, context) => {
            invokeHandler(input.classDecors, input, Decors.beforeAnnoation, context)
        });
        runtime.context.set(BEFORE_ANNOATION_SCOPE, scope);
    }
    return scope;
}


const AFTER_ANNOATION_SCOPE = new ContextToken<HandlerScope>(() => null!);
export function getDesignAfterAnnoationScope(runtime: Runtime): HandlerScope<ClassRef> {
    let scope = runtime.context.get(AFTER_ANNOATION_SCOPE);
    if (!scope) {
        scope = new HandlerScope<ClassRef>(runtime, (input, context) => {
            invokeHandler(input.classDecors, input, Decors.afterAnnoation, context)
        });
        runtime.context.set(AFTER_ANNOATION_SCOPE, scope);
    }
    return scope;
}


const DESIGN_PROPERTY_SCOPE = new ContextToken<HandlerScope<ClassRef>>(() => null!);
export function getDesignPropertyScope(runtime: Runtime): HandlerScope<ClassRef> {
    let scope = runtime.context.get(DESIGN_PROPERTY_SCOPE);
    if (!scope) {
        scope = new HandlerScope<ClassRef>(runtime, (input, context) => {
            invokeHandler(input.propDecors, input, Decors.property, context)
        });
        runtime.context.set(DESIGN_PROPERTY_SCOPE, scope);
    }
    return scope;
}

const DESIGN_METHOD_SCOPE = new ContextToken<HandlerScope<ClassRef>>(() => null!);

export function getDesignMethodScope(runtime: Runtime): HandlerScope<ClassRef> {
    let scope = runtime.context.get(DESIGN_METHOD_SCOPE);
    if (!scope) {
        scope = new HandlerScope<ClassRef>(runtime, (input, context) => {
            invokeHandler(input.methodDecors, input, Decors.method, context);
        });
        runtime.context.set(DESIGN_METHOD_SCOPE, scope);
    }
    return scope;
}


export const afterPropertyAnnoationInterceptor = (input: ClassRef, next: HandlerFn, context: Context) => {
    return invokeTail(() => next(input, context), () => getDesignPropertyScope(context.get(Runtime)).handle(input, context));
}
export const afterMethodAnnoationInterceptor = (input: ClassRef, next: HandlerFn, context: Context) => {
    return invokeTail(() => next(input, context), () => getDesignMethodScope(context.get(Runtime)).handle(input, context));
}
export const afterAnnoationInterceptor = (input: ClassRef, next: HandlerFn, context: Context) => {
    return invokeTail(() => next(input, context), () => getDesignAfterAnnoationScope(context.get(Runtime)).handle(input, context));
}

export const beforeAnnoactionInterceptor = (input: ClassRef, next: HandlerFn, context: Context) => {
    return invokeTail(() => getDesignBeforeAnnoationScope(context.get(Runtime)).handle(input, context), () => next(input, context));
}


export const dependencyInterceptor = (input: ClassRef, next: HandlerFn, context: Context) => {
    // const { injector, type, provide, regProvides } = input;
    const type = input.type;
    const providedIn = context.get(PROVIDERIN_INJECTOR);
    const regInjector = context.get(REGISTER_INJECTOR);
    const injector = providedIn ?? regInjector;
    const provide = context.get('provide');
    if (provide && provide !== type) {
        // if (input.providedIn && isFunction(input.providedIn)) {
            const runtime = injector.getRuntime();
        //     if (!runtime.getInjector(type)) {
                const pType = input.providedIn;
                const prd = { provide, useExisting: type };
                runtime.setTypeProvider(pType, prd);
                injector.onDestroy(() => {
                    runtime.removeTypeProvider(pType, prd);
                });
        //     }
        // }
        input.classRef.provides.forEach(provide => {
            if (provide != provide && regProvides !== false) {
                Operator.inject(injector, { provide, useExisting: provide })
            }
        })
    } else {
        input.classRef.provides.forEach(provide => {
            regProvides !== false && Operator.inject(injector, { provide, useClass: type })
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