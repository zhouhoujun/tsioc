import { Type, DecoratorScope } from '../types';
import { isClass, isArray, isDefined } from '../utils/lang';
import { Token, isToken } from '../tokens';
import { ParameterMetadata } from '../decor/metadatas';
import { Inject, AutoWired, Param, Autorun } from '../decor/decorators';
import { parm, cls, mth, prop, befCtor, aftCtor } from '../utils/exps';
import { IActionSetup } from '../Action';
import {
    IocRegAction, InitReflectAction, IocRegScope, ExecDecoratorAtion,
    DecorsRegisterer, RuntimeRegisterer, IocDecorScope, RuntimeContext
} from './reg';
import { IocCacheManager } from './cache';


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
 * runtime decorator action.
 *  the register type class can only, register to ioc.
 * ` container.registerSingleton(RouteRuntimRegisterAction, () => new RouteRuntimRegisterAction(container));`
 *
 */
export class RuntimeDecorAction extends ExecDecoratorAtion {
    protected getScopeRegisterer(): DecorsRegisterer {
        return this.actInjector.getInstance(RuntimeRegisterer);
    }
}


// /**
//  * bind parameter type action.
//  *
//  * @export
//  * @class BindParameterTypeAction
//  * @extends {ActionComposite}
//  */
// export const BindDeignParamTypeAction = function (ctx: RuntimeContext, next: () => void) {
//     let propertyKey = ctx.propertyKey;
//     if (!ctx.targetReflect.methodParams.has(propertyKey)) {
//         ctx.targetReflect.methodParams.set(
//             propertyKey,
//             createDesignParams(ctx, ctx.type, ctx.instance, propertyKey));
//     }
//     next();
// };

// /**
//  * bind parameter type action.
//  *
//  */
// export const BindParamTypeAction = function (ctx: RuntimeContext, next: () => void) {
//     let propertyKey = ctx.propertyKey;
//     let targetReflect = ctx.targetReflect;
//     if (targetReflect.methodParams.has(propertyKey)) {
//         return next();
//     }

//     let target = ctx.instance;
//     let type = ctx.type;

//     let designParams = createDesignParams(ctx, type, target, propertyKey);

//     let injector = ctx.injector;
//     let currDecoractor = ctx.currDecor;
//     let parameters = (target || propertyKey !== 'constructor') ? refs.getParamerterMetadata<ParameterMetadata>(currDecoractor, target, propertyKey) : refs.getParamerterMetadata<ParameterMetadata>(currDecoractor, type);
//     if (isArray(parameters) && parameters.length) {
//         parameters.forEach(params => {
//             let parm = (isArray(params) && params.length > 0) ? params[0] : null;
//             if (parm && parm.index >= 0) {
//                 if (isClass(parm.provider)) {
//                     if (!injector.hasRegister(parm.provider)) {
//                         injector.registerType(parm.provider);
//                     }
//                 }
//                 if (isClass(parm.type)) {
//                     if (!injector.hasRegister(parm.type)) {
//                         injector.registerType(parm.type);
//                     }
//                 }
//                 if (isToken(parm.provider)) {
//                     designParams[parm.index].provider = injector.getTokenKey(parm.provider, parm.alias);
//                 }
//             }
//         });
//     }

//     if (propertyKey === 'constructor') {
//         if (designParams.some(pa => !pa.type && !pa.provider)) {
//             targetReflect.class.extendTypes.forEach(ty => {
//                 if (ty === ctx.type) {
//                     return true;
//                 }

//                 let parameters = refs.getParamerterMetadata<ParameterMetadata>(currDecoractor, ty);
//                 if (parameters.length < 1) {
//                     return true;
//                 }

//                 let names = refs.getParamerterNames(ty, propertyKey);
//                 if (names.length < 1) {
//                     return true;
//                 }

//                 parameters.map((params, idx) => {
//                     let parm = (isArray(params) && params.length > 0) ? params[0] : null;
//                     let n = (parm && names.length > parm.index) ? names[parm.index] : names[idx] || '';
//                     if (!parm) {
//                         return { name: n };
//                     }
//                     return {
//                         name: n,
//                         provider: injector.getTokenKey(parm.provider, parm.alias)
//                     }
//                 }).forEach(parm => {
//                     if (parm.provider) {
//                         designParams.forEach(pa => {
//                             if (!pa.type && !pa.provider && pa.paramName === parm.name) {
//                                 pa.provider = parm.provider;
//                             }
//                         });
//                     }
//                 });
//                 return false;
//             });
//         }
//     }

//     targetReflect.methodParams.set(propertyKey, designParams);

//     next();
// };

/**
 * resolve constructor args action.
 *
 */
export const CtorArgsAction = function (ctx: RuntimeContext, next: () => void): void {
    if (!ctx.args) {
        const injector = ctx.injector;
        if (ctx.reflect.methodParams.has('constructor')) {
            ctx.params = ctx.reflect.methodParams.get('constructor');
        } else {
            const pkey = ctx.propertyKey;
            ctx.propertyKey = 'constructor';
            injector.getContainer().getActionInjector().getInstance(RuntimeParamScope).execute(ctx);
            ctx.propertyKey = pkey;
            ctx.params = ctx.reflect.methodParams.get('constructor');
        }
        ctx.args = injector.createParams(ctx.params, ctx.providers);
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

    props.forEach((token, propertyKey) => {
        let key = `${propertyKey}_INJECTED`
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



export abstract class RuntimeDecorScope extends IocDecorScope<RuntimeContext> {

    protected getScopeDecorators(ctx: RuntimeContext, scope: DecoratorScope): string[] {
        const runtime = ctx.injector.getInstance(RuntimeRegisterer);
        const registerer = runtime.getRegisterer(scope);
        const decors = ctx.reflect.decors;
        return registerer.getDecorators().filter(d => decors.some(de => de.decor === d));
    }

    setup() {
        this.use(RuntimeDecorAction);
    }

}


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
export class BeforeCtorDecorScope extends RuntimeDecorScope {
    protected getDecorScope(): DecoratorScope {
        return befCtor;
    }
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
export class AfterCtorDecorScope extends RuntimeDecorScope {
    protected getDecorScope(): DecoratorScope {
        return aftCtor;
    }
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
        let cache = ctx.injector.getInstance(IocCacheManager).get(ctx.instance, targetReflect.expires);
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
    let cacheManager = ctx.injector.getInstance(IocCacheManager);
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
export class RuntimeAnnoDecorScope extends RuntimeDecorScope {
    protected getDecorScope(): DecoratorScope {
        return cls;
    }
}


export class RuntimeMthScope extends IocRegScope<RuntimeContext> implements IActionSetup {
    setup() {
        this.actInjector.getInstance(RuntimeRegisterer)
            .register(Autorun, mth, MthAutorunAction);

        this.use(RuntimeMthDecorScope);
    }
}

export class RuntimeMthDecorScope extends RuntimeDecorScope {
    protected getDecorScope(): DecoratorScope {
        return mth;
    }
}


export class RuntimePropScope extends IocRegScope<RuntimeContext> implements IActionSetup {
    setup() {
        this.use(InjectPropAction)
            .use(RuntimePropDecorScope);
    }
}

export class RuntimePropDecorScope extends RuntimeDecorScope {
    protected getDecorScope(): DecoratorScope {
        return prop;
    }
}

/**
 * runtime param scope.
 *
 * @export
 * @class RuntimeParamScope
 * @extends {IocRegScope<RuntimeContext>}
 */
export class RuntimeParamScope extends IocRegScope<RuntimeContext> implements IActionSetup {
    execute(ctx: RuntimeContext, next?: () => void): void {
        if (!ctx.reflect) {
            InitReflectAction(ctx);
        }
        super.execute(ctx, next);
    }

    setup() {

        this.use(RuntimeParamDecorScope);
            // .use(BindDeignParamTypeAction);
    }
}


export class RuntimeParamDecorScope extends RuntimeDecorScope {
    protected getDecorScope(): DecoratorScope {
        return parm;
    }
}


function createDesignParams(ctx: RuntimeContext, type: Type, target: any, propertyKey: string): ParameterMetadata[] {
    let paramTokens: Token[];
    if (target && propertyKey) {
        paramTokens = Reflect.getMetadata('design:paramtypes', target, propertyKey) || [];
    } else {
        paramTokens = Reflect.getMetadata('design:paramtypes', type) || [];
    }

    let injector = ctx.injector;
    paramTokens = paramTokens.slice(0);
    paramTokens.forEach(dtype => {
        if (isClass(dtype) && !injector.hasRegister(dtype)) {
            injector.registerType(dtype);
        }
    });
    let names = ctx.reflect.class.getParamNames(propertyKey);
    let params: ParameterMetadata[];
    if (names.length) {
        params = names.map((name, idx) => {
            return {
                name: name,
                type: paramTokens.length ? checkParamType(paramTokens[idx]) : undefined
            }
        });
    } else if (paramTokens.length) {
        params = paramTokens.map((tk, idx) => {
            return {
                name: names.length ? names[idx] : '',
                type: checkParamType(tk)
            }
        });
    } else {
        params = [];
    }
    return params;
}

function checkParamType(type: any): Type {
    if (type === Object) {
        return undefined;
    }
    return type;
}
