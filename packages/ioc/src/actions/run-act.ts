import { EMPTY, isDefined } from '../utils/chk';
import { chain } from '../handler';
import { ActionSetup } from '../action';
import { RuntimeContext } from './ctx';
import { IocRegAction, IocRegScope } from './reg';
import { PropertyMetadata } from '../metadata/meta';
import { ArgumentError, OperationFactoryResolver, Parameter } from '../invoker';
import { ctorName, Decors } from '../metadata/type';


/**
 * ioc runtime register action.
 * the register type class can only register in ioc as:
 * ` container.registerSingleton(SubRuntimRegisterAction, () => new SubRuntimRegisterAction(container));`
 * @export
 * @abstract
 * @class IocRegisterAction
 * @extends {IocRegAction<RuntimeContext>}
 */
export abstract class IocRuntimeAction extends IocRegAction<RuntimeContext> { }

/**
 * resolve constructor args action.
 */
export const CtorArgsAction = function (ctx: RuntimeContext, next: () => void): void {
    if (!ctx.params) {
        ctx.params = ctx.reflect.class.getParameters(ctorName);
    }
    const factory = ctx.injector.get(OperationFactoryResolver).create(ctx.reflect);
    const context = ctx.context = factory.createContext(ctx.context?.injector ?? ctx.injector, {
        invokerMethod: ctorName,
        parent: ctx.context
    });
    if (!ctx.args) {
        ctx.args = factory.createInvoker(ctorName).resolveArguments(context);
    }
    next();
    context.destroy();
};


/**
 * create instance action.
 *
 * @export
 * @class CreateInstanceAction
 * @extends {IocRuntimeAction}
 */
export const CreateInstanceAction = function (ctx: RuntimeContext, next: () => void): void {
    ctx.instance = new ctx.type(...ctx.args || EMPTY);
    next();
};


/**
 * inject property value action, to inject property value for resolve instance.
 */
export const InjectPropAction = function (ctx: RuntimeContext, next: () => void) {
    const context = ctx.context;
    if (!context) throw new Error('autowride property need InvocationContext');
    let meta: PropertyMetadata, key: string, val;
    ctx.reflect.class.eachProperty((metas, propertyKey) => {
        key = `${propertyKey}_INJECTED`;
        meta = metas.find(m => m.provider)!;
        if (!meta) {
            meta = metas.find(m => m.type)!;
        }
        if (meta && !(ctx as any)[key]) {
            if (!context.canResolve(meta as Parameter)) {
                throw new ArgumentError(`can not autowride property ${propertyKey} of class ${ctx.type}`);
            }
            val = context.resolveArgument(meta as Parameter);
            if (isDefined(val)) {
                ctx.instance[propertyKey] = val;
                (ctx as any)[key] = true;
            }
        }
    });

    next();
};


/**
 * ioc register actions scope run before constructor.
 *
 */
export class BeforeCtorScope extends IocRegScope<RuntimeContext> implements ActionSetup {
    setup() {
        this.use(BeforeCtorDecorHandle);
    }
}

/**
 * before constructor decorator.
 *
 */
export const BeforeCtorDecorHandle = function (ctx: RuntimeContext, next: () => void) {
    ctx.reflect.class.classDecors.forEach(d => {
        ctx.currDecor = d.decor;
        chain(d.getRuntimeHandle(Decors.beforeConstructor), ctx);
    });

    return next();
}




/**
 * ioc register actions scope run after constructor.
 *
 * @export
 * @class IocAfterConstructorScope
 * @extends {IocRuntimeScopeAction}
 */
export class AfterCtorScope extends IocRegScope<RuntimeContext> implements ActionSetup {
    setup() {
        this.use(AfterCtorDecorHandle);
    }
}

/**
 * after constructor decorator.
 *
 * @export
 * @extends {RuntimeDecorScope}
 */
export const AfterCtorDecorHandle = function (ctx: RuntimeContext, next: () => void) {
    ctx.reflect.class.classDecors.forEach(d => {
        ctx.currDecor = d.decor;
        chain(d.getRuntimeHandle(Decors.afterConstructor), ctx);
    });

    return next();
}

/**
 * ioc extend register action.
 */
export abstract class IocExtendRegAction extends IocRuntimeAction { }

/**
 * cache action. To cache instance of Token. define cache expires in decorator.
 *
 * @export
 */
export const IocSetCacheAction = function (ctx: RuntimeContext, next: () => void) {
    if (!ctx.instance || ctx.singleton || !ctx.reflect.expires || ctx.reflect.expires <= 0) {
        return next();
    }
    ctx.injector.cache(ctx.type, ctx.instance, ctx.reflect.expires);
    return next();
};


/**
 * method auto run action.
 *
 * @export
 * @class SetPropAction
 * @extends {IocRuntimeAction}
 */
export const MthAutorunAction = function (ctx: RuntimeContext, next: () => void) {
    if (ctx.reflect.class.autoruns.length) {
        const { injector: injector, type, instance, context } = ctx;
        ctx.reflect.class.autoruns.forEach(aut => {
            injector.invoke(instance || type, aut.autorun, context);
        });
    }

    next();
};


/**
 * singleton action, to set the factory of Token as singleton.
 *
 * @export
 * @class SingletionAction
 * @extends {IocRuntimeAction}
 */
export const RegSingletionAction = function (ctx: RuntimeContext, next: () => void): void {
    if (ctx.type && ctx.instance && ctx.singleton) {
        ctx.platform.registerSingleton(ctx.injector, ctx.provide || ctx.type, ctx.instance);
    }
    next();
}



/**
 * runtime annoation action scope.
 *
 */
export class RuntimeAnnoScope extends IocRegScope<RuntimeContext> implements ActionSetup {
    setup() {
        this.use(IocSetCacheAction, RegSingletionAction, RuntimeAnnoDecorHandle);
    }
}

/**
 * runtime annoation decorator action scope.
 */
export const RuntimeAnnoDecorHandle = function (ctx: RuntimeContext, next: () => void) {
    ctx.reflect.class.classDecors.forEach(d => {
        ctx.currDecor = d.decor;
        chain(d.getRuntimeHandle(Decors.CLASS), ctx);
    });

    return next();
}


export class RuntimeMthScope extends IocRegScope<RuntimeContext> implements ActionSetup {
    setup() {
        this.use(RuntimeMthDecorHandle);
    }
}
export const RuntimeMthDecorHandle = function (ctx: RuntimeContext, next: () => void) {
    ctx.reflect.class.methodDecors.forEach(d => {
        ctx.currDecor = d.decor;
        chain(d.getRuntimeHandle(Decors.method), ctx);
    });

    return next();
}


export class RuntimePropScope extends IocRegScope<RuntimeContext> implements ActionSetup {
    setup() {
        this.use(InjectPropAction, RuntimePropDecorHandle);
    }
}

export const RuntimePropDecorHandle = function (ctx: RuntimeContext, next: () => void) {
    ctx.reflect.class.propDecors.forEach(d => {
        ctx.currDecor = d.decor;
        chain(d.getRuntimeHandle(Decors.property), ctx);
    });

    return next();
}

