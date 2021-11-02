import { isFunction } from '../utils/chk';
import { cleanObj } from '../utils/lang';
import { chain } from '../utils/hdl';
import { Type } from '../types';
import { Token } from '../tokens';
import { DesignContext, RuntimeContext } from './ctx';
import { IActionSetup } from '../action';
import { IocRegAction, IocRegScope } from './reg';
import { RuntimeLifeScope } from './runtime';
import { ROOT_INJECTOR } from '../metadata/tk';
import { Injector } from '../injector';



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
            BeforeAnnoDecorHandle,
            TypeProviderAction,
            RegClassAction,
            DesignClassDecorHandle
        );
    }
}

export const AnnoRegInAction = function (ctx: DesignContext, next: () => void): void {
    if (ctx.reflect.providedIn === 'root') {
        ctx.providedIn = ctx.reflect.providedIn;
        ctx.injector = ctx.injector.get(ROOT_INJECTOR);
    }
    const state = ctx.state = genState(ctx.injector, ctx.provide);
    ctx.injector.platform().regType(ctx.type, state);
    next();
};

function genState(injector: Injector, provide?: Token) {
    return {
        provides: provide ? [provide] : [],
        injector
    }
}

function regInstf(injector: Injector, type: Type, provide: Token, singleton: boolean) {
    const platfrom = injector.platform()
    injector.set(provide, {
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

            platfrom.getAction(RuntimeLifeScope).register(ctx);
            const instance = ctx.instance;
            // clean context
            cleanObj(ctx);
            return instance;
        },
        fnType: 'inj',
        unreg: () => platfrom.deleteType(type)
    });
}


export const RegClassAction = function (ctx: DesignContext, next: () => void): void {
    regInstf(ctx.injector, ctx.type, ctx.provide || ctx.type, ctx.singleton || ctx.reflect.singleton === true);
    next();
};


export const BeforeAnnoDecorHandle = function (ctx: DesignContext, next: () => void) {
    ctx.reflect.class.classDecors.forEach(d => {
        ctx.currDecor = d.decor;
        chain(d.getDesignHandle('beforeAnnoation'), ctx);
    });

    return next();
}


export const DesignClassDecorHandle = function (ctx: DesignContext, next: () => void) {
    ctx.reflect.class.classDecors.forEach(d => {
        ctx.currDecor = d.decor;
        chain(d.getDesignHandle('class'), ctx);
    });

    return next();
}


export class DesignPropScope extends IocRegScope<DesignContext> implements IActionSetup {

    setup() {
        this.use(
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
    const { injector: injector, type, provide: regpdr, state, regProvides } = ctx;
    if (regpdr && regpdr !== type) {
        ctx.reflect.provides.forEach(provide => {
            if (provide != regpdr && regProvides !== false) {
                injector.set({ provide, useExisting: regpdr });
            }
            state.provides.push(provide);
        });
    } else {
        ctx.reflect.provides.forEach(provide => {
            regProvides !== false && injector.set({ provide, useClass: type });
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


export class DesignMthScope extends IocRegScope<DesignContext> implements IActionSetup {
    setup() {
        this.use(
            DesignMthDecorScope
        );
    }
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
