import { IocDecorScope } from './IocDecorScope';
import { INJECTOR } from '../IInjector';
import { DecoratorScope } from '../types';
import { IActionSetup } from './Action';
import { befAnn, ann, aftAnn, cls, mth, prop } from '../utils/exps';
import { ExecDecoratorAtion } from './ExecDecoratorAtion';
import { DecorsRegisterer, DesignRegisterer } from './DecorsRegisterer';
import { IocRegScope } from './IocRegScope';
import { Autorun } from '../decorators/AutoRun';
import { IocExt } from '../decorators/IocExt';
import { CTX_CURR_DECOR, CTX_TYPE_REGIN } from '../context-tokens';
import { AutorunMetadata } from '../metadatas/AutorunMetadata';
import { isFunction, isArray, isClass } from '../utils/lang';
import { InjectableMetadata } from '../metadatas/InjectableMetadata';
import { MethodMetadata } from '../metadatas/MethodMetadata';
import { PropertyMetadata } from '../metadatas/PropertyMetadata';
import { Injectable } from '../decorators/Injectable';
import { Singleton } from '../decorators/Singleton';
import { Providers } from '../decorators/Providers';
import { Refs } from '../decorators/Refs';
import { ParamProviders } from '../providers/types';
import { RuntimeContext } from './RuntimeContext';
import { RuntimeLifeScope } from './RuntimeLifeScope';
import { AutoWired } from '../decorators/AutoWried';
import { Inject } from '../decorators/Inject';
import { IocRegAction } from './IocRegAction';
import { DesignContext } from './DesignContext';

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
                return ctx.targetReflect.decorators.design.beforeAnnoDecors
            case ann:
            case aftAnn:
            case cls:
                return ctx.targetReflect.decorators.design.classDecors;
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
        ctx.setValue(CTX_TYPE_REGIN, regIn);
        ctx.setValue(INJECTOR, ctx.getContainer());
    }
    next();
};


export const RegClassAction = function (ctx: DesignContext, next: () => void): void {
    let injector = ctx.injector;
    let provide = injector.getTokenKey(ctx.token);
    let type = ctx.type;
    let singleton = ctx.targetReflect.singleton;
    let actInjector = ctx.reflects.getActionInjector();
    let factory = (...providers: ParamProviders[]) => {
        let ctx = RuntimeContext.parse(injector, {
            token: provide,
            type: type,
            singleton: singleton,
            providers: providers
        });
        actInjector.getInstance(RuntimeLifeScope).register(ctx);
        return ctx.target;
    };

    if (provide && provide !== type) {
        injector.set(provide, factory, type);
    } else {
        injector.set(type, factory);
    }

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
    let currDecor = ctx.getValue(CTX_CURR_DECOR);
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
        let propMetas = refs.getPropertyMetadata<PropertyMetadata>(ctx.getValue(CTX_CURR_DECOR), ty);
        Object.keys(propMetas).forEach(key => {
            let props = propMetas[key];
            props.forEach(prop => {
                if (isClass(prop.provider) && !injector.hasRegister(prop.provider)) {
                    injector.registerType(prop.provider);
                }
                if (isClass(prop.type) && !injector.hasRegister(prop.type)) {
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
    let refs = ctx.reflects;
    let targetReflect = ctx.targetReflect;
    targetReflect.defines.extendTypes.forEach(ty => {
        let metas = refs.getMethodMetadata<MethodMetadata>(ctx.getValue(CTX_CURR_DECOR), ty);
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
            if (targetReflect.methodParamProviders.has(propertyKey)) {
                targetReflect.methodParamProviders.get(propertyKey).push(...providers);
            } else {
                targetReflect.methodParamProviders.set(propertyKey, providers);
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
    let refs = ctx.reflects;
    let currDec = ctx.getValue(CTX_CURR_DECOR);
    if (!refs.hasMetadata(currDec, ctx.type)) {
        return;
    }
    let injector = ctx.injector;
    let metadatas = refs.getMetadata<AutorunMetadata>(currDec, ctx.type);
    metadatas.forEach(meta => {
        if (meta && meta.autorun) {
            let instance = injector.get(ctx.token || ctx.type);
            if (instance && isFunction(instance[meta.autorun])) {
                injector.invoke(instance, meta.autorun);
            }
        }
    });
    next();
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

