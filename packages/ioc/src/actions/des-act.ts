import { DecoratorScope } from '../types';
import { isFunction, isArray, isClass, lang } from '../utils/lang';
import { Provider } from '../tokens';
import { IActionSetup } from '../Action';
import { befAnn, ann, aftAnn, cls, mth, prop } from '../utils/exps';
import { Injectable, Singleton, AutoWired, Inject, Providers, Refs, Autorun, IocExt } from '../decor/decorators';
import { MethodMetadata, InjectableMetadata, PropertyMetadata, AutorunMetadata } from '../decor/metadatas';

import {
    IocRegAction, IocRegScope, RegContext, ExecDecoratorAtion,
    DecorsRegisterer, DesignRegisterer, IocDecorScope
} from './reg';
import { RuntimeLifeScope } from './runtime';
import { PROVIDERS, REGISTERED } from '../utils/tk';
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
        const register = ctx.injector.getInstance(DecorsRegisterer);
        const registerer = register.getRegisterer(scope);
        const decors = ctx.targetReflect.decors;
        return registerer.getDecorators().filter(d => decors.some(de => de.decor === d));
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
    const regIn = ctx.targetReflect.regIn;
    if (regIn === 'root') {
        ctx.regIn = regIn;
        ctx.injector = ctx.injector.getContainer();
    }
    next();
};


export const RegClassAction = function (ctx: DesignContext, next: () => void): void {
    let injector = ctx.injector;
    let provide = injector.getTokenKey(ctx.token);
    let type = ctx.type;
    let singleton = ctx.singleton || ctx.targetReflect.singleton;
    const container = injector.getContainer();
    const actInjector = container.getActionInjector();
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
        actInjector.getInstance(RuntimeLifeScope).register(ctx);
        if (singleton) {
            container.setValue(type, ctx.instance);
        }
        const instance = ctx.instance;
        // clean context
        lang.cleanObj(ctx);
        return instance;
    };

    if (provide && provide !== type) {
        injector.set(provide, factory, type);
    } else {
        injector.set(type, factory);
    }

    container.get(REGISTERED).set(type, () => injector);

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
        this.use(PropProviderAction)
            .use(DesignPropDecorScope);
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
    const tgReflect = ctx.targetReflect;
    const injector = ctx.injector;
    const type = tgReflect.type;


    tgReflect.providers.forEach(anno => {
        let provide = injector.getToken(anno.provide, anno.alias);
        injector.bindProvider(provide, type);
    });

    tgReflect.refs.forEach(rf => {
        let tk = injector.bindRefProvider(rf.target,
            rf.provide ? rf.provide : type,
            type,
            rf.provide ? rf.alias : '');
    });

    // class private provider.
    if (tgReflect.extProviders && tgReflect.extProviders.length) {
        let refKey = injector.bindTagProvider(
            type,
            ...tgReflect.extProviders);
    }


    next();
};

/**
 * register bind property provider action. to get the property autowride token of Type calss.
 *
 * @export
 */
export const PropProviderAction = function (ctx: DesignContext, next: () => void) {
    let injector = ctx.injector;
    let targetReflect = ctx.targetReflect;
    targetReflect.propProviders.forEach((propMetas, name) => {
        propMetas.forEach(prop => {
            if (isClass(prop.provider) && !injector.hasRegister(prop.provider)) {
                injector.registerType(prop.provider);
            }
            if (isClass(prop.type) && !injector.hasRegister(prop.type)) {
                injector.registerType(prop.type);
            }
        });
    });


    next();
};

export class DesignMthScope extends IocRegScope<DesignContext> implements IActionSetup {
    setup() {
        this.use(DesignMthDecorScope);
    }
}


export class DesignMthDecorScope extends DesignDecorScope {
    protected getDecorScope(): DecoratorScope {
        return mth;
    }
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
    const autoruns = ctx.targetReflect.autoruns;
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

