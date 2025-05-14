import { AnnotationType, typeRef, Type } from '../types';
import { cleanObj, getParentClass } from '../utils/lang';
import { getClass, isArray, isBoolean, isType } from '../utils/chk';
import {
    ParameterMetadata, PropertyMetadata, ProvidersMetadata, AnnotationMetadata,
    RunnableMetadata, MethodMetadata
} from './meta';
import {
    ctorName, DecoratorType, DecorContext, DecorDefine, Decors, ActionTypes,
    Class, TypeDef, DecoratorFn, ActionType
} from './class';
import { InvokeOptions } from '../context';
import { Context, HandlerFn } from '../handler';
import { LifeScope } from '../lifescope/lifescope';
import { DesignContext, RuntimeContext } from '../lifescope/ctx';
import { InvocationFactory } from '../invocation';
import { Resolve } from '../injector';





/**
 * decorator def hanldes.
 */
export interface DecorDefHandles<T = any> {
    /**
     * class decorator def handle.
     */
    class?: HandlerFn<DecorContext<T>, void, Context> | HandlerFn<DecorContext<T>, void, Context>[];
    /**
     * method decorator def handle.
     */
    method?: HandlerFn<DecorContext<T>, void, Context> | HandlerFn<DecorContext<T>, void, Context>[];
    /**
     * property decorator def handle.
     */
    property?: HandlerFn<DecorContext<T>, void, Context> | HandlerFn<DecorContext<T>, void, Context>[];
    /**
     * parameter decorator def handle.
     */
    parameter?: HandlerFn<DecorContext<T>, void, Context> | HandlerFn<DecorContext<T>, void, Context>[];
}

/**
 * design action scope hanldes.
 * raise handles order by beforeAnnoation -> class -> property -> method -> afterAnnoation
 */
export interface DesignScopeHandles<T> {
    /**
     * decorator BeforeAnnoation action handles.
     * raise handles order by beforeAnnoation -> property -> method -> afterAnnoation
     */
    beforeAnnoation?: HandlerFn<T, void, Context> | HandlerFn<T, void, Context>[];

    /**
     * decorator Property action handles.
     * raise handles order by beforeAnnoation -> property -> method -> afterAnnoation
     */
    property?: HandlerFn<T, void, Context> | HandlerFn<T, void, Context>[];

    /**
     * decorator Method action handles.
     * raise handles order by beforeAnnoation -> class -> property -> method -> afterAnnoation
     */
    method?: HandlerFn<T, void, Context> | HandlerFn<T, void, Context>[];

    /**
     * decorator AfterAnnoation action handles.
     * raise handles order by beforeAnnoation -> property -> method -> afterAnnoation
     */
    afterAnnoation?: HandlerFn<T, void, Context> | HandlerFn<T, void, Context>[];
}

/**
 * runtime action scope hanldes.
 * raise handles order by property -> method -> class
 */
export interface RuntimeScopeHandles<T> {
    /**
     * decorator Property action handles.
     * raise handles order by property -> method -> class
     */
    property?: HandlerFn<T, void, Context> | HandlerFn<T, void, Context>[];

    /**
     * decorator Method action handles.
     * raise handles order by property -> method -> class
     */
    method?: HandlerFn<T, void, Context> | HandlerFn<T, void, Context>[];

    /**
     * decorator Class action handles.
     * raise handles order by  property -> method -> class
     */
    class?: HandlerFn<T, void, Context> | HandlerFn<T, void, Context>[];

}


/**
 * decorator register options.
 */
export interface DecorRegisterOption<T = any> {
    /**
     * decorator basic action type.
     */
    actionType?: ActionType | ActionType[];
    /**
     * set def handles.
     * raise when init decorator metadate of Type.
     */
    def?: DecorDefHandles<T>;
    /**
     * set design action scope handles.
     * raise when Type inject.
     * raise design handles order by beforeAnnoation -> class -> property -> method -> afterAnnoation
     */
    design?: DesignScopeHandles<DesignContext>
    /**
     * set runtime action scope handles.
     * raise when resolve instance of Type.
     * raise runtime handles order by beforeConstructor -> afterConstructor -> property -> method -> class
     */
    runtime?: RuntimeScopeHandles<RuntimeContext>;
}

/**
 * metadata factory. parse args to metadata.
 */
export interface MetadataFactory<T = any> extends ProvidersMetadata {
    /**
     * is metadata or not.
     */
    isMatadata?(arg: any): boolean;
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
    init?: (ctx: DecorContext<T>) => void;
    /**
     * after init decor context.
     */
    afterInit?: (ctx: DecorContext<T>) => void;
    /**
     * set invocation factory.
     */
    factory?: Resolve<InvocationFactory>;
    /**
     * set metadata.
     * @param metadata
     */
}

/**
 * decorator option.
 */
export interface DecoratorOption<T> extends MetadataFactory<T>, DecorRegisterOption<T> { }


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
export function toDefine<T>(decor: DecoratorFn, metadata: T, decorType: DecoratorType, options: MetadataFactory<any>, propertyKey?: string, parameterIndex?: number): DecorDefine<T> {

    const providers = options.providers;

    return {
        decor,
        propertyKey: propertyKey!,
        parameterIndex,
        decorType,
        metadata,
        providers
    }
}



function regActionType(decor: string, type: ActionType, decType: DecoratorType) {
    let records: Record<string, boolean> | undefined;
    switch (type) {
        case ActionTypes.annoation:
            records = typeAnnoDecors;
            break;
        case ActionTypes.inject:
            switch (decType) {
                case 'parameter':
                    records = paramInjectDecors;
                    break;
                case 'property':
                    records = propInjectDecors;
                    break;
            }
            break;
        case ActionTypes.runnable:
            records = runnableDecors;
            break;
        case ActionTypes.providers:
            switch (decType) {
                case 'class':
                    records = typeProvidersDecors;
                    break;
                case 'method':
                    records = methodProvidersDecors;
                    break;
            }
            break;
        default:
            return
    }

    if (records && !records[decor]) records[decor] = true;
}

const paramInjectDecors: Record<string, boolean> = { '@Inject': true, '@Autowired': true, '@Param': true, '@Nullable': true };
export const decorParamInject = (ctx: DecorContext, next: HandlerFn, context: Context) => {
    if (paramInjectDecors[ctx.define.decor.toString()]) {
        const def = ctx.class;
        const meta = ctx.define.metadata as ParameterMetadata;
        const propertyKey = ctx.define.propertyKey;
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
            const idx = ctx.define.parameterIndex || 0;
            const desgmeta = params[idx] || {};
            Object.assign(meta, desgmeta);
            params.splice(idx, 1, meta)
        }
    }
    return next(ctx, context)
}


export const decorInitProp = (ctx: DecorContext, next: HandlerFn, context: Context) => {
    if (!(ctx.define.metadata as PropertyMetadata).type) {
        let type = Reflect.getOwnMetadata('design:type', ctx.target, ctx.define.propertyKey);
        if (!type) {
            // Needed to support react native inheritance
            type = Reflect.getOwnMetadata('design:type', ctx.target.constructor, ctx.define.propertyKey);
        }
        (ctx.define.metadata as PropertyMetadata).type = type;
    }
    return next(ctx, context)
}



const propInjectDecors: Record<string, boolean> = { '@Inject': true, '@Autowired': true };
export const decorPropInject = (ctx: DecorContext, next: HandlerFn, context: Context) => {
    if (propInjectDecors[ctx.define.decor.toString()]) {
        ctx.class.setProperyProviders(ctx.define.propertyKey, [ctx.define.metadata])
    }
    return next(ctx, context)
}


export const decorCtorDesignParams = (ctx: DecorContext, next: HandlerFn, context: Context) => {
    if (!ctx.class.hasParameters(ctorName)) {
        const paramTypes: any[] = Reflect.getMetadata('design:paramtypes', ctx.class.type);
        if (paramTypes) {
            const names = ctx.class.getParamNames(ctorName);
            ctx.class.setParameters(ctorName, paramTypes.map((type, index) => {
                return { type, name: names[index] }
            }))
        }
    }
    return next(ctx, context)
}

const typeAnnoDecors: Record<string, boolean> = { '@Injectable': true, '@Singleton': true, '@Abstract': true, '@Static': true };
export const decorAnnoAction = (ctx: DecorContext, next: HandlerFn, context: Context) => {
    if (typeAnnoDecors[ctx.define.decor.toString()]) {
        const def = ctx.class;
        const meta = ctx.define.metadata as AnnotationMetadata;
        if (isBoolean(meta.abstract)) {
            def.getAnnotation().abstract = meta.abstract
        }

        if (isBoolean(meta.singleton)) {
            def.getAnnotation().singleton = meta.singleton
        }
        if (isBoolean(meta.static)) {
            def.getAnnotation().static = meta.static
        }
        if (meta.provide && def.provides.indexOf(meta.provide) < 0) {
            def.provides.push(meta.provide)
        }
        if (meta.expires) {
            def.getAnnotation().expires = meta.expires
        }

        if (ctx.define.providers?.length) {
            def.providers.push(ctx.define.providers)
        }

        if (meta.providedIn) {
            def.getAnnotation().providedIn = meta.providedIn
        }
    }
    return next(ctx, context)
};

const runnableDecors: Record<string, boolean> = { '@Autorun': true, '@IocExt': true };
export const decorRunnable = (ctx: DecorContext, next: HandlerFn, context: Context) => {
    if (runnableDecors[ctx.define.decor.toString()]) {
        const metadata = ctx.define.metadata as RunnableMetadata<any>;
        (metadata as any).decorType = ctx.define.decorType,
            metadata.method = metadata.method ?? ctx.define.propertyKey,
            metadata.order = ctx.define.decorType === Decors.CLASS ? 0 : metadata.order
        ctx.class.runnables.push(ctx.define.metadata);
        ctx.class.runnables.sort((au1, au2) => au1.order! - au2.order!)
    }
    return next(ctx, context)
}

const typeProvidersDecors: Record<string, boolean> = { '@Injectable': true, '@Providers': true };
export const decorProviders = (ctx: DecorContext, next: HandlerFn, context: Context) => {
    if (typeProvidersDecors[ctx.define.decor.toString()]) {
        if ((ctx.define.metadata as ProvidersMetadata).providers?.length) {
            ctx.class.providers.push((ctx.define.metadata as ProvidersMetadata).providers!)
        }
    }
    return next(ctx, context);
}

export const decorMethodDesignParams = (ctx: DecorContext, next: HandlerFn, context: Context) => {
    const reflective = ctx.class;
    const method = ctx.define.propertyKey;
    if (!reflective.hasParameters(method)) {
        const names = reflective.getParamNames(method);
        reflective.setParameters(method,
            (Reflect.getMetadata('design:paramtypes', ctx.target, method) as Type[])?.map((type, idx) => ({ type, name: names[idx] })))
    }
    const meta = ctx.define.metadata as MethodMetadata;
    if (!meta.type) {
        meta.type = Reflect.getMetadata('design:returntype', ctx.target, method)
    }
    if (!reflective.hasReturnning(method) && meta.type) {
        reflective.setReturnning(method, meta.type)
    }
    return next(ctx, context)
}

const methodProvidersDecors: Record<string, boolean> = { '@Providers': true, '@Autowired': true };
export const decorMethodProviders = (ctx: DecorContext, next: HandlerFn, context: Context) => {
    if (methodProvidersDecors[ctx.define.decor.toString()]) {
        const mpdrs = (ctx.define.metadata as MethodMetadata) as InvokeOptions;
        if (mpdrs) {
            ctx.class.setMethodOptions(ctx.define.propertyKey, mpdrs)
        }
    }
    return next(ctx, context)
}

export const decorExtendHandler = (ctx: DecorContext, context: Context) => {
    if (ctx.define.decor.getHandler) {
        ctx.define.decor.getHandler(ctx.define.decorType)?.(ctx, context);
    }
}

export const typeDecorLifeScope: LifeScope<DecorContext> = new LifeScope(null, decorExtendHandler, [
    decorCtorDesignParams,
    decorAnnoAction,
    decorProviders,
    decorRunnable
]);
export const methodDecorLifeScope: LifeScope<DecorContext> = new LifeScope(null, decorExtendHandler, [
    decorMethodDesignParams,
    decorMethodProviders,
    decorRunnable
]);
export const propDecorLifeScope: LifeScope<DecorContext> = new LifeScope(null, decorExtendHandler, [
    decorInitProp,
    decorPropInject
]);
export const paramDecorLifeScope: LifeScope<DecorContext> = new LifeScope(null, decorExtendHandler, [
    decorParamInject
]);


function dispatch(lifescope: LifeScope<DecorContext>, target: any, type: Type, define: DecorDefine, options: DecoratorOption<any>) {
    const ctx = {
        define,
        target,
        class: getClassRef(type)
    } as DecorContext;
    if (options.actionType) {
        if (isArray(options.actionType)) {
            options.actionType.forEach(ty => regActionType(define.decor.toString(), ty, define.decorType))
        } else {
            regActionType(define.decor.toString(), options.actionType, define.decorType)
        }
    }
    options.init && options.init(ctx);
    if (options.factory && define.decorType === Decors.CLASS) {
        ctx.class.setInvocationFactory(options.factory);
    }

    lifescope.handle(ctx, null, () => {
        ctx.class.addDefine(define);
        options.afterInit && options.afterInit(ctx);
        cleanObj(ctx)
    });
}

export function dispatchTypeDecor(type: Type, define: DecorDefine, options: DecoratorOption<any>) {
    dispatch(typeDecorLifeScope, type, type, define, options)
}

export function dispatchPropertyDecor(type: any, define: DecorDefine, options: DecoratorOption<any>) {
    if (!define.metadata.propertyKey) define.metadata.propertyKey = define.propertyKey;
    dispatch(propDecorLifeScope, type, type.constructor, define, options)
}

export function dispatchMethodDecor(type: any, define: DecorDefine, options: DecoratorOption<any>) {
    if (!define.metadata.propertyKey) define.metadata.propertyKey = define.propertyKey;
    dispatch(methodDecorLifeScope, type, type.constructor, define, options)
}

export function dispatchParamDecor(type: any, define: DecorDefine, options: DecoratorOption<any>) {
    const target = type;
    if (!define.propertyKey) {
        define.propertyKey = ctorName
    } else {
        type = type.constructor
    }
    if (!define.metadata.propertyKey) define.metadata.propertyKey = define.propertyKey;
    dispatch(paramDecorLifeScope, target, type, define, options)
}

/**
 * get type def.
 * @param type class type.
 */
export function getDef<T extends TypeDef>(type: Type): T {
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
export function getClassRef<T = any>(type: Type): Class<T> {
    if (!type || type === Object) return null!;
    let tyRef = (type as AnnotationType)[typeRef]?.() as Class<T>;
    if (tyRef?.type !== type) {
        let prRef: Class = tyRef;
        if (!prRef) {
            const parentType = getParentClass(type);
            if (parentType) {
                prRef = getClassRef(parentType)
            }
        }
        tyRef = new Class(type, getDef(type), prRef);
        (type as AnnotationType)[typeRef] = () => tyRef;

    }
    return tyRef;
}

export function getClassRefify<T>(type: Type<T> | Class<T> | T): Class<T> {
    return type instanceof Class ? type : getClassRef(isType(type) ? type : getClass(type))
}