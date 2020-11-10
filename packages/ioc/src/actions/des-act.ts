import { isFunction, isClass, lang, chain } from '../utils/lang';
import { Provider } from '../tokens';
import { DesignContext, RuntimeContext } from './ctx';
import { IActionSetup } from '../action';
import { IocRegAction, IocRegScope } from './reg';
import { RuntimeLifeScope } from './runtime';
import { PROVIDERS } from '../utils/tk';



/**
 * ioc design action.
 * the register type class can only register in ioc as:
 * ` container.registerSingleton(SubDesignRegisterAction, () => new SubDesignRegisterAction(container));`
 */
export abstract class IocDesignAction extends IocRegAction<DesignContext> { }


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
    const regIn = ctx.reflect.regIn;
    const container = ctx.injector.getContainer();
    if (regIn === 'root') {
        ctx.regIn = regIn;
        ctx.injector = container;
    }
    const injector = ctx.injector;
    container.regedState.regType(ctx.type, { provides: [], getInjector: () => injector });
    next();
};


export const RegClassAction = function (ctx: DesignContext, next: () => void): void {
    let injector = ctx.injector;
    let provide = injector.getTokenKey(ctx.token);
    let type = ctx.type;
    let singleton = ctx.singleton || ctx.reflect.singleton;
    const container = injector.getContainer();
    const actionPdr = container.actionPdr;
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
        actionPdr.getInstance(RuntimeLifeScope).register(ctx);
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


export const BeforeAnnoDecorScope = function (ctx: DesignContext, next: () => void) {
    ctx.reflect.decors.filter(d => d.decorType === 'class')
        .forEach(d => {
            ctx.currDecor = d.decor;
            chain(d.decorPdr.getDesignHandle('BeforeAnnoation'), ctx);
        });

    return next();
}


export const DesignClassDecorScope = function (ctx: DesignContext, next: () => void) {
    ctx.reflect.decors.filter(d => d.decorType === 'class')
        .forEach(d => {
            ctx.currDecor = d.decor;
            chain(d.decorPdr.getDesignHandle('Class'), ctx);
        });

    return next();
}




export class DesignPropScope extends IocRegScope<DesignContext> implements IActionSetup {

    setup() {
        this.use(PropProviderAction)
            .use(DesignPropDecorScope);
    }
}

export const DesignPropDecorScope = function (ctx: DesignContext, next: () => void) {
    ctx.reflect.decors.filter(d => d.decorType === 'property')
        .forEach(d => {
            ctx.currDecor = d.decor;
            chain(d.decorPdr.getDesignHandle('Property'), ctx);
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
    const tgReflect = ctx.reflect;
    const injector = ctx.injector;
    const type = ctx.type;

    const registed = injector.getContainer().regedState.getRegistered(type);
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
    let targetReflect = ctx.reflect;
    targetReflect.propProviders.forEach((propMetas, name) => {
        propMetas.forEach(prop => {
            if (isClass(prop.provider)) {
                injector.registerType(prop.provider);
            }
            if (isClass(prop.type)) {
                injector.registerType(prop.type);
            }
        });
    });


    next();
};

export class DesignMthScope extends IocRegScope<DesignContext> implements IActionSetup {
    setup() {
        this.use(RegMethodParamsType)
            .use(DesignMthDecorScope);
    }
}

export const RegMethodParamsType = function (ctx: DesignContext, next: () => void) {
    const injector = ctx.injector;
    ctx.reflect.methodParams.forEach(pms => {
        pms.forEach(pm => {
            if (isClass(pm.type)) {
                injector.registerType(pm.type);
            }
            if (isClass(pm.provider)) {
                injector.registerType(pm.provider);
            }
        });
    });
    return next();
}


export const DesignMthDecorScope = function (ctx: DesignContext, next: () => void) {
    ctx.reflect.decors.filter(d => d.decorType === 'method')
        .forEach(d => {
            ctx.currDecor = d.decor;
            chain(d.decorPdr.getDesignHandle('Method'), ctx);
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
        this.use(AnnoDecorScope)
            .use(AfterAnnoDecorScope)
            .use(IocAutorunAction);
    }
}


export const AnnoDecorScope = function (ctx: DesignContext, next: () => void) {
    ctx.reflect.decors.filter(d => d.decorType === 'class')
        .forEach(d => {
            ctx.currDecor = d.decor;
            chain(d.decorPdr.getDesignHandle('Annoation'), ctx);
        });

    return next();
}

export const AfterAnnoDecorScope = function (ctx: DesignContext, next: () => void) {
    ctx.reflect.decors.filter(d => d.decorType === 'class')
        .forEach(d => {
            ctx.currDecor = d.decor;
            chain(d.decorPdr.getDesignHandle('AfterAnnoation'), ctx);
        });

    return next();
}


