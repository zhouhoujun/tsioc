import { Action, Actions } from '../action';
import { DesignContext, RuntimeContext } from '../actions/ctx';
import { AnnotationType, ClassType, EMPTY, Type } from '../types';
import { cleanObj, getParentClass } from '../utils/lang';
import { isArray, isFunction } from '../utils/chk';
import { runChain, Handler } from '../handler';
import {
    ParameterMetadata, PropertyMetadata, ProvidersMetadata, ClassMetadata,
    RunnableMetadata, InjectableMetadata, MethodMetadata
} from './meta';
import {
    ctorName, DecoratorType, DecorContext, DecorDefine, Decors, ActionTypes,
    Class, TypeDef
} from './type';
import { Platform } from '../injector';
import { InvokeOptions } from '../context';



export type ActionType = 'propInject' | 'paramInject' | 'annoation' | 'runnable'
    | 'typeProviders' | 'methodProviders';


/**
 * decorator def hanldes.
 */
export interface DecorDefHandles {
    /**
     * class decorator def handle.
     */
    class?: Handler<DecorContext> | Handler<DecorContext>[];
    /**
     * method decorator def handle.
     */
    method?: Handler<DecorContext> | Handler<DecorContext>[];
    /**
     * property decorator def handle.
     */
    property?: Handler<DecorContext> | Handler<DecorContext>[];
    /**
     * parameter decorator def handle.
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
     * set def handles.
     */
    def?: DecorDefHandles;
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
    /**
     * after init decor context.
     */
    afterInit?: (ctx: DecorContext) => void;
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
            : regActionType(decor, options.actionType)
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
        getHandle: options.def ? mapToFac(options.def as Record<string, Handler | Handler[]>) : emptyHd,
        getDesignHandle: options.design ? mapToFac(options.design as Record<string, Handler | Handler[]>) : emptyHd,
        getRuntimeHandle: options.runtime ? mapToFac(options.runtime as Record<string, Handler | Handler[]>) : emptyHd
    }
}



const emptyHd = (type: any) => EMPTY;

function mapToFac(maps: Record<string, Handler | Handler[]>): (type: DecoratorType) => Handler[] {
    const mapHd = new Map();
    for (const type in maps) {
        let rged: Handler[] = mapHd.get(type);
        if (!rged) {
            rged = [];
            mapHd.set(type, rged);
        }
        const handle = maps[type];
        isArray(handle) ? rged.push(...handle) : rged.push(handle)
    }
    return (type: DecoratorType) => mapHd.get(type) ?? EMPTY
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
        case ActionTypes.runnable:
            runnableDecors[decor] = true;
            break;
        case ActionTypes.typeProviders:
            typeProvidersDecors[decor] = true;
            break;
        case ActionTypes.methodProviders:
            methodProvidersDecors[decor] = true;
            break;
        default:
            return
    }
}

const paramInjectDecors: Record<string, boolean> = { '@Inject': true, '@Autowired': true, '@Param': true, '@Nullable': true };
export const ParamInjectAction = (ctx: DecorContext, next: () => void) => {
    if (paramInjectDecors[ctx.decor]) {
        const def = ctx.class;
        const meta = ctx.metadata as ParameterMetadata;
        const propertyKey = ctx.propertyKey;
        let params = def.hasParameters(propertyKey) ? def.getParameters(propertyKey) : null;
        if (!params) {
            const names = def.getParamNames(propertyKey);
            let paramTypes: any[];
            if (propertyKey === ctorName) {
                paramTypes = Reflect.getMetadata('design:paramtypes', def.type)
            } else {
                paramTypes = Reflect.getMetadata('design:paramtypes', ctx.target, propertyKey)
            }
            if (paramTypes) {
                params = paramTypes.map((type, index) => ({ type, name: names[index] }));
                def.setParameters(propertyKey, params)
            }
        }
        if (params) {
            const idx = ctx.parameterIndex || 0;
            const desgmeta = params[idx];
            meta.type = desgmeta.type;
            meta.name = desgmeta.name;
            params.splice(idx, 1, { ...meta, ...desgmeta })
        }
    }
    return next()
}


export const InitPropDesignAction = (ctx: DecorContext, next: () => void) => {
    if (!(ctx.metadata as PropertyMetadata).type) {
        let type = Reflect.getOwnMetadata('design:type', ctx.target, ctx.propertyKey);
        if (!type) {
            // Needed to support react native inheritance
            type = Reflect.getOwnMetadata('design:type', ctx.target.constructor, ctx.propertyKey);
        }
        (ctx.metadata as PropertyMetadata).type = type;
    }
    return next()
}



const propInjectDecors: Record<string, boolean> = { '@Inject': true, '@Autowired': true };
export const PropInjectAction = (ctx: DecorContext, next: () => void) => {
    if (propInjectDecors[ctx.decor]) {
        ctx.class.setProperyProviders(ctx.propertyKey, [ctx.metadata])
    }
    return next()
}


export const InitCtorDesignParams = (ctx: DecorContext, next: () => void) => {
    if (!ctx.class.hasParameters(ctorName)) {
        let paramTypes: any[] = Reflect.getMetadata('design:paramtypes', ctx.class.type);
        if (paramTypes) {
            const names = ctx.class.getParamNames(ctorName);
            if (!paramTypes) {
                paramTypes = []
            }
            ctx.class.setParameters(ctorName, paramTypes.map((type, index) => {
                return { type, name: names[index] }
            }))
        }
    }
    return next()
}

const typeAnnoDecors: Record<string, boolean> = { '@Injectable': true, '@Singleton': true, '@Abstract': true };
export const TypeAnnoAction = (ctx: DecorContext, next: () => void) => {
    if (typeAnnoDecors[ctx.decor]) {
        const def = ctx.class;
        const meta = ctx.metadata as ClassMetadata & InjectableMetadata;
        if (meta.abstract) {
            def.annotation.abstract = true
        }

        if (meta.singleton) {
            def.annotation.singleton = true
        }
        if (meta.static) {
            def.annotation.static = true
        }
        if (meta.provide && def.provides.indexOf(meta.provide) < 0) {
            def.provides.push(meta.provide)
        }
        if (meta.expires) {
            def.annotation.expires = meta.expires
        }

        if (ctx.providers) {
            def.providers.push(...ctx.providers)
        }

        if (meta.providedIn) {
            def.annotation.providedIn = meta.providedIn
        }
    }
    return next()
};

const runnableDecors: Record<string, boolean> = { '@Autorun': true, '@IocExt': true };
export const RunnableAction = (ctx: DecorContext, next: () => void) => {
    if (runnableDecors[ctx.decor]) {
        ctx.metadata = {
            decorType: ctx.decorType,
            args: (ctx.metadata as RunnableMetadata).args,
            auto: (ctx.metadata as RunnableMetadata).auto,
            method: (ctx.metadata as RunnableMetadata).method ?? ctx.propertyKey,
            order: ctx.decorType === Decors.CLASS ? 0 : (ctx.metadata as RunnableMetadata).order
        }
        ctx.class.runnables.push(ctx.metadata);
        ctx.class.runnables.sort((au1, au2) => au1.order! - au2.order!)
    }
    return next()
}

const typeProvidersDecors: Record<string, boolean> = { '@Injectable': true, '@Providers': true };
export const TypeProvidersAction = (ctx: DecorContext, next: () => void) => {
    if (typeProvidersDecors[ctx.decor]) {
        if ((ctx.metadata as ProvidersMetadata).providers) {
            ctx.class.providers.push(...(ctx.metadata as ProvidersMetadata).providers!)
        }
    }
    return next()
}

export const InitMethodDesignParams = (ctx: DecorContext, next: () => void) => {
    const reflective = ctx.class;
    const method = ctx.propertyKey;
    if (!reflective.hasParameters(method)) {
        const names = reflective.getParamNames(method);
        reflective.setParameters(method,
            (Reflect.getMetadata('design:paramtypes', ctx.target, method) as Type[]).map((type, idx) => ({ type, name: names[idx] })))
    }
    const meta = ctx.metadata as MethodMetadata;
    if (!meta.type) {
        meta.type = Reflect.getMetadata('design:returntype', ctx.target, method)
    }
    if (!reflective.hasReturnning(method) && meta.type) {
        reflective.setReturnning(method, meta.type)
    }
    return next()
}

const methodProvidersDecors: Record<string, boolean> = { '@Providers': true, '@Autowired': true };
export const MethodProvidersAction = (ctx: DecorContext, next: () => void) => {
    if (methodProvidersDecors[ctx.decor]) {
        const mpdrs = (ctx.metadata as MethodMetadata) as InvokeOptions;
        if (mpdrs) {
            ctx.class.setMethodOptions(ctx.propertyKey, mpdrs)
        }
    }
    return next()
}

export const ExecuteDecorHandle = (ctx: DecorContext, next: () => void) => {
    if (ctx.getHandle) {
        const handles = ctx.getHandle(ctx.decorType);
        runChain(handles, ctx)
    }
    return next()
}


class DecorActions extends Actions<DecorContext> {
    protected override getPlatform(ctx: DecorContext): Platform { return null!; }
    protected override parseHandler(provider: Platform, ac: any): Handler {
        if (isFunction(ac)) {
            return ac
        } else if (ac instanceof Action) {
            return ac.getHandler()
        }
        return null!
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
    RunnableAction,
    ExecuteDecorHandle
);

methodDecorActions.use(
    InitMethodDesignParams,
    MethodProvidersAction,
    RunnableAction,
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

function dispatch(actions: Actions<DecorContext>, target: any, type: ClassType, define: DecorDefine, options: DecoratorOption<any>) {
    const ctx = {
        ...define,
        target,
        class: get(type)
    } as DecorContext;
    options.init && options.init(ctx);
    actions.handle(ctx, () => {
        ctx.class.addDefine(define)
    });
    options.afterInit && options.afterInit(ctx);
    cleanObj(ctx)
}

export function dispatchTypeDecor(type: ClassType, define: DecorDefine, options: DecoratorOption<any>) {
    dispatch(typeDecorActions, type, type, define, options)
}

export function dispatchPorpDecor(type: any, define: DecorDefine, options: DecoratorOption<any>) {
    dispatch(propDecorActions, type, type.constructor, define, options)
}

export function dispatchMethodDecor(type: any, define: DecorDefine, options: DecoratorOption<any>) {
    dispatch(methodDecorActions, type, type.constructor, define, options)
}

export function dispatchParamDecor(type: any, define: DecorDefine, options: DecoratorOption<any>) {
    const target = type;
    if (!define.propertyKey) {
        define.propertyKey = ctorName
    } else {
        type = type.constructor
    }
    dispatch(paramDecorActions, target, type, define, options)
}

/**
 * get type def.
 * @param type class type.
 */
export function getDef<T extends TypeDef>(type: ClassType): T {
    let tagAnn = (type as AnnotationType).ƿAnn?.() as TypeDef;
    if (tagAnn?.type !== type) {
        tagAnn = {
            name: type.name,
            type
        };
        (type as AnnotationType).ƿAnn = () => tagAnn;

    }
    return tagAnn as T
}


/**
 * get type Reflective.
 * @param type class type.
 */
export function get<TAnn extends TypeDef<T>, T = any>(type: ClassType<T>): Class<T, TAnn> {
    let tagRefl = (type as AnnotationType).ƿRef?.() as Class<T, TAnn>;
    if (tagRefl?.type !== type) {
        let prRef: Class = tagRefl;
        if (!prRef) {
            const parentType = getParentClass(type);
            if (parentType) {
                prRef = get(parentType)
            }
        }
        tagRefl = new Class(type, getDef(type) as TAnn, prRef);
        (type as AnnotationType).ƿRef = () => tagRefl;

    }
    return tagRefl;
}
