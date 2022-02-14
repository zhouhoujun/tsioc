import { isFunction } from '../utils/chk';
import { cleanObj } from '../utils/lang';
import { chain } from '../handler';
import { Type } from '../types';
import { Token } from '../tokens';
import { DesignContext, RuntimeContext } from './ctx';
import { ActionSetup } from '../action';
import { IocRegAction, IocRegScope } from './reg';
import { RuntimeLifeScope } from './runtime';
import { FactoryRecord, FnType, Injector, Platform } from '../injector';
import { InvocationContext } from '../operation';
import { Decors } from '../metadata/type';


/**
 * ioc design action.
 * the register type class can only register in ioc as:
 * ` container.registerSingleton(SubDesignRegisterAction, () => new SubDesignRegisterAction(container));`
 */
export abstract class IocDesignAction extends IocRegAction<DesignContext> { }

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
        );
    }
}


export const RegClassAction = function (ctx: DesignContext, next: () => void): void {
    regProvider(ctx.getRecords(), ctx.platform, ctx.injector, ctx.type, ctx.provide || ctx.type, ctx.singleton || ctx.reflect.singleton === true);
    next();
};

function regProvider(records: Map<Token, FactoryRecord>, platform: Platform, injector: Injector, type: Type, provide: Token, singleton: boolean) {
    const recd = {
        type,
        fn: (...fnArgs: any[]) => {
            // make sure has value.
            if (singleton && platform.hasSingleton(type)) {
                return platform.getSingleton(type);
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
                recd.value = instance;
            }
            // clean context
            cleanObj(ctx);
            return instance;
        },
        fnType: FnType.Inj,
        unreg: () => platform.clearTypeProvider(type)
    } as FactoryRecord;
    records.set(provide, recd);
}

export const BeforeAnnoDecorHandle = function (ctx: DesignContext, next: () => void) {
    ctx.reflect.class.classDecors.forEach(d => {
        ctx.currDecor = d.decor;
        chain(d.getDesignHandle(Decors.beforeAnnoation), ctx);
    });

    return next();
}


export const DesignClassDecorHandle = function (ctx: DesignContext, next: () => void) {
    ctx.reflect.class.classDecors.forEach(d => {
        ctx.currDecor = d.decor;
        chain(d.getDesignHandle(Decors.CLASS), ctx);
    });

    return next();
}

export class DesignPropScope extends IocRegScope<DesignContext> implements ActionSetup {
    setup() {
        this.use(
            DesignPropDecorScope
        );
    }
}

export const DesignPropDecorScope = function (ctx: DesignContext, next: () => void) {
    ctx.reflect.class.propDecors.forEach(d => {
        ctx.currDecor = d.decor;
        chain(d.getDesignHandle(Decors.property), ctx);
    });

    return next();
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
        ctx.reflect.class.provides.forEach(provide => {
            if (provide != regpdr && regProvides !== false) {
                injector.inject({ provide, useExisting: regpdr });
            }
        });
    } else {
        ctx.reflect.class.provides.forEach(provide => {
            regProvides !== false && injector.inject({ provide, useClass: type });
        });
    }

    next();
};

export class DesignMthScope extends IocRegScope<DesignContext> implements ActionSetup {
    setup() {
        this.use(
            DesignMthDecorScope
        );
    }
}

export const DesignMthDecorScope = function (ctx: DesignContext, next: () => void) {
    ctx.reflect.class.methodDecors.forEach(d => {
        ctx.currDecor = d.decor;
        chain(d.getDesignHandle(Decors.method), ctx);
    });

    return next();
}


/**
 * method auto run action.
 *
 * @export
 * @class SetPropAction
 * @extends {IocDesignAction}
 */
export const IocAutorunAction = function (ctx: DesignContext, next: () => void) {
    if (ctx.reflect.class.autoruns.length < 1) {
        return next();
    }

    const injector = ctx.injector;
    const instance = injector.get(ctx.provide || ctx.type);
    if (!instance) return;
    ctx.reflect.class.autoruns.forEach(meta => {
        if (meta && meta.autorun) {
            if (isFunction(instance[meta.autorun])) {
                injector.invoke(instance, meta.autorun);
            }
        }
    });
    return next();
};

export class AnnoScope extends IocRegScope<DesignContext> implements ActionSetup {

    setup() {
        this.use(AnnoDecorScope, AfterAnnoDecorScope, IocAutorunAction);
    }
}

export const AnnoDecorScope = function (ctx: DesignContext, next: () => void) {
    ctx.reflect.class.classDecors.forEach(d => {
        ctx.currDecor = d.decor;
        chain(d.getDesignHandle(Decors.annoation), ctx);
    });

    return next();
}

export const AfterAnnoDecorScope = function (ctx: DesignContext, next: () => void) {
    ctx.reflect.class.classDecors.forEach(d => {
        ctx.currDecor = d.decor;
        chain(d.getDesignHandle(Decors.afterAnnoation), ctx);
    });

    return next();
}
