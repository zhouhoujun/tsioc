import { Context, ContextToken, HandlerFn, InterceptorLike, invokeTail } from '../handler';
import { InjectorRecord } from '../injector';
import { ClassRef, DecoratorFn, DecoratorScope, Decors } from '../metadata/class';
import { AbstractInjector } from './injector';
import { Runtime } from '../runtime';
import { RuntimeHandler } from '../lifescope/handler';
import { IocContext } from '../lifescope/context';
import { isFunction } from '../utils/chk';
import { Provider } from '../providers';
import { createRecord } from './common';

export const autorunInterceptor = (input: ClassRef, next: HandlerFn, context: IocContext) => {
    return invokeTail(() => next(input, context), (res) => {
        const runs = input.runnables.filter(c => c.auto && c.decorType === Decors.CLASS);
        if (runs.length < 1) {
            return
        }

        const invocation = input.createInvocation(context.injector);
        for (const meta of runs) {
            invocation.invoke(meta.propertyKey);
        }
    })
}



function invokeHandler(decors: DecoratorFn[], input: ClassRef, scope: DecoratorScope, context: IocContext) {
    if (!decors || decors.length < 1) {
        return
    }
    for (let i = 0, len = decors.length; i < len; i++) {
        const d = decors[i];
        context.currDecor = d;
        d.getDesignHandler?.(scope)?.(input, context);
    }
}

const BEFORE_ANNOATION_SCOPE = new ContextToken<RuntimeHandler<ClassRef, IocContext>>(() => null!);
export function getDesignBeforeAnnoationScope(runtime: Runtime): RuntimeHandler<ClassRef, IocContext> {
    let scope = runtime.get(BEFORE_ANNOATION_SCOPE);
    if (!scope) {
        scope = new RuntimeHandler<ClassRef, IocContext>((input, context) => {
            invokeHandler(input.classDecors, input, Decors.beforeAnnoation, context)
        });
        runtime.set(BEFORE_ANNOATION_SCOPE, scope);
    }
    return scope;
}


const AFTER_ANNOATION_SCOPE = new ContextToken<RuntimeHandler<ClassRef, IocContext>>(() => null!);
export function getDesignAfterAnnoationScope(runtime: Runtime): RuntimeHandler<ClassRef, IocContext> {
    let scope = runtime.get(AFTER_ANNOATION_SCOPE);
    if (!scope) {
        scope = new RuntimeHandler<ClassRef, IocContext>((input, context) => {
            invokeHandler(input.classDecors, input, Decors.afterAnnoation, context)
        });
        runtime.set(AFTER_ANNOATION_SCOPE, scope);
    }
    return scope;
}

/**
 * property decorator scope.
 */
const DESIGN_PROPERTY_SCOPE = new ContextToken<RuntimeHandler<ClassRef, IocContext>>(() => null!);
export function getDesignPropertyScope(runtime: Runtime): RuntimeHandler<ClassRef, IocContext> {
    let scope = runtime.get(DESIGN_PROPERTY_SCOPE);
    if (!scope) {
        scope = new RuntimeHandler<ClassRef>((input, context) => {
            invokeHandler(input.propDecors, input, Decors.property, context)
        });
        runtime.set(DESIGN_PROPERTY_SCOPE, scope);
    }
    return scope;
}

const DESIGN_METHOD_SCOPE = new ContextToken<RuntimeHandler<ClassRef, IocContext>>(() => null!);

export function getDesignMethodScope(runtime: Runtime): RuntimeHandler<ClassRef, IocContext> {
    let scope = runtime.get(DESIGN_METHOD_SCOPE);
    if (!scope) {
        scope = new RuntimeHandler<ClassRef, IocContext>((input, context) => {
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
    const type = input.type;
    const injector = context.injector as AbstractInjector;
    const provide = context.provide;
    if (provide && provide !== type) {
        const pType = input.getAnnotation().providedIn;
        if (!context.isMutil && isFunction(pType)) {
            const runtime = injector.getRuntime();
            const prd = { provide, useExisting: type } as Provider;
            runtime.setTypeProvider(pType, prd);
            injector.onDestroy(() => {
                runtime.removeTypeProvider(pType, prd);
            });
        }
    }

    if (input.provides.length) {
        const factory = () => injector.get(type);
        const records = injector.getRecords();
        for (const pdr of input.provides) {
            if (provide != pdr && (context.isMutil ? !records.has(pdr) : true)) {
                records.set(pdr, createRecord(factory, injector.isStatic))
            }
        }
    }
    return next(input, context);
}

export const DESIGN_INTERECPTORS = [
    autorunInterceptor,
    afterAnnoationInterceptor,
    afterMethodAnnoationInterceptor,
    afterPropertyAnnoationInterceptor,
    beforeAnnoactionInterceptor,
    dependencyInterceptor
] as InterceptorLike<ClassRef, InjectorRecord, Context>[];