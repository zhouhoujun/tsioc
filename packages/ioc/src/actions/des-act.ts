import { isFunction, isClass } from '../utils/chk';
import { cleanObj } from '../utils/lang';
import { chain } from '../utils/hdl';
import { getTokenKey, InjectReference, ProviderType, SymbolType, Token } from '../tokens';
import { DesignContext, RuntimeContext } from './ctx';
import { IActionSetup } from '../action';
import { IocRegAction, IocRegScope } from './reg';
import { RuntimeLifeScope } from './runtime';
import { PROVIDERS } from '../utils/tk';
import { IInjector } from '../IInjector';
import { Type } from '../types';
import { IActionProvider } from './act';
import { getProvider } from '../injector';



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
    const state = ctx.state = genReged(ctx.injector, getTokenKey(ctx.token));
    container.regedState.regType(ctx.type, state);
    next();
};

function genReged(injector: IInjector, provide?: SymbolType) {
    return {
        provides: provide ? [provide] : [],
        getInjector: () => injector
    }
}

function getfac(actionPdr: IActionProvider, injector: IInjector, type: Type, token: Token, singleton) {
    return (...providers: ProviderType[]) => {
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
    }
}

export const RegClassAction = function (ctx: DesignContext, next: () => void): void {
    const injector = ctx.injector;
    const provide = getTokenKey(ctx.token);
    const type = ctx.type;
    const singleton = ctx.singleton || ctx.reflect.singleton;
    const { provider, regedState } = injector.getContainer();

    const fac = getfac(provider, injector, type, provide, singleton);
    const state = ctx.state;
    const unreg = () => {
        state.provides?.forEach(k => injector.unregister(k));
        regedState.deleteType(type);
    };

    injector.set(type, { fac, unreg }, true);
    injector.onDestroy(() => injector.unregister(type));
    if (provide && provide !== type) {
        injector.set(provide, fac, type);
        injector.onDestroy(() => injector.unregister(provide));
    }
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
        this.use(PropProviderAction, DesignPropDecorScope);
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
    const injector = ctx.injector;
    const type = ctx.type;
    const state = ctx.state;
    ctx.reflect.providers.forEach(anno => {
        injector.bindProvider(getTokenKey(anno.provide, anno.alias), type, state);
    });

    ctx.reflect.refs.forEach(rf => {
        injector.bindProvider(new InjectReference(
            getTokenKey(
                rf.provide ? rf.provide : type,
                rf.provide ? rf.alias : ''), rf.target), type, state);
    });

    // class private provider.
    if (ctx.reflect.extProviders && ctx.reflect.extProviders.length) {
        const refToken = getTokenKey(new InjectReference(PROVIDERS, type));
        if (injector.has(refToken)) {
            injector.get(refToken).inject(...ctx.reflect.extProviders);
        } else {
            injector.setValue(refToken, injector.getContainer().getInstance(PROVIDERS).inject(...ctx.reflect.extProviders));
        }
        state.provides.push(refToken);
    }

    next();
};

/**
 * register bind property provider action. to get the property autowride token of Type calss.
 *
 * @export
 */
export const PropProviderAction = function (ctx: DesignContext, next: () => void) {
    const injector = ctx.injector;
    ctx.reflect.propProviders.forEach((propMetas, name) => {
        propMetas.forEach(prop => {
            if (isClass(prop.provider)) {
                injector.registerType(prop.provider);
            } else if (isClass(prop.type)) {
                injector.registerType(prop.type);
            }
        });
    });

    next();
};

export class DesignMthScope extends IocRegScope<DesignContext> implements IActionSetup {
    setup() {
        this.use(RegMethodParamsType, DesignMthDecorScope);
    }
}

export const RegMethodParamsType = function (ctx: DesignContext, next: () => void) {
    const injector = ctx.injector;
    ctx.reflect.methodParams.forEach(pms => {
        pms.forEach(pm => {
            if (isClass(pm.provider)) {
                injector.registerType(pm.provider);
            } else if (isClass(pm.type)) {
                injector.registerType(pm.type);
            }
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
    const injector = ctx.injector;
    const autoruns = ctx.reflect.autoruns;
    if (autoruns.length < 1) {
        return next();
    }

    let instance = injector.get(ctx.token || ctx.type);
    autoruns.forEach(meta => {
        if (meta && meta.autorun) {
            if (instance && isFunction(instance[meta.autorun])) {
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


