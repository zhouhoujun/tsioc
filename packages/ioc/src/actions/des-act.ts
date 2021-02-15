import { isFunction, isClass, isUndefined } from '../utils/chk';
import { cleanObj } from '../utils/lang';
import { chain } from '../utils/hdl';
import { PROVIDERS } from '../utils/tk';
import { Type } from '../types';
import { InstFac, ProviderType, Token, tokenRef } from '../tokens';
import { DesignContext, RuntimeContext } from './ctx';
import { IActionSetup } from '../action';
import { IocRegAction, IocRegScope } from './reg';
import { RuntimeLifeScope } from './runtime';
import { IInjector } from '../IInjector';
import { RegisteredState } from '../IContainer';
import { IActionProvider } from './act';
import { getProvider } from '../injector';
import { Registered } from '../decor/type';
import { PropertyMetadata } from '../decor/metadatas';



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
        ctx.injector = container;
    }
    const state = ctx.state = genReged(ctx.injector, ctx.token);
    container.regedState.regType(ctx.type, state);
    next();
};

function genReged(injector: IInjector, provide?: Token) {
    return {
        provides: provide ? [provide] : [],
        getInjector: () => injector
    }
}

function regInstf(actionPdr: IActionProvider, regedState: RegisteredState, injector: IInjector, reged: Registered, type: Type, token: Token, singleton: boolean): InstFac {
    const insf = {
        fac: (...providers: ProviderType[]) => {
            // make sure has value.
            if (singleton && injector.hasValue(type)) {
                return injector.getValue(type);
            }

            const ctx = {
                injector,
                token,
                type,
                singleton,
                providers: getProvider(injector, ...providers)
            } as RuntimeContext;
            actionPdr.getInstance(RuntimeLifeScope).register(ctx);
            const instance = ctx.instance;
            // clean context
            cleanObj(ctx);
            return instance;
        },
        unreg: () => {
            reged.provides?.forEach(k => injector.unregister(k));
            regedState.deleteType(type);
        }
    };

    injector.set(type, insf, true);
    injector.onDestroy(() => injector.unregister(type));
    if (token && token !== type) {
        injector.set(token, insf.fac, type);
        injector.onDestroy(() => injector.unregister(token));
    }

    return insf;
}


export const RegClassAction = function (ctx: DesignContext, next: () => void): void {
    const { provider, regedState } = ctx.injector.getContainer();
    regInstf(provider, regedState, ctx.injector, ctx.state, ctx.type, ctx.token, ctx.singleton || ctx.reflect.singleton);
    next();
};


export const BeforeAnnoDecorScope = function (ctx: DesignContext, next: () => void) {
    ctx.reflect.class.classDecors.forEach(d => {
        ctx.currDecor = d.decor;
        chain(d.decorPdr.getDesignHandle('beforeAnnoation'), ctx);
    });

    return next();
}


export const DesignClassDecorScope = function (ctx: DesignContext, next: () => void) {
    ctx.reflect.class.classDecors.forEach(d => {
        ctx.currDecor = d.decor;
        chain(d.decorPdr.getDesignHandle('class'), ctx);
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
    ctx.reflect.class.propDecors
        .forEach(d => {
            ctx.currDecor = d.decor;
            chain(d.decorPdr.getDesignHandle('property'), ctx);
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
    const { injector, type, state } = ctx;
    ctx.reflect.providers.forEach(anno => {
        injector.bindProvider(anno.provide, type, state);
    });

    ctx.reflect.refs.forEach(rf => {
        injector.bindProvider(tokenRef(rf.provide ?? type, rf.target), type, state);
    });

    // class private provider.
    if (ctx.reflect.extProviders && ctx.reflect.extProviders.length) {
        const refToken = tokenRef(PROVIDERS, type);
        if (injector.has(refToken)) {
            injector.get(refToken).inject(...ctx.reflect.extProviders);
        } else {
            injector.setValue(refToken, injector.getContainer().getInstance(PROVIDERS).inject(...ctx.reflect.extProviders));
        }
        state.provides.push(refToken);
    }

    next();
};

const typfd = '_isType';
function isDesignType(this: PropertyMetadata) {
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
    // const injector = ctx.injector;
    ctx.reflect.propProviders.forEach((propMetas, name) => {
        propMetas.forEach(prop => {
            Object.defineProperties(prop, {
                isType: {
                    get: isDesignType,
                    enumerable: false
                },
                isProviderType: {
                    get: isPdrType,
                    enumerable: false
                }
            });
            // if (isClass(prop.provider)) {
            // injector.registerType(prop.provider);
            // } else if (!prop.provider && isClass(prop.type)) {
            // injector.registerType(prop.type);
            // }
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
    // const injector = ctx.injector;
    ctx.reflect.methodParams.forEach(pms => {
        pms.forEach(pm => {
            Object.defineProperties(pm, {
                isType: {
                    get: isDesignType,
                    enumerable: false
                },
                isProviderType: {
                    get: isPdrType,
                    enumerable: false
                }
            });
            // if (isClass(pm.provider)) {
            // injector.registerType(pm.provider);
            // } else if (!pm.provider && isClass(pm.type)) {
            // injector.registerType(pm.type);
            // }
        });
    });
    return next();
}


export const DesignMthDecorScope = function (ctx: DesignContext, next: () => void) {
    ctx.reflect.class.methodDecors.forEach(d => {
        ctx.currDecor = d.decor;
        chain(d.decorPdr.getDesignHandle('method'), ctx);
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
    const instance = injector.get(ctx.token || ctx.type);
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
        chain(d.decorPdr.getDesignHandle('annoation'), ctx);
    });

    return next();
}

export const AfterAnnoDecorScope = function (ctx: DesignContext, next: () => void) {
    ctx.reflect.class.classDecors.forEach(d => {
        ctx.currDecor = d.decor;
        chain(d.decorPdr.getDesignHandle('afterAnnoation'), ctx);
    });

    return next();
}


