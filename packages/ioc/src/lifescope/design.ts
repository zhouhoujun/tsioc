import { InvocationContext } from '../context';
import { Context, ContextToken, HandlerFn, InterceptorLike, invokeTail } from '../handler';
import { DefaultInvocationFactory } from '../impl';
import { FactoryRecord, FnType } from '../injector';
import { DecoratorFn, DecoratorScope, Decors } from '../metadata/class';
import { InvocationFactory } from '../invocation';
import { Platform } from '../platform';
// import { ReflectiveFactory } from '../reflective';
import { isType } from '../utils/chk';
import { cleanObj } from '../utils/lang';
import { initReflectInterceptor } from './commom';
import { DesignContext, RuntimeContext } from './ctx';
import { LifeScope } from './lifescope';

export const autorunInterceptor = (ctx: DesignContext, next: HandlerFn, context: Context) => {
    return invokeTail(() => next(ctx, context), (res) => {
        const runs = ctx.class.runnables.filter(c => c.auto && c.decorType === Decors.CLASS);
        if (runs.length < 1) {
            return
        }

        const invocation = ctx.platform.getInvocationFactory(ctx.class, ctx.injector).create();
        runs.forEach(meta => {
            invocation.invoke(meta.method);
        });
    })
}

function invokeHandler(decors: DecoratorFn[], ctx: DesignContext, scope: DecoratorScope, context?: any) {
    decors?.forEach(d => {
        ctx.currDecor = d;
        d.getDesignHandler?.(scope)?.(ctx, context);
    });
}

const BEFORE_ANNOATION_SCOPE = new ContextToken<LifeScope>(() => null!);
export function getDesignBeforeAnnoationScope(platform: Platform): LifeScope<DesignContext> {
    let scope = platform.context.get(BEFORE_ANNOATION_SCOPE);
    if (!scope) {
        scope = new LifeScope<DesignContext>(platform, (ctx, context) => {
            invokeHandler(ctx.class.classDecors, ctx, Decors.beforeAnnoation, context)
        });
        platform.context.set(BEFORE_ANNOATION_SCOPE, scope);
    }
    return scope;
}


const AFTER_ANNOATION_SCOPE = new ContextToken<LifeScope>(() => null!);
export function getDesignAfterAnnoationScope(platform: Platform): LifeScope<DesignContext> {
    let scope = platform.context.get(AFTER_ANNOATION_SCOPE);
    if (!scope) {
        scope = new LifeScope<DesignContext>(platform, (ctx, context) => {
            invokeHandler(ctx.class.classDecors, ctx, Decors.afterAnnoation, context)
        });
        platform.context.set(AFTER_ANNOATION_SCOPE, scope);
    }
    return scope;
}


const DESIGN_PROPERTY_SCOPE = new ContextToken<LifeScope>(() => null!);
export function getDesignPropertyScope(platform: Platform): LifeScope<DesignContext> {
    let scope = platform.context.get(DESIGN_PROPERTY_SCOPE);
    if (!scope) {
        scope = new LifeScope<DesignContext>(platform, (ctx, context) => {
            invokeHandler(ctx.class.propDecors, ctx, Decors.property, context)
        });
        platform.context.set(DESIGN_PROPERTY_SCOPE, scope);
    }
    return scope;
}

const DESIGN_METHOD_SCOPE = new ContextToken<LifeScope>(() => null!);

export function getDesignMethodScope(platform: Platform): LifeScope<DesignContext> {
    let scope = platform.context.get(DESIGN_METHOD_SCOPE);
    if (!scope) {
        scope = new LifeScope<DesignContext>(platform, (ctx, context) => {
            invokeHandler(ctx.class.methodDecors, ctx, Decors.method, context);
        });
        platform.context.set(DESIGN_METHOD_SCOPE, scope);
    }
    return scope;
}


export const afterPropertyAnnoationInterceptor = (input: DesignContext, next: HandlerFn, context: Context) => {
    return invokeTail(() => next(input, context), () => getDesignPropertyScope(input.platform).handle(input, context));
}
export const afterMethodAnnoationInterceptor = (input: DesignContext, next: HandlerFn, context: Context) => {
    return invokeTail(() => next(input, context), () => getDesignMethodScope(input.platform).handle(input, context));
}
export const afterAnnoationInterceptor = (input: DesignContext, next: HandlerFn, context: Context) => {
    return invokeTail(() => next(input, context), () => getDesignAfterAnnoationScope(input.platform).handle(input, context));
}

export const beforeAnnoactionInterceptor = (input: DesignContext, next: HandlerFn, context: Context) => {
    return invokeTail(() => getDesignBeforeAnnoationScope(input.platform).handle(input, context), () => next(input, context));
}


export const dependencyInterceptor = (input: DesignContext, next: HandlerFn, context: Context) => {
    const { injector, type, provide, regProvides } = input;
    if (provide && provide !== type) {
        if (input.providedIn && isType(input.providedIn)) {
            const platform = injector.platform();
            if (!platform.getInjector(type)) {
                const pType = input.providedIn;
                const prd = { provide, useExisting: type };
                platform.setTypeProvider(pType, prd);
                injector.onDestroy(() => {
                    platform.removeTypeProvider(pType, prd);
                });
            }
        }
        input.class.provides.forEach(provide => {
            if (provide != provide && regProvides !== false) {
                injector.inject({ provide, useExisting: provide })
            }
        })
    } else {
        input.class.provides.forEach(provide => {
            regProvides !== false && injector.inject({ provide, useClass: type })
        })
    }
    return next(input, context);
}


export const registerHandler: HandlerFn = (ctx: DesignContext, context: Context) => {
    const { type, injector, platform } = ctx;
    const provide = ctx.provide || ctx.type;
    const singleton = ctx.singleton ?? ctx.class.getAnnotation().singleton === true;
    const isStatic = ctx.static ?? ctx.class.getAnnotation().static;

    const recd = {
        type,
        fn: (...fnArgs: any[]) => {
            // make sure has value.
            if (singleton && platform.hasSingleton(type)) {
                return platform.getSingleton(type)
            }
            let args: any[] | undefined;
            let context: InvocationContext | undefined;
            if (fnArgs.length) {
                const last = fnArgs[fnArgs.length - 1];
                if (last instanceof InvocationContext) {
                    context = last;
                    if (fnArgs.length > 1) {
                        args = fnArgs.slice(0, fnArgs.length - 1);
                    }
                } else {
                    args = fnArgs;
                }
            }
            const ctx = {
                injector,
                provide,
                type,
                args,
                singleton,
                platform,
                context
            } as RuntimeContext;

            let instance: any;
            platform.runtime.handle(ctx, null, {
                finally: () => {
                    instance = ctx.instance;
                    if (singleton || isStatic) {
                        recd.value = instance
                    }
                    // clean context
                    cleanObj(ctx);
                }
            });

            return instance ?? ctx.instance;
        },
        stic: isStatic,
        fy: FnType.Inj
    } as FactoryRecord;
    ctx.getRecords().set(provide, recd)
}

export const DESIGN_INTERECPTORS = [
    initReflectInterceptor,
    autorunInterceptor,
    afterAnnoationInterceptor,
    afterMethodAnnoationInterceptor,
    afterPropertyAnnoationInterceptor,
    beforeAnnoactionInterceptor,
    dependencyInterceptor
] as InterceptorLike<DesignContext>[];