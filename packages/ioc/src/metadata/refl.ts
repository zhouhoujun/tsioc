import { Action, Actions } from '../action';
import { DesignContext, RuntimeContext } from '../actions/ctx';
import { AnnotationType, ClassType, Type } from '../types';
import { chain, Handler } from '../utils/hdl';
import { cleanObj, getParentClass } from '../utils/lang';
import { EMPTY, isArray, isFunction } from '../utils/chk';
import { ParameterMetadata, PropertyMetadata, ProvidersMetadata, ClassMetadata, AutorunMetadata, InjectableMetadata } from './meta';
import { ctorName, DecoratorType, DecorContext, DecorDefine, Decors, ActionTypes, TypeReflect } from './type';
import { TypeDefine } from './typedef';
import { Platform } from '../injector';



export type ActionType = 'propInject' | 'paramInject' | 'annoation' | 'autorun' | 'typeProviders' | 'methodProviders';


/**
 * decorator reflect hanldes.
 */
export interface DecorReflectHandles {
    /**
     * class decorator reflect handle.
     */
    class?: Handler<DecorContext> | Handler<DecorContext>[];
    /**
     * method decorator reflect handle.
     */
    method?: Handler<DecorContext> | Handler<DecorContext>[];
    /**
     * property decorator reflect handle.
     */
    property?: Handler<DecorContext> | Handler<DecorContext>[];
    /**
     * parameter decorator reflect handle.
     */
    parameter?: Handler<DecorContext> | Handler<DecorContext>[];
}

/**
 * decorator action scope hanldes.
 */
export interface DecorScopeHandles<T> {
    /**
     * decorator BeforeAnnoation action handles.
     */
    beforeAnnoation?: Handler<T> | Handler<T>[];

    /**
     * decorator Class action handles.
     */
    class?: Handler<T> | Handler<T>[];

    /**
     * decorator Parameter action handles.
     */
    parameter?: Handler<T> | Handler<T>[];

    /**
     * decorator Property action handles.
     */
    property?: Handler<T> | Handler<T>[];

    /**
     * decorator Method action handles.
     */
    method?: Handler<T> | Handler<T>[];

    /**
     * decorator BeforeConstructor action handles.
     */
    beforeConstructor?: Handler<T> | Handler<T>[];

    /**
     * decorator AfterConstructor action handles.
     */
    afterConstructor?: Handler<T> | Handler<T>[];

    /**
     * decorator Annoation action handles.
     */
    annoation?: Handler<T> | Handler<T>[];

    /**
     * decorator AfterAnnoation action handles.
     */
    afterAnnoation?: Handler<T> | Handler<T>[];
}

/**
 * decorator register options.
 */
export interface DecorRegisterOption extends ProvidersMetadata {
    /**
     * decorator basic action type.
     */
    actionType?: ActionType | ActionType[];
    /**
     * set reflect handles.
     */
    reflect?: DecorReflectHandles;
    /**
     * set design action scope handles.
     */
    design?: DecorScopeHandles<DesignContext>
    /**
     * set runtime action scope handles.
     */
    runtime?: DecorScopeHandles<RuntimeContext>;
}

/**
 * metadata factory. parse args to metadata.
 */
export interface MetadataFactory<T> {
    /**
     * parse args as metadata props.
     * @param args
     */
    props?(...args: any[]): T;
    /**
     * append metadata.
     * @param metadata
     */
    appendProps?(metadata: T): void;
    /**
     * init decor context.
     */
    init?: (ctx: DecorContext) => void;
}

/**
 * decorator option.
 */
export interface DecoratorOption<T> extends MetadataFactory<T>, DecorRegisterOption { }


/**
 * create decorator define.
 * @param name 
 * @param decor 
 * @param metadata 
 * @param decorType 
 * @param options 
 * @param propertyKey 
 * @param parameterIndex 
 * @returns decorator define
 */
export function toDefine<T>(name: string, decor: string, metadata: T, decorType: DecoratorType, options: DecoratorOption<any>, propertyKey?: string, parameterIndex?: number): DecorDefine<T> {
    if (options.actionType) {
        isArray(options.actionType) ?
            options.actionType.forEach(a => regActionType(decor, a))
            : regActionType(decor, options.actionType);
    }

    const providers = options.providers || [];

    return {
        name,
        decor,
        propertyKey: propertyKey!,
        parameterIndex,
        decorType,
        metadata,
        providers,
        getHandle: options.reflect ? mapToFac(options.reflect as Record<string, Handler | Handler[]>) : emptyHd,
        getDesignHandle: options.design ? mapToFac(options.design as Record<string, Handler | Handler[]>) : emptyHd,
        getRuntimeHandle: options.runtime ? mapToFac(options.runtime as Record<string, Handler | Handler[]>) : emptyHd
    };
}



const emptyHd = (type: any) => EMPTY;

function mapToFac(maps: Record<string, Handler | Handler[]>): (type: DecoratorType) => Handler[] {
    const mapHd = new Map();
    for (let type in maps) {
        let rged: Handler[] = mapHd.get(type);
        if (!rged) {
            rged = [];
            mapHd.set(type, rged);
        }
        const handle = maps[type];
        isArray(handle) ? rged.push(...handle) : rged.push(handle);
    }
    return (type: DecoratorType) => mapHd.get(type) ?? EMPTY;
}

function regActionType(decor: string, type: ActionType) {
    switch (type) {
        case ActionTypes.annoation:
            typeAnnoDecors[decor] = true;
            break;
        case ActionTypes.paramInject:
            paramInjectDecors[decor] = true;
            break;
        case ActionTypes.propInject:
            propInjectDecors[decor] = true;
            break;
        case ActionTypes.autorun:
            autorunDecors[decor] = true;
            break;
        case ActionTypes.typeProviders:
            typeProvidersDecors[decor] = true;
            break;
        case ActionTypes.methodProviders:
            methodProvidersDecors[decor] = true;
            break;
        default:
            return;
    }
}

const paramInjectDecors: Record<string, boolean> = { '@Inject': true, '@Autowired': true, '@Param': true };
export const ParamInjectAction = (ctx: DecorContext, next: () => void) => {
    if (paramInjectDecors[ctx.decor]) {
        const reflect = ctx.reflect;
        let meta = ctx.metadata as ParameterMetadata;
        const propertyKey = ctx.propertyKey;
        let params = reflect.class.getParameters(propertyKey);
        if (!params) {
            const names = reflect.class.getParamNames(propertyKey);
            let paramTypes: any[];
            if (propertyKey === ctorName) {
                paramTypes = Reflect.getMetadata('design:paramtypes', reflect.type);
            } else {
                paramTypes = Reflect.getMetadata('design:paramtypes', ctx.target, propertyKey);
            }
            if (paramTypes) {
                params = paramTypes.map((type, index) => ({ type, paramName: names[index], index }));
                reflect.class.setParameters(propertyKey, params);
            }
        }
        if (params) {
            meta = { ...meta, ...params[ctx.parameterIndex!] };
            params.splice(ctx.parameterIndex!, 1, meta);
        }
    }
    return next();
};


export const InitPropDesignAction = (ctx: DecorContext, next: () => void) => {
    if (!(ctx.metadata as PropertyMetadata).type) {
        let type = Reflect.getOwnMetadata('design:type', ctx.target, ctx.propertyKey);
        if (!type) {
            // Needed to support react native inheritance
            type = Reflect.getOwnMetadata('design:type', ctx.target.constructor, ctx.propertyKey);
        }
        (ctx.metadata as PropertyMetadata).type = type;
    }
    return next();
}



const propInjectDecors: Record<string, boolean> = { '@Inject': true, '@Autowired': true };
export const PropInjectAction = (ctx: DecorContext, next: () => void) => {
    if (propInjectDecors[ctx.decor]) {
        ctx.reflect.class.setProperyProviders(ctx.propertyKey, [ctx.metadata]);
    }
    return next();
};


export const InitCtorDesignParams = (ctx: DecorContext, next: () => void) => {
    if (!ctx.reflect.class.hasParameters(ctorName)) {
        let paramTypes: any[] = Reflect.getMetadata('design:paramtypes', ctx.reflect.type);
        if (paramTypes) {
            const names = ctx.reflect.class.getParamNames(ctorName);
            if (!paramTypes) {
                paramTypes = [];
            }
            ctx.reflect.class.setParameters(ctorName, paramTypes.map((type, index) => {
                return { type, paramName: names[index], index };
            }));
        }
    }
    return next();
}

const typeAnnoDecors: Record<string, boolean> = { '@Injectable': true, '@Singleton': true, '@Abstract': true };
export const TypeAnnoAction = (ctx: DecorContext, next: () => void) => {
    if (typeAnnoDecors[ctx.decor]) {
        const reflect = ctx.reflect;
        const meta = ctx.metadata as ClassMetadata & InjectableMetadata;
        if (meta.abstract) {
            reflect.class.abstract = true;
        } else {
            reflect.class.abstract = reflect.class.annotation?.abstract === true;
        }
        if (meta.singleton) {
            reflect.singleton = true;
        }
        if (meta.provide && reflect.class.provides.indexOf(meta.provide) < 0) {
            reflect.class.provides.push(meta.provide);
        }
        if (meta.expires) {
            reflect.expires = meta.expires;
        }

        if (ctx.providers) {
            reflect.class.providers.push(...ctx.providers);
        }

        if (meta.providedIn) {
            reflect.providedIn = meta.providedIn;
        }
    }
    return next();
};

const autorunDecors: Record<string, boolean> = { '@Autorun': true, '@IocExt': true };
export const AutorunAction = (ctx: DecorContext, next: () => void) => {
    if (autorunDecors[ctx.decor]) {
        ctx.reflect.class.autoruns.push({
            decorType: ctx.decorType,
            autorun: (ctx.metadata as AutorunMetadata).autorun!,
            order: ctx.decorType === Decors.CLASS ? 0 : (ctx.metadata as AutorunMetadata).order
        });
        ctx.reflect.class.autoruns.sort((au1, au2) => au1.order! - au2.order!);
    }
    return next();
}

const typeProvidersDecors: Record<string, boolean> = { '@Injectable': true, '@Providers': true };
export const TypeProvidersAction = (ctx: DecorContext, next: () => void) => {
    if (typeProvidersDecors[ctx.decor]) {
        if ((ctx.metadata as ProvidersMetadata).providers) {
            ctx.reflect.class.providers.push(...(ctx.metadata as ProvidersMetadata).providers!);
        }
    }
    return next();
}

export const InitMethodDesignParams = (ctx: DecorContext, next: () => void) => {
    if (!ctx.reflect.class.hasParameters(ctx.propertyKey)) {
        const names = ctx.reflect.class.getParamNames(ctx.propertyKey);
        ctx.reflect.class.setParameters(ctx.propertyKey,
            (Reflect.getMetadata('design:paramtypes', ctx.target, ctx.propertyKey) as Type[]).map((type, idx) => ({ type, paramName: names[idx] })));
    }
    return next();
}

const methodProvidersDecors: Record<string, boolean> = { '@Providers': true, '@Autowired': true };
export const MethodProvidersAction = (ctx: DecorContext, next: () => void) => {
    if (methodProvidersDecors[ctx.decor]) {
        const mpdrs = (ctx.metadata as ProvidersMetadata).providers;
        if (mpdrs) {
            ctx.reflect.class.setMethodProviders(ctx.propertyKey, mpdrs)
        }
    }
    return next();
}

export const ExecuteDecorHandle = (ctx: DecorContext, next: () => void) => {
    if (ctx.getHandle) {
        const handles = ctx.getHandle(ctx.decorType);
        chain(handles, ctx);
    }
    return next()
}


class DecorActions extends Actions<DecorContext, Handler | Action> {
    protected override getPlatform(ctx: DecorContext): Platform { return null!; }
    protected override parseHandler(provider: Platform, ac: any): Handler {
        if (isFunction(ac)) {
            return ac;
        } else if (ac instanceof Action) {
            return ac.toHandler();
        }
        return null!;
    }
}

export const typeDecorActions: Actions<DecorContext> = new DecorActions();
export const propDecorActions: Actions<DecorContext> = new DecorActions();
export const methodDecorActions: Actions<DecorContext> = new DecorActions();
export const paramDecorActions: Actions<DecorContext> = new DecorActions();


typeDecorActions.use(
    InitCtorDesignParams,
    TypeAnnoAction,
    TypeProvidersAction,
    AutorunAction,
    ExecuteDecorHandle
);

methodDecorActions.use(
    InitMethodDesignParams,
    MethodProvidersAction,
    AutorunAction,
    ExecuteDecorHandle
);

propDecorActions.use(
    InitPropDesignAction,
    PropInjectAction,
    ExecuteDecorHandle
);
paramDecorActions.use(
    ParamInjectAction,
    ExecuteDecorHandle
);

function dispatch(actions: Actions<DecorContext>, target: any, type: ClassType, define: DecorDefine, init?: (ctx: DecorContext) => void) {
    const ctx = {
        ...define,
        target,
        reflect: get(type, true)
    };
    init && init(ctx);
    actions.execute(ctx, () => {
        ctx.reflect.class.addDefine(define);
    });
    cleanObj(ctx);
}

export function dispatchTypeDecor(type: ClassType, define: DecorDefine, init?: (ctx: DecorContext) => void) {
    dispatch(typeDecorActions, type, type, define, init);
}

export function dispatchPorpDecor(type: any, define: DecorDefine, init?: (ctx: DecorContext) => void) {
    dispatch(propDecorActions, type, type.constructor, define, init);
}

export function dispatchMethodDecor(type: any, define: DecorDefine, init?: (ctx: DecorContext) => void) {
    dispatch(methodDecorActions, type, type.constructor, define, init);
}

export function dispatchParamDecor(type: any, define: DecorDefine, init?: (ctx: DecorContext) => void) {
    let target = type;
    if (!define.propertyKey) {
        define.propertyKey = ctorName;
    } else {
        type = type.constructor;
    }
    dispatch(paramDecorActions, target, type, define, init);
}

/**
 * get type reflect.
 * @param type class type.
 * @param ify if not has own reflect will create new reflect.
 */
export function get<T extends TypeReflect>(type: ClassType, ify?: boolean): T {
    let tagRefl = (type as AnnotationType).ρRfl?.() as TypeReflect;
    if (tagRefl?.type !== type) {
        if (!ify) return null!;

        let prRef = tagRefl;
        if (!prRef) {
            const parentType = getParentClass(type);
            if (parentType) {
                prRef = get(parentType, ify);
            }
        }
        tagRefl = {
            type,
            class: new TypeDefine(type, prRef?.class)
        };
        (type as AnnotationType).ρRfl = () => tagRefl;
    }
    return tagRefl as T;
}
