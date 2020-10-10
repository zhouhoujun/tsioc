import { DecoratorScope } from '../types';
import { isFunction, isClass, lang } from '../utils/lang';
import { Provider } from '../tokens';
import { IActionSetup } from '../Action';
import { befAnn, ann, aftAnn, cls, mth, prop } from '../utils/exps';
import {
    IocRegAction, IocRegScope, RegContext, ExecDecoratorAtion,
    DecorsRegisterer, DesignRegisterer, IocDecorScope, DesignContext, RuntimeContext
} from './reg';
import { RuntimeLifeScope } from './runtime';
import { PROVIDERS, REGISTERED } from '../utils/tk';



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
        const design = ctx.injector.getInstance(DesignRegisterer);
        const registerer = design.getRegisterer(scope);
        const decors = ctx.targetReflect.decors;
        return registerer.getDecorators().filter(d => decors.some(de => de.decor === d));
    }

    setup() {
        this.use(DesignDecorAction);
    }

}

export class DesignClassScope extends IocRegScope<DesignContext> implements IActionSetup {

    setup() {
        this.use(AnnoRegInAction)
            .use(BeforeAnnoDecorScope)
            .use(TypeProviderAction)
            .use(RegClassAction)
            .use(DesignClassDecorScope);
    }
}

export const AnnoRegInAction = function (ctx: DesignContext, next: () => void): void {
    const regIn = ctx.targetReflect.regIn;
    const container = ctx.injector.getContainer();
    if (regIn === 'root') {
        ctx.regIn = regIn;
        ctx.injector = container;
    }
    const injector = ctx.injector;
    container.get(REGISTERED).set(ctx.type, { provides: [], getInjector: () => injector });
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

    const registed = injector.getValue(REGISTERED).get(type);
    tgReflect.providers.forEach(anno => {
        let provide = injector.getToken(anno.provide, anno.alias);
        registed.provides.push(provide);
        injector.bindProvider(provide, type);
    });

    tgReflect.refs.forEach(rf => {
        let tk = injector.bindRefProvider(rf.target,
            rf.provide ? rf.provide : type,
            type,
            rf.provide ? rf.alias : '');
        registed.provides.push(tk);
    });

    // class private provider.
    if (tgReflect.extProviders && tgReflect.extProviders.length) {
        let refKey = injector.bindTagProvider(
            type,
            ...tgReflect.extProviders);
        registed.provides.push(refKey);
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
        this.use(AnnoDecorScope)
            .use(AfterAnnoDecorScope)
            .use(IocAutorunAction);
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

