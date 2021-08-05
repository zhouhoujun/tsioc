import { isFunction, isClass, isUndefined } from '../utils/chk';
import { cleanObj } from '../utils/lang';
import { chain } from '../utils/hdl';
import { Type } from '../types';
import { Token } from '../tokens';
import { DesignContext, RuntimeContext } from './ctx';
import { IActionSetup } from '../action';
import { IocRegAction, IocRegScope } from './reg';
import { RuntimeLifeScope } from './runtime';
import { PropertyMetadata } from '../metadata/meta';
import { ROOT_INJECTOR } from '../metadata/tk';
import { Injector, FnRecord } from '../injector';



/**
 * ioc design action.
 * the register type class can only register in ioc as:
 * ` container.registerSingleton(SubDesignRegisterAction, () => new SubDesignRegisterAction(container));`
 */
export abstract class IocDesignAction extends IocRegAction<DesignContext> { }

/**
 * design class handle scope.
 */
export class DesignClassScope extends IocRegScope<DesignContext> implements IActionSetup {

    setup() {
        this.use(
            AnnoRegInAction,
            BeforeAnnoDecorScope,
            TypeProviderAction,
            RegClassAction,
            DesignClassDecorScope
        );
    }
}

export const AnnoRegInAction = function (ctx: DesignContext, next: () => void): void {
    const container = ctx.injector.getContainer();
    if (ctx.reflect.regIn === 'root') {
        ctx.regIn = ctx.reflect.regIn;
        ctx.injector = container.get(ROOT_INJECTOR) ?? container;
    }
    const state = ctx.state = genReged(ctx.injector, ctx.provide);
    container.state().regType(ctx.type, state);
    next();
};

function genReged(injector: Injector, provide?: Token) {
    return {
        provides: provide ? [provide] : [],
        injector
    }
}

function regInstf(injector: Injector, type: Type, provide: Token, singleton: boolean) {
    const insf = {
        type,
        fn: (providers: Injector) => {
            // make sure has value.
            if (singleton && injector.hasValue(type)) {
                return injector.get(type);
            }
            const ctx = {
                injector,
                provide,
                type,
                singleton,
                providers
            } as RuntimeContext;

            injector.action().get(RuntimeLifeScope).register(ctx);
            const instance = ctx.instance;
            // clean context
            cleanObj(ctx);
            return instance;
        },
        fnType: 'inj',
        unreg: () => injector.state().deleteType(type)
    } as FnRecord;

    injector.set(provide, insf);
}


export const RegClassAction = function (ctx: DesignContext, next: () => void): void {
    regInstf(ctx.injector, ctx.type, ctx.provide || ctx.type, ctx.singleton || ctx.reflect.singleton);
    next();
};


export const BeforeAnnoDecorScope = function (ctx: DesignContext, next: () => void) {
    ctx.reflect.class.classDecors.forEach(d => {
        ctx.currDecor = d.decor;
        chain(d.getDesignHandle('beforeAnnoation'), ctx);
    });

    return next();
}


export const DesignClassDecorScope = function (ctx: DesignContext, next: () => void) {
    ctx.reflect.class.classDecors.forEach(d => {
        ctx.currDecor = d.decor;
        chain(d.getDesignHandle('class'), ctx);
    });

    return next();
}




export class DesignPropScope extends IocRegScope<DesignContext> implements IActionSetup {

    setup() {
        this.use(
            PropProviderAction,
            DesignPropDecorScope
        );
    }
}

export const DesignPropDecorScope = function (ctx: DesignContext, next: () => void) {
    ctx.reflect.class.propDecors.forEach(d => {
        ctx.currDecor = d.decor;
        chain(d.getDesignHandle('property'), ctx);
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
    const { injector: injector, type, provide: regpdr, state } = ctx;
    if (regpdr && regpdr !== type) {
        ctx.reflect.provides.forEach(provide => {
            if (provide != regpdr) {
                injector.set({ provide, useExisting: regpdr });
            }
            state.provides.push(provide);
        });
    } else {
        ctx.reflect.provides.forEach(provide => {
            injector.set({ provide, useClass: type });
            state.provides.push(provide);
        });
    }

    // class private provider.
    if (ctx.reflect.providers && ctx.reflect.providers.length) {
        if (state.providers) {
            state.providers.inject(ctx.reflect.providers);
        } else {
            state.providers = Injector.create(ctx.reflect.providers, injector, 'provider');
        }
    }

    next();
};

const typfd = '_isType';
function isDesType(this: PropertyMetadata) {
    if (isUndefined(this[typfd])) {
        this[typfd] = isClass(this.type);
    }
    return this[typfd];
}

const pdrfd = '_isPdrType';
function isPdrType(this: PropertyMetadata) {
    if (isUndefined(this[pdrfd])) {
        this[pdrfd] = isClass(this.provider);
    }
    return this[pdrfd];
}

/**
 * register bind property provider action. to get the property autowride token of Type calss.
 *
 * @export
 */
export const PropProviderAction = function (ctx: DesignContext, next: () => void) {
    ctx.reflect.propProviders.forEach((propMetas, name) => {
        propMetas.forEach(prop => {
            Object.defineProperties(prop, {
                isType: {
                    get: isDesType,
                    enumerable: false
                },
                isProviderType: {
                    get: isPdrType,
                    enumerable: false
                }
            });
        });
    });

    next();
};

export class DesignMthScope extends IocRegScope<DesignContext> implements IActionSetup {
    setup() {
        this.use(
            RegMethodParamsType,
            DesignMthDecorScope
        );
    }
}

export const RegMethodParamsType = function (ctx: DesignContext, next: () => void) {
    ctx.reflect.methodParams.forEach(pms => {
        pms.forEach(pm => {
            Object.defineProperties(pm, {
                isType: {
                    get: isDesType,
                    enumerable: false
                },
                isProviderType: {
                    get: isPdrType,
                    enumerable: false
                }
            });
        });
    });
    return next();
}


export const DesignMthDecorScope = function (ctx: DesignContext, next: () => void) {
    ctx.reflect.class.methodDecors.forEach(d => {
        ctx.currDecor = d.decor;
        chain(d.getDesignHandle('method'), ctx);
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
    if (ctx.reflect.autoruns.length < 1) {
        return next();
    }

    const injector = ctx.injector;
    const instance = injector.get(ctx.provide || ctx.type);
    if (!instance) return;
    ctx.reflect.autoruns.forEach(meta => {
        if (meta && meta.autorun) {
            if (isFunction(instance[meta.autorun])) {
                injector.invoke(instance, meta.autorun);
            }
        }
    });
    return next();
};

export class AnnoScope extends IocRegScope<DesignContext> implements IActionSetup {

    setup() {
        this.use(AnnoDecorScope, AfterAnnoDecorScope, IocAutorunAction);
    }
}


export const AnnoDecorScope = function (ctx: DesignContext, next: () => void) {
    ctx.reflect.class.classDecors.forEach(d => {
        ctx.currDecor = d.decor;
        chain(d.getDesignHandle('annoation'), ctx);
    });

    return next();
}

export const AfterAnnoDecorScope = function (ctx: DesignContext, next: () => void) {
    ctx.reflect.class.classDecors.forEach(d => {
        ctx.currDecor = d.decor;
        chain(d.getDesignHandle('afterAnnoation'), ctx);
    });

    return next();
}


