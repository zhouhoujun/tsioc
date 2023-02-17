import { DecoratorScope } from '../types';
import { isFunction, isArray, isClass, lang } from '../utils/lang';
import { Provider } from '../tokens';
import { IActionSetup } from './Action';
import { befAnn, ann, aftAnn, cls, mth, prop } from '../utils/exps';
import { Injectable, Singleton, AutoWired, Inject, Providers, Refs, Autorun, IocExt } from '../decor/decorators';
import { MethodMetadata, InjectableMetadata, PropertyMetadata, AutorunMetadata } from '../decor/metadatas';

import {
    IocRegAction, IocRegScope, RegContext, ExecDecoratorAtion,
    DecorsRegisterer, DesignRegisterer, IocDecorScope
} from './reg';
import { RuntimeLifeScope } from './runtime';
import { PROVIDERS } from '../utils/tk';
import { RuntimeContext } from './run-act';

/**
 * design action context.
 */
export interface DesignContext extends RegContext {
    /**
     * type register in.
     */
    regIn?: string;
}


/**
 * ioc design action.
 * the register type class can only register in ioc as:
 * ` container.registerSingleton(SubDesignRegisterAction, () => new SubDesignRegisterAction(container));`
 */
export abstract class IocDesignAction extends IocRegAction<DesignContext> {

}

export class DesignDecorAction extends ExecDecoratorAtion {
    protected getScopeRegisterer(): DecorsRegisterer {
        return this.actInjector.getInstance(DesignRegisterer);
    }
}

export abstract class DesignDecorScope extends IocDecorScope<DesignContext> implements IActionSetup {

    protected getScopeDecorators(ctx: DesignContext, scope: DecoratorScope): string[] {
        switch (scope) {
            case befAnn:
                return ctx.targetReflect.decorators.design.beforeAnnoDecors;
            case cls:
                return ctx.targetReflect.decorators.design.classDecors;
            case ann:
                return ctx.targetReflect.decorators.design.annoDecors;
            case aftAnn:
                return ctx.targetReflect.decorators.design.afterAnnoDecors;
            case mth:
                return ctx.targetReflect.decorators.design.methodDecors;
            case prop:
                return ctx.targetReflect.decorators.design.propsDecors;
        }
        return ctx.targetReflect.decorators.design.getDecortors(scope);
    }

    setup() {
        this.use(DesignDecorAction);
    }

}

export class DesignClassScope extends IocRegScope<DesignContext> implements IActionSetup {

    setup() {
        this.actInjector.getInstance(DesignRegisterer)
            .register(Injectable, cls, TypeProviderAction)
            .register(Singleton, cls, TypeProviderAction)
            .register(Providers, cls, TypeProviderAction)
            .register(Refs, cls, TypeProviderAction);

        this.use(AnnoRegInAction)
            .use(BeforeAnnoDecorScope)
            .use(RegClassAction)
            .use(DesignClassDecorScope);
    }
}

export const AnnoRegInAction = function (ctx: DesignContext, next: () => void): void {
    let regIn: string;
    let reflects = ctx.reflects;
    ctx.targetReflect.decorators.classDecors.some(d => {
        if (reflects.hasMetadata(d, ctx.type)) {
            let meta = reflects.getMetadata<InjectableMetadata>(d, ctx.type).find(m => m.regIn);
            if (meta) {
                regIn = meta.regIn;
            }
        }
        return regIn;
    });
    if (regIn === 'root') {
        ctx.regIn = regIn;
        ctx.injector = ctx.injector.getContainer();
    }
    next();
};

function getTarget(this: RuntimeContext) {
    return this.instance;
}

export const RegClassAction = function (ctx: DesignContext, next: () => void): void {
    let injector = ctx.injector;
    let provide = injector.getTokenKey(ctx.token);
    let type = ctx.type;
    let singleton = ctx.targetReflect.singleton;
    let actInjector = ctx.reflects.getActionInjector();
    const container = injector.getContainer();
    let factory = (...providers: Provider[]) => {
        if (singleton && container.hasValue(type)) {
            return container.getValue(type);
        }
        const ctx = {
            injector,
            token: provide,
            type,
            singleton,
            providers: injector.get(PROVIDERS).inject(...providers)
        } as RuntimeContext;
        Object.defineProperty(ctx, 'target', {
            get: getTarget,
            enumerable: false
        });
        actInjector.getInstance(RuntimeLifeScope).register(ctx);
        if (singleton) {
            container.setValue(type, ctx.instance);
        }
        const instance = ctx.instance;
        // clean context
        lang.cleanObj(ctx);
        return instance;
    };

    if (provide) {
        injector.set(provide, factory, type);
    }
    injector.set(type, factory);


    ctx.targetReflect.getInjector = () => injector;

    next();
};


export class BeforeAnnoDecorScope extends DesignDecorScope {
    protected getDecorScope(): DecoratorScope {
        return befAnn;
    }
}

export class DesignClassDecorScope extends DesignDecorScope {
    protected getDecorScope(): DecoratorScope {
        return cls;
    }
}



export class DesignPropScope extends IocRegScope<DesignContext> implements IActionSetup {

    setup() {

        this.actInjector.getInstance(DesignRegisterer)
            .register(Inject, prop, PropProviderAction)
            .register(AutoWired, prop, PropProviderAction);

        this.use(DesignPropDecorScope);
    }
}


export class DesignPropDecorScope extends DesignDecorScope {
    protected getDecorScope(): DecoratorScope {
        return prop;
    }
}


/**
 * register bind type class provider action. for binding a factory to an token.
 *
 * @export
 * @class BindProviderAction
 * @extends {ActionComposite}
 */
export const TypeProviderAction = function (ctx: DesignContext, next: () => void) {
    let tgReflect = ctx.targetReflect;
    let injector = ctx.injector;
    let currDecor = ctx.currDecor;
    if (!tgReflect.decorator) {
        tgReflect.decorator = currDecor;
    }
    let targetType = ctx.type;
    let metadatas = ctx.reflects.getMetadata<InjectableMetadata>(currDecor, targetType);
    metadatas.forEach(anno => {
        // bind all provider.
        if (!anno) {
            return;
        }
        if (!tgReflect.singleton) {
            if (anno.singleton) {
                tgReflect.singleton = anno.singleton;
            }
            if (anno.expires) {
                tgReflect.expires = anno.expires;
            }
        }
        if (anno.provide) {
            let provide = injector.getToken(anno.provide, anno.alias);
            tgReflect.provides.push(provide);
            injector.bindProvider(provide, anno.type);
        }
        if (anno.refs && anno.refs.target) {
            let tk = injector.bindRefProvider(anno.refs.target,
                anno.refs.provide ? anno.refs.provide : anno.type,
                anno.type,
                anno.refs.provide ? anno.refs.alias : '');
            tgReflect.provides.push(tk);
        }
        // class private provider.
        if (anno.providers && anno.providers.length) {
            let refKey = injector.bindTagProvider(
                anno.type,
                ...anno.providers);
            tgReflect.provides.push(refKey);
        }
    });

    next();
};

/**
 * register bind property provider action. to get the property autowride token of Type calss.
 *
 * @export
 */
export const PropProviderAction = function (ctx: DesignContext, next: () => void) {
    let refs = ctx.reflects;
    let injector = ctx.injector;
    let targetReflect = ctx.targetReflect;
    targetReflect.defines.extendTypes.forEach(ty => {
        let propMetas = refs.getPropertyMetadata<PropertyMetadata>(ctx.currDecor, ty);
        Object.keys(propMetas).forEach(key => {
            let props = propMetas[key];
            props.forEach(prop => {
                if (isClass(prop.provider)) {
                    injector.registerType(prop.provider);
                } else if (isClass(prop.type)) {
                    injector.registerType(prop.type);
                }

                if (!targetReflect.propProviders.has(key)) {
                    targetReflect.propProviders.set(key, injector.getToken(prop.provider || prop.type, prop.alias));
                }
            });
        });
    });
    next();
};

export class DesignMthScope extends IocRegScope<DesignContext> implements IActionSetup {
    setup() {

        this.actInjector.getInstance(DesignRegisterer)
            .register(AutoWired, mth, MthProviderAction)
            .register(Providers, mth, MthProviderAction);

        this.use(DesignMthDecorScope);
    }
}


export class DesignMthDecorScope extends DesignDecorScope {
    protected getDecorScope(): DecoratorScope {
        return mth;
    }
}


/**
 * bind method provider action.
 *
 * @export
 */
export const MthProviderAction = function (ctx: DesignContext, next: () => void) {
    ctx.targetReflect.defines.extendTypes.forEach(ty => {
        let metas = ctx.reflects.getMethodMetadata<MethodMetadata>(ctx.currDecor, ty);
        Object.keys(metas).forEach(propertyKey => {
            let metadatas = metas[propertyKey];
            let providers = [];
            if (metadatas && isArray(metadatas) && metadatas.length > 0) {
                metadatas.forEach(meta => {
                    if (meta.providers && meta.providers.length > 0) {
                        providers = providers.concat(meta.providers);
                    }
                });
            }
            if (ctx.targetReflect.methodParamProviders.has(propertyKey)) {
                ctx.targetReflect.methodParamProviders.get(propertyKey).push(...providers);
            } else {
                ctx.targetReflect.methodParamProviders.set(propertyKey, providers);
            }
        });
    });

    next();
};


/**
 * method auto run action.
 *
 * @export
 * @class SetPropAction
 * @extends {IocDesignAction}
 */
export const IocAutorunAction = function (ctx: DesignContext, next: () => void) {
    if (!ctx.reflects.hasMetadata(ctx.currDecor, ctx.type)) {
        return next();
    }
    let injector = ctx.injector;
    let metadatas = ctx.reflects.getMetadata<AutorunMetadata>(ctx.currDecor, ctx.type);
    metadatas.forEach(meta => {
        if (meta && meta.autorun) {
            let instance = injector.get(ctx.token || ctx.type);
            if (instance && isFunction(instance[meta.autorun])) {
                injector.invoke(instance, meta.autorun);
            }
        }
    });
    return next();
};

export class AnnoScope extends IocRegScope<DesignContext> implements IActionSetup {

    setup() {
        this.actInjector.getInstance(DesignRegisterer)
            .register(Autorun, aftAnn, IocAutorunAction)
            .register(IocExt, aftAnn, IocAutorunAction);

        this.use(AnnoDecorScope)
            .use(AfterAnnoDecorScope);
    }
}


export class AnnoDecorScope extends DesignDecorScope {
    protected getDecorScope(): DecoratorScope {
        return ann;
    }
}

export class AfterAnnoDecorScope extends DesignDecorScope {
    protected getDecorScope(): DecoratorScope {
        return aftAnn;
    }
}

