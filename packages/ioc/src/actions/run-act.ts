import { ClassType, EMPTY } from '../types';
import { isDefined } from '../utils/chk';
import { runChain } from '../handler';
import { ActionSetup } from '../action';
import { RuntimeContext } from './ctx';
import { IocRegScope } from './reg';
import { PropertyMetadata } from '../metadata/meta';
import { ctorName, Decors } from '../metadata/type';
import { Parameter } from '../resolver';
import { ArgumentExecption, Execption } from '../execption';
import { createContext, InvocationContext } from '../context';
import { ReflectiveFactory } from '../reflective';


/**
 * resolve constructor args action.
 */
export const CtorArgsAction = function (ctx: RuntimeContext, next: () => void): void {
    if (!ctx.params) {
        ctx.params = ctx.typeRef.getParameters(ctorName)
    }

    const uctx = ctx.context;
    const providers = ctx.typeRef.providers;
    let newCtx: InvocationContext | undefined;
    if (!uctx || (uctx.targetType && uctx.targetType !== ctx.type)) {
        newCtx = createContext(ctx.injector, {
            targetType: ctx.type,
            parent: uctx,
            providers,
            methodName: ctorName
        });
        ctx.context = newCtx
    } else if (uctx && providers.length) {
        uctx.injector.inject(providers)
    }

    if (!ctx.args) {
        ctx.args = ctx.typeRef.resolveArguments(ctorName, ctx.context!)
    }

    next();
    // after create.
    if (newCtx && !newCtx.injected) {
        newCtx.destroy()
    }
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
    next()
};

const onError = (target: ClassType, propertyKey: string) => {
    throw new ArgumentExecption(`can not autowride property ${propertyKey} of class ${target}`)
}

/**
 * inject property value action, to inject property value for resolve instance.
 */
export const InjectPropAction = function (ctx: RuntimeContext, next: () => void) {
    const context = ctx.context;
    if (!context) throw new Execption('autowride property need InvocationContext');
    let meta: PropertyMetadata, key: string, val;

    ctx.typeRef.eachProperty((metas, propertyKey) => {
        key = `${propertyKey}_INJECTED`;
        meta = metas.find(m => m.provider)!;
        if (!meta) {
            meta = metas.find(m => m.type)!
        }
        if (meta && !(ctx as any)[key]) {

            val = context.resolveArgument(meta as Parameter, ctx.type, onError);
  
            if (isDefined(val)) {
                ctx.instance[propertyKey] = val;
                (ctx as any)[key] = true
            }
        }
    });

    next()
};


/**
 * ioc register actions scope run before constructor.
 *
 */
export class BeforeCtorScope extends IocRegScope<RuntimeContext> implements ActionSetup {
    setup() {
        this.use(BeforeCtorDecorHandle)
    }
}

/**
 * before constructor decorator.
 *
 */
export const BeforeCtorDecorHandle = function (ctx: RuntimeContext, next: () => void) {
    ctx.typeRef.classDecors.forEach(d => {
        ctx.currDecor = d.decor;
        runChain(d.getRuntimeHandle(Decors.beforeConstructor), ctx)
    });

    return next()
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
        this.use(AfterCtorDecorHandle)
    }
}

/**
 * after constructor decorator.
 *
 * @export
 * @extends {RuntimeDecorScope}
 */
export const AfterCtorDecorHandle = function (ctx: RuntimeContext, next: () => void) {
    ctx.typeRef.classDecors.forEach(d => {
        ctx.currDecor = d.decor;
        runChain(d.getRuntimeHandle(Decors.afterConstructor), ctx)
    });

    return next()
}


/**
 * cache action. To cache instance of Token. define cache expires in decorator.
 *
 * @export
 */
export const IocSetCacheAction = function (ctx: RuntimeContext, next: () => void) {
    if (!ctx.instance || ctx.singleton || !ctx.typeRef.annotation.expires || ctx.typeRef.annotation.expires <= 0) {
        return next()
    }
    ctx.injector.cache(ctx.type, ctx.instance, ctx.typeRef.annotation.expires);
    return next()
}


/**
 * method auto run action.
 *
 * @export
 * @class SetPropAction
 * @extends {IocRuntimeAction}
 */
export const MthAutorunAction = function (ctx: RuntimeContext, next: () => void) {
    const autos = ctx.typeRef.runnables.filter(c => c.auto && c.decorType === Decors.method)
    if (autos.length) {
        const { injector, typeRef: def, instance, context } = ctx;
        const factory = injector.get(ReflectiveFactory).create(def, injector, context);
        autos.forEach(aut => {
            factory.invoke(aut.method, context, instance)
        })
    }

    next()
}


/**
 * singleton action, to set the factory of Token as singleton.
 *
 * @export
 * @class SingletionAction
 * @extends {IocRuntimeAction}
 */
export const RegSingletionAction = function (ctx: RuntimeContext, next: () => void): void {
    if (ctx.type && ctx.instance && ctx.singleton) {
        ctx.platform.registerSingleton(ctx.injector, ctx.provide || ctx.type, ctx.instance)
    }

    next()
}



/**
 * runtime annoation action scope.
 *
 */
export class RuntimeAnnoScope extends IocRegScope<RuntimeContext> implements ActionSetup {
    setup() {
        this.use(IocSetCacheAction, RegSingletionAction, RuntimeAnnoDecorHandle, MthAutorunAction)
    }
}

/**
 * runtime annoation decorator action scope.
 */
export const RuntimeAnnoDecorHandle = function (ctx: RuntimeContext, next: () => void) {
    ctx.typeRef.classDecors.forEach(d => {
        ctx.currDecor = d.decor;
        runChain(d.getRuntimeHandle(Decors.CLASS), ctx)
    });

    return next()
}


export class RuntimeMthScope extends IocRegScope<RuntimeContext> implements ActionSetup {
    setup() {
        this.use(RuntimeMthDecorHandle)
    }
}
export const RuntimeMthDecorHandle = function (ctx: RuntimeContext, next: () => void) {
    ctx.typeRef.methodDecors.forEach(d => {
        ctx.currDecor = d.decor;
        runChain(d.getRuntimeHandle(Decors.method), ctx)
    });

    return next()
}


export class RuntimePropScope extends IocRegScope<RuntimeContext> implements ActionSetup {
    setup() {
        this.use(InjectPropAction, RuntimePropDecorHandle)
    }
}

export const RuntimePropDecorHandle = function (ctx: RuntimeContext, next: () => void) {
    ctx.typeRef.propDecors.forEach(d => {
        ctx.currDecor = d.decor;
        runChain(d.getRuntimeHandle(Decors.property), ctx)
    });

    return next()
}
