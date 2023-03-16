import { Type } from '../types';
import { Token } from '../tokens';
import { runChain } from '../handler';
import { ActionSetup } from '../action';
import { cleanObj } from '../utils/lang';
import { FactoryRecord, FnType, Injector } from '../injector';
import { InvocationContext } from '../context';
import { Decors } from '../metadata/type';
import { ReflectiveFactory } from '../reflective';
import { Platform } from '../platform';
import { IocRegScope } from './reg';
import { RuntimeLifeScope } from './runtime';
import { DesignContext, RuntimeContext } from './ctx';


/**
 * design class handle scope.
 */
export class DesignClassScope extends IocRegScope<DesignContext> implements ActionSetup {
    setup() {
        this.use(
            BeforeAnnoDecorHandle,
            TypeProviderAction,
            RegClassAction,
            DesignClassDecorHandle
        )
    }
}


export const RegClassAction = function (ctx: DesignContext, next: () => void): void {
    regProvider(ctx.getRecords(), ctx.platform, ctx.injector, ctx.type, ctx.provide || ctx.type, ctx.singleton || ctx.class.getAnnotation().singleton === true, ctx.class.getAnnotation().static);
    next()
};

function regProvider(records: Map<Token, FactoryRecord>, platform: Platform, injector: Injector, type: Type, provide: Token, singleton: boolean, isStatic?: boolean) {
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

            platform.getAction(RuntimeLifeScope).register(ctx);
            const instance = ctx.instance;
            if (singleton) {
                recd.value = instance
            }
            // clean context
            cleanObj(ctx);
            return instance
        },
        stic: isStatic,
        fy: FnType.Inj,
        unreg: () => platform.clearTypeProvider(type)
    } as FactoryRecord;
    records.set(provide, recd)
}

export const BeforeAnnoDecorHandle = function (ctx: DesignContext, next: () => void) {
    ctx.class.classDecors.forEach(decor => {
        ctx.currDecor = decor;
        decor.getDesignHandle && runChain(decor.getDesignHandle(Decors.beforeAnnoation), ctx)
    });

    return next()
}


export const DesignClassDecorHandle = function (ctx: DesignContext, next: () => void) {
    ctx.class.classDecors.forEach(d => {
        ctx.currDecor = d;
        d.getDesignHandle && runChain(d.getDesignHandle(Decors.CLASS), ctx)
    });

    return next()
}

export class DesignPropScope extends IocRegScope<DesignContext> implements ActionSetup {
    setup() {
        this.use(
            DesignPropDecorScope
        )
    }
}

export const DesignPropDecorScope = function (ctx: DesignContext, next: () => void) {
    ctx.class.propDecors.forEach(d => {
        ctx.currDecor = d;
        d.getDesignHandle && runChain(d.getDesignHandle(Decors.property), ctx)
    });

    return next()
}



/**
 * register bind type class provider action. for binding a factory to an token.
 *
 * @export
 * @class BindProviderAction
 * @extends {ActionComposite}
 */
export const TypeProviderAction = function (ctx: DesignContext, next: () => void) {
    const { injector: injector, type, provide: regpdr, regProvides } = ctx;
    if (regpdr && regpdr !== type) {
        ctx.class.provides.forEach(provide => {
            if (provide != regpdr && regProvides !== false) {
                injector.inject({ provide, useExisting: regpdr })
            }
        })
    } else {
        ctx.class.provides.forEach(provide => {
            regProvides !== false && injector.inject({ provide, useClass: type })
        })
    }

    next()
};

export class DesignMthScope extends IocRegScope<DesignContext> implements ActionSetup {
    setup() {
        this.use(
            DesignMthDecorScope
        )
    }
}

export const DesignMthDecorScope = function (ctx: DesignContext, next: () => void) {
    ctx.class.methodDecors.forEach(decor => {
        ctx.currDecor = decor;
        decor.getDesignHandle && runChain(decor.getDesignHandle(Decors.method), ctx)
    });

    return next()
}

/**
 * Annoaction
 */
export class AnnoScope extends IocRegScope<DesignContext> implements ActionSetup {

    setup() {
        this.use(AnnoDecorScope, AfterAnnoDecorScope, IocAutorunAction)
    }
}

export const AnnoDecorScope = function (ctx: DesignContext, next: () => void) {
    ctx.class.classDecors.forEach(decor => {
        ctx.currDecor = decor;
        decor.getDesignHandle && runChain(decor.getDesignHandle(Decors.annoation), ctx)
    });

    return next()
}

export const AfterAnnoDecorScope = function (ctx: DesignContext, next: () => void) {
    ctx.class.classDecors.forEach(decor => {
        ctx.currDecor = decor;
        decor.getDesignHandle && runChain(decor.getDesignHandle(Decors.afterAnnoation), ctx)
    });

    return next()
}

/**
 * method auto run action.
 *
 * @export
 * @class SetPropAction
 * @extends {IocDesignAction}
 */
export const IocAutorunAction = function (ctx: DesignContext, next: () => void) {
    const runs = ctx.class.runnables.filter(c => c.auto && c.decorType === Decors.CLASS);
    if (runs.length < 1) {
        return next()
    }

    const injector = ctx.injector;
    const instance = injector.get(ctx.provide || ctx.type);
    if (!instance) return;
    const factory = injector.get(ReflectiveFactory).create(ctx.class, injector);
    runs.forEach(meta => {
        factory.invoke(meta.method, undefined, instance);
    });
    return next()
};
