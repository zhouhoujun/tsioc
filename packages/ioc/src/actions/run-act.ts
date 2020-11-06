import { chain, isDefined } from '../utils/lang';
import { isToken } from '../tokens';
import { IActionSetup } from '../Action';
import { RuntimeContext } from './ctx';
import { IocRegAction, IocRegScope } from './reg';
import { CacheManager } from './cache';
import { METHOD_ACCESSOR } from '../utils/tk';


/**
 * ioc runtime register action.
 * the register type class can only register in ioc as:
 * ` container.registerSingleton(SubRuntimRegisterAction, () => new SubRuntimRegisterAction(container));`
 * @export
 * @abstract
 * @class IocRegisterAction
 * @extends {IocRegAction<RuntimeContext>}
 */
export abstract class IocRuntimeAction extends IocRegAction<RuntimeContext> {

}

/**
 * resolve constructor args action.
 *
 */
export const CtorArgsAction = function (ctx: RuntimeContext, next: () => void): void {
    if (!ctx.args) {
        ctx.params = ctx.reflect.methodParams.get('constructor') ?? [];
        ctx.args = ctx.injector.getInstance(METHOD_ACCESSOR).createParams(ctx.injector, ctx.params || [], ctx.providers);
    }
    next();
};


/**
 * create instance action.
 *
 * @export
 * @class CreateInstanceAction
 * @extends {IocRuntimeAction}
 */
export const CreateInstanceAction = function (ctx: RuntimeContext, next: () => void): void {
    if (!ctx.instance) {
        ctx.instance = new ctx.type(...ctx.args);
    }
    next();
};


/**
 * inject property value action, to inject property value for resolve instance.
 */
export const InjectPropAction = function (ctx: RuntimeContext, next: () => void) {
    let providers = ctx.providers;
    let injector = ctx.injector;

    let props = ctx.reflect.propProviders;

    props.forEach((metas, propertyKey) => {
        let key = `${propertyKey}_INJECTED`;
        let meta = metas.find(m => m.provider);
        let token;
        if (meta) {
            token = injector.getTokenKey(meta.provider, meta.alias);
        } else {
            token = metas.find(m => m.type)?.type;
        }
        if (isToken(token) && !ctx[key]) {
            let val = injector.resolve({ token, target: ctx.type }, providers);
            if (isDefined(val)) {
                ctx.instance[propertyKey] = val;
                ctx[key] = true;
            }
        }
    });

    next();
};


/**
 * ioc register actions scope run before constructor.
 *
 */
export class BeforeCtorScope extends IocRegScope<RuntimeContext> implements IActionSetup {
    setup() {
        this.use(BeforeCtorDecorScope);
    }
}

/**
 * before constructor decorator.
 *
 */
export const BeforeCtorDecorScope = function (ctx: RuntimeContext, next: () => void) {
    ctx.reflect.decors.filter(d => d.decorType === 'class')
        .forEach(d => {
            ctx.currDecor = d.decor;
            chain(d.decorPdr.getRuntimeHandle('BeforeConstructor'), ctx);
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
export class AfterCtorScope extends IocRegScope<RuntimeContext> implements IActionSetup {
    setup() {
        this.use(AfterCtorDecorScope);
    }
}

/**
 * after constructor decorator.
 *
 * @export
 * @extends {RuntimeDecorScope}
 */
export const AfterCtorDecorScope = function (ctx: RuntimeContext, next: () => void) {
    ctx.reflect.decors.filter(d => d.decorType === 'class')
        .forEach(d => {
            ctx.currDecor = d.decor;
            chain(d.decorPdr.getRuntimeHandle('AfterConstructor'), ctx);
        });

    return next();
}


/**
 * ioc extend register action.
 *
 */
export abstract class IocExtendRegAction extends IocRuntimeAction {

}

/**
 * get class cache action.
 *
 * @export
 */
export const IocGetCacheAction = function (ctx: RuntimeContext, next: () => void): void {
    let targetReflect = ctx.reflect;
    if (!ctx.instance && !targetReflect.singleton && targetReflect.expires > 0) {
        let cache = ctx.injector.getInstance(CacheManager).get(ctx.instance, targetReflect.expires);
        if (cache) {
            ctx.instance = cache;
            if (ctx.instance) {
                return;
            }
        }
    }
    next();
};

/**
 * cache action. To cache instance of Token. define cache expires in decorator.
 *
 * @export
 */
export const IocSetCacheAction = function (ctx: RuntimeContext, next: () => void) {
    let targetReflect = ctx.reflect;
    if (targetReflect.singleton || !targetReflect.expires || targetReflect.expires <= 0) {
        return next();
    }
    let cacheManager = ctx.injector.getInstance(CacheManager);
    if (!cacheManager.hasCache(ctx.type)) {
        cacheManager.cache(ctx.type, ctx.instance, targetReflect.expires);
    }
    next();
};


/**
 * method auto run action.
 *
 * @export
 * @class SetPropAction
 * @extends {IocRuntimeAction}
 */
export const MthAutorunAction = function (ctx: RuntimeContext, next: () => void) {
    const injector = ctx.injector;
    const autoruns = ctx.reflect.autoruns;
    if (autoruns.length) {
        autoruns.sort((au1, au2) => {
            return au1.order - au2.order;
        }).forEach(aut => {
            injector.invoke(ctx.instance || ctx.type, aut.autorun, ctx.instance);
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
    if (ctx.type && ctx.instance && ctx.reflect.singleton) {
        if (!ctx.injector.hasValue(ctx.type)) {
            ctx.injector.setValue(ctx.type, ctx.instance);
        }
    }
    next();
}



/**
 * runtime annoation action scope.
 *
 */
export class RuntimeAnnoScope extends IocRegScope<RuntimeContext> implements IActionSetup {
    setup() {

        this.use(IocSetCacheAction)
            .use(RegSingletionAction)
            .use(RuntimeAnnoDecorScope);
    }
}

/**
 * runtime annoation decorator action scope.
 *
 */
export const RuntimeAnnoDecorScope = function (ctx: RuntimeContext, next: () => void) {
    ctx.reflect.decors.filter(d => d.decorType === 'class')
        .forEach(d => {
            ctx.currDecor = d.decor;
            chain(d.decorPdr.getRuntimeHandle('Class'), ctx);
        });

    return next();
}


export class RuntimeMthScope extends IocRegScope<RuntimeContext> implements IActionSetup {
    setup() {
        this.use(RuntimeMthDecorScope);
    }
}
export const RuntimeMthDecorScope = function (ctx: RuntimeContext, next: () => void) {
    ctx.reflect.decors.filter(d => d.decorType === 'method')
        .forEach(d => {
            ctx.currDecor = d.decor;
            chain(d.decorPdr.getRuntimeHandle('Method'), ctx);
        });

    return next();
}


export class RuntimePropScope extends IocRegScope<RuntimeContext> implements IActionSetup {
    setup() {
        this.use(InjectPropAction)
            .use(RuntimePropDecorScope);
    }
}

export const RuntimePropDecorScope = function (ctx: RuntimeContext, next: () => void) {
    ctx.reflect.decors.filter(d => d.decorType === 'property')
        .forEach(d => {
            ctx.currDecor = d.decor;
            chain(d.decorPdr.getRuntimeHandle('Property'), ctx);
        });

    return next();
}

