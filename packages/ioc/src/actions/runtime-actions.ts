import { Token, Type, DecoratorScope } from '../types';
import { isClass, isArray, isDefined, lang, isNumber } from '../utils/lang';
import { IParameter } from '../IParameter';
import { CTX_CURR_DECOR, CTX_ARGS, CTX_PARAMS, CTX_PROPERTYKEY } from '../utils/tk';
import { isToken } from '../utils/isToken';
import { ParameterMetadata, AutorunMetadata } from '../metadatas';
import { Inject, AutoWired, Param, Singleton, Injectable, IocExt, Autorun } from '../decorators';
import { parm, cls, mth, prop, befCtor, aftCtor } from '../utils/exps';
import { IActionSetup } from './Action';
import {
    IocRegAction, InitReflectAction, IocRegScope, RegOption, RegContext,
    ExecDecoratorAtion, DecorsRegisterer, RuntimeRegisterer, IocDecorScope
} from './IocRegAction';
import { IocCacheManager } from './IocCacheManager';
import { ParamProviders } from '../providers/types';
import { createContext } from './IocAction';
import { IInjector } from '../IInjector';

/**
 *  runtime action option.
 *
 */
export interface RuntimeOption extends RegOption {
    /**
     * the args.
     *
     * @type {any[]}
     * @memberof RuntimeActionContext
     */
    args?: any[];

    /**
     * property key.
     */
    propertyKey?: string;
    /**
     * args params types.
     *
     * @type {IParameter[]}
     * @memberof RuntimeActionContext
     */
    params?: IParameter[];
    /**
     * target instance.
     *
     * @type {*}
     * @memberof RegisterActionContext
     */
    target?: any;
    /**
     * exter providers for resolve. origin providers
     *
     * @type {ParamProviders[]}
     * @memberof RegisterActionContext
     */
    providers?: ParamProviders[];
}


/**
 * Ioc Register action context.
 *
 * @extends {RegContext}
 */
export class RuntimeContext extends RegContext<RuntimeOption> {
    /**
     * target instance.
     *
     * @type {*}
     * @memberof RuntimeActionContext
     */
    target?: any;

    get propertyKey() {
        return this.getValue(CTX_PROPERTYKEY);
    }

    /**
     * create register context.
     *
     * @static
     * @param {IInjector} injector
     * @param {RuntimeOption} options
     * @returns {RegContext}
     * @memberof RegisterActionContext
     */
    static parse(injector: IInjector, options: RuntimeOption): RuntimeContext {
        return createContext(injector, RuntimeContext, options);
    }

    setOptions(options: RuntimeOption) {
        if (!options) {
            return this;
        }
        if (options.target) {
            this.target = options.target;
        }
        if (options.args) {
            this.context.setValue(CTX_ARGS, options.args);
        }
        if (options.params) {
            this.context.setValue(CTX_PARAMS, options.params);
        }
        this.context.setValue(CTX_PROPERTYKEY, options.propertyKey || 'constructor');
        return super.setOptions(options);
    }
}

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


/**
 * bind parameter type action.
 *
 * @export
 * @class BindParameterTypeAction
 * @extends {ActionComposite}
 */
export const BindDeignParamTypeAction = function (ctx: RuntimeContext, next: () => void) {
    let propertyKey = ctx.propertyKey;
    if (!ctx.targetReflect.methodParams.has(propertyKey)) {
        ctx.targetReflect.methodParams.set(
            propertyKey,
            createDesignParams(ctx, ctx.type, ctx.target, propertyKey));
    }
    next();
};

/**
 * bind parameter type action.
 *
 */
export const BindParamTypeAction = function (ctx: RuntimeContext, next: () => void) {
    let propertyKey = ctx.propertyKey;
    let targetReflect = ctx.targetReflect;
    if (targetReflect.methodParams.has(propertyKey)) {
        return next();
    }

    let target = ctx.target;
    let type = ctx.type;

    let designParams = createDesignParams(ctx, type, target, propertyKey);

    let refs = ctx.reflects;
    let injector = ctx.injector;
    let currDecoractor = ctx.getValue(CTX_CURR_DECOR);
    let parameters = (target || propertyKey !== 'constructor') ? refs.getParamerterMetadata<ParameterMetadata>(currDecoractor, target, propertyKey) : refs.getParamerterMetadata<ParameterMetadata>(currDecoractor, type);
    if (isArray(parameters) && parameters.length) {
        parameters.forEach(params => {
            let parm = (isArray(params) && params.length > 0) ? params[0] : null;
            if (parm && parm.index >= 0) {
                if (isClass(parm.provider)) {
                    if (!injector.hasRegister(parm.provider)) {
                        injector.registerType(parm.provider);
                    }
                }
                if (isClass(parm.type)) {
                    if (!injector.hasRegister(parm.type)) {
                        injector.registerType(parm.type);
                    }
                }
                if (isToken(parm.provider)) {
                    designParams[parm.index].provider = injector.getTokenKey(parm.provider, parm.alias);
                }
            }
        });
    }

    if (propertyKey === 'constructor') {
        if (designParams.some(pa => !pa.type && !pa.provider)) {
            targetReflect.defines.extendTypes.forEach(ty => {
                if (ty === ctx.type) {
                    return true;
                }

                let parameters = refs.getParamerterMetadata<ParameterMetadata>(currDecoractor, ty);
                if (parameters.length < 1) {
                    return true;
                }

                let names = refs.getParamerterNames(ty, propertyKey);
                if (names.length < 1) {
                    return true;
                }

                parameters.map((params, idx) => {
                    let parm = (isArray(params) && params.length > 0) ? params[0] : null;
                    let n = (parm && names.length > parm.index) ? names[parm.index] : names[idx] || '';
                    if (!parm) {
                        return { name: n };
                    }
                    return {
                        name: n,
                        provider: injector.getTokenKey(parm.provider, parm.alias)
                    }
                }).forEach(parm => {
                    if (parm.provider) {
                        designParams.forEach(pa => {
                            if (!pa.type && !pa.provider && pa.name === parm.name) {
                                pa.provider = parm.provider;
                            }
                        });
                    }
                });
                return false;
            });
        }
    }

    targetReflect.methodParams.set(propertyKey, designParams);

    next();
};

/**
 * resolve constructor args action.
 *
 */
export const CtorArgsAction = function (ctx: RuntimeContext, next: () => void): void {
    if (!ctx.hasValue(CTX_ARGS)) {
        let targetReflect = ctx.targetReflect;
        let injector = ctx.injector;
        if (targetReflect.methodParams.has('constructor')) {
            ctx.setValue(CTX_PARAMS, targetReflect.methodParams.get('constructor'));
        } else {
            ctx.reflects.getActionInjector().getInstance(RuntimeParamScope).execute(ctx);
            ctx.setValue(CTX_PARAMS, targetReflect.methodParams.get('constructor'));
        }
        ctx.setValue(CTX_ARGS, injector.createParams(ctx.get(CTX_PARAMS), ctx.providers));
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
    if (!ctx.target) {
        ctx.target = new ctx.type(...ctx.getValue(CTX_ARGS));
    }
    next();
};


/**
 * inject property value action, to inject property value for resolve instance.
 */
export const InjectPropAction = function (ctx: RuntimeContext, next: () => void) {
    let providers = ctx.providers;
    let injector = ctx.injector;

    let props = ctx.targetReflect.propProviders;

    props.forEach((token, propertyKey) => {
        let key = `${propertyKey}_INJECTED`
        if (isToken(token) && !ctx.hasValue(key)) {
            let val = injector.resolve({ token, target: ctx.type }, providers);
            if (isDefined(val)) {
                ctx.target[propertyKey] = val;
                ctx.set(key, true);
            }
        }
    });

    next();
};



export abstract class RuntimeDecorScope extends IocDecorScope<RuntimeContext> {

    protected getScopeDecorators(ctx: RuntimeContext, scope: DecoratorScope): string[] {
        switch (scope) {
            case cls:
                return ctx.targetReflect.decorators.runtime.classDecors;
            case mth:
                return ctx.targetReflect.decorators.runtime.methodDecors;
            case prop:
                return ctx.targetReflect.decorators.runtime.propsDecors;
            case parm:
                return ctx.targetReflect.decorators.runtime.getParamDecors(ctx.propertyKey, ctx.target);
            case befCtor:
                return ctx.targetReflect.decorators.runtime.beforeCstrDecors;
            case aftCtor:
                return ctx.targetReflect.decorators.runtime.afterCstrDecors
        }
        return ctx.targetReflect.decorators.runtime.getDecortors(scope);
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
    let targetReflect = ctx.targetReflect;
    if (!ctx.target && !targetReflect.singleton && targetReflect.expires > 0) {
        let cache = ctx.injector.getInstance(IocCacheManager).get(ctx.target, targetReflect.expires);
        if (cache) {
            ctx.target = cache;
            if (ctx.target) {
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
    let targetReflect = ctx.targetReflect;
    if (targetReflect.singleton || !targetReflect.expires || targetReflect.expires <= 0) {
        return next();
    }
    let cacheManager = ctx.injector.getInstance(IocCacheManager);
    if (!cacheManager.hasCache(ctx.type)) {
        cacheManager.cache(ctx.type, ctx.target, targetReflect.expires);
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
    let currDec = ctx.getValue(CTX_CURR_DECOR);
    let injector = ctx.injector;
    if (ctx.reflects.hasMethodMetadata(currDec, ctx.type)) {
        let metas = ctx.reflects.getMethodMetadata<AutorunMetadata>(currDec, ctx.type);
        let lastmetas: AutorunMetadata[] = [];
        let idx = Object.keys(metas).length;
        lang.forIn(metas, (mm, key) => {
            if (mm && mm.length) {
                let m = mm[0];
                m.autorun = key;
                idx++;
                if (!isNumber(m.order)) {
                    m.order = idx;
                }
                lastmetas.push(m);
            }
        });

        lastmetas.sort((au1, au2) => {
            return au1.order - au2.order;
        }).forEach(aut => {
            injector.invoke(ctx.target || ctx.type, aut.autorun, ctx.target);
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
    if (ctx.type && ctx.target && ctx.targetReflect.singleton) {
        if (!ctx.injector.hasSingleton(ctx.type)) {
            ctx.injector.setSingleton(ctx.type, ctx.target);
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

        this.actInjector.getInstance(RuntimeRegisterer)
            .register(Singleton, cls, RegSingletionAction)
            .register(Injectable, cls, RegSingletionAction, IocSetCacheAction)
            .register(IocExt, cls, RegSingletionAction);

        this.use(RuntimeAnnoDecorScope);
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

        this.actInjector.getInstance(RuntimeRegisterer)
            .register(Inject, prop, InjectPropAction)
            .register(AutoWired, prop, InjectPropAction);

        this.use(RuntimePropDecorScope);
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
        if (!ctx.targetReflect) {
            InitReflectAction(ctx);
        }
        super.execute(ctx, next);
    }

    setup() {

        this.actInjector.getInstance(RuntimeRegisterer)
            .register(Inject, parm, BindParamTypeAction)
            .register(AutoWired, parm, BindParamTypeAction)
            .register(Param, parm, BindParamTypeAction);

        this.use(RuntimeParamDecorScope)
            .use(BindDeignParamTypeAction);
    }
}


export class RuntimeParamDecorScope extends RuntimeDecorScope {
    protected getDecorScope(): DecoratorScope {
        return parm;
    }
}


function createDesignParams(ctx: RuntimeContext, type: Type, target: any, propertyKey: string): IParameter[] {
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
    let names = ctx.reflects.getParamerterNames(type, propertyKey);
    let params: IParameter[];
    if (names.length) {
        params = names.map((name, idx) => {
            return <IParameter>{
                name: name,
                type: paramTokens.length ? checkParamType(paramTokens[idx]) : undefined
            }
        });
    } else if (paramTokens.length) {
        params = paramTokens.map((tk, idx) => {
            return <IParameter>{
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
