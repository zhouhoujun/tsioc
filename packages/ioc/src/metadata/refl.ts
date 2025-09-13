import { AnnotationType, AbstractType, typeFac } from '../types';
import { cleanObj, getParentType } from '../utils/lang';
import { getType, isArray, isBoolean, isFunction, isPrimitive } from '../utils/chk';
import {
    ParameterMetadata, PropertyMetadata, ProvidersMetadata, AnnotationMetadata,
    RunnableMetadata, MethodMetadata
} from './meta';
import {
    ctorName, DecoratorType, DecorDefine, Decors,
    ClassRef, TypeDef, DecoratorFn, ActionType
} from './class';
import { InvokeOptions } from '../context';
import { Context, HandlerFn } from '../handler';
import { HandlerScope } from '../lifescope/lifescope';
import { DesignContext, RuntimeContext } from '../lifescope/ctx';
import { Resolve } from '../injector';
import { InvocationFactory } from '../invocation';







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
    actionType?: ActionType;
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
export interface MetadataFactory<T = any> {
    /**
     * is metadata or not.
     */
    isMatadata?(arg: any): boolean;
    /**
     * parse args as metadata props.
     * @param args
     */
    props?(...args: any[]): Partial<T>;
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
}

/**
 * decorator option.
 */
export interface DecoratorOption<T> extends MetadataFactory<T>, DecorRegisterOption<T> { }

// 添加元数据工具函数
export const MetadataKeys = {
    CLASS_METADATA: 'ioc:class:metadata',
    PROPERTY_PROVIDERS: 'ioc:property:providers',
    PROPERTY_METADATA: 'ioc:property:metadata',
    METHOD_METADATA: 'ioc:method:metadata',
    METHOD_PARAMS_METADATA: 'ioc:method:params:metadata',
    METHOD_PARAMS: 'ioc:method:params',
    METHOD_RETURNS: 'ioc:method:returns'
};


/**
 * decorator context.
 */
export interface DecorContext<T = any> {
    readonly define: DecorDefine<T>,
    readonly target: any;
    readonly classRef: ClassRef;
    readonly options: DecoratorOption<any>
}


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
export function toDefine<T>(decor: DecoratorFn, metadata: T, decorType: DecoratorType, options: DecoratorOption<any>, propertyKey?: string, parameterIndex?: number): DecorDefine<T> {

    return {
        decor,
        propertyKey: propertyKey!,
        parameterIndex,
        decorType,
        metadata,
        actionType: options.actionType
    }
}


// const paramInjectDecors: Record<string, boolean> = { '@Inject': true, '@Autowired': true, '@Param': true, '@Nullable': true };
export const decorParamInject = (ctx: DecorContext, next: HandlerFn, context: Context) => {
    if (ctx.define.actionType && ctx.define.actionType & ActionType.inject) {
        const def = ctx.classRef;
        const meta = ctx.define.metadata as ParameterMetadata;
        const propertyKey = ctx.define.propertyKey;
        let params = def.hasOwnParameters(propertyKey) ? def.getParameters(propertyKey) : null;
        if (!params) {
            const names = def.getParamNames(propertyKey);
            let paramTypes: any[];
            if (propertyKey === ctorName) {
                paramTypes = Reflect.getMetadata('design:paramtypes', def.type)
            } else {
                paramTypes = Reflect.getMetadata('design:paramtypes', ctx.target, propertyKey)
            }
            if (paramTypes) {
                params = paramTypes.map((type, index) => ({ type, name: names[index], propertyKey }));
                Reflect.defineMetadata(MetadataKeys.METHOD_PARAMS, params, def.type, propertyKey);
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



// const propInjectDecors: Record<string, boolean> = { '@Inject': true, '@Autowired': true };
export const decorPropInject = (ctx: DecorContext, next: HandlerFn, context: Context) => {
    const define = ctx.define as DecorDefine<PropertyMetadata>;
    if (define.actionType && define.actionType & ActionType.inject) {
        saveMetadata(MetadataKeys.PROPERTY_PROVIDERS, ctx.classRef.type, define, !!define.metadata.provider);
    }
    return next(ctx, context)
}


export const decorCtorDesignParams = (ctx: DecorContext, next: HandlerFn, context: Context) => {
    if (!ctx.classRef.hasOwnParameters(ctorName)) {
        const paramTypes: any[] = Reflect.getMetadata('design:paramtypes', ctx.classRef.type);
        if (paramTypes) {
            const names = ctx.classRef.getParamNames(ctorName);

            Reflect.defineMetadata(MetadataKeys.METHOD_PARAMS, paramTypes.map((type, index) => {
                return { type, name: names[index] }
            }), ctx.classRef.type, ctorName);
        }
    }
    return next(ctx, context)
}

// const typeAnnoDecors: Record<string, boolean> = { '@Injectable': true, '@Singleton': true, '@Abstract': true, '@Static': true };
export const decorAnnoAction = (ctx: DecorContext, next: HandlerFn, context: Context) => {
    if (ctx.define.actionType && ctx.define.actionType & ActionType.annoation) {
        const def = ctx.classRef;
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

        if (meta.providedIn) {
            def.getAnnotation().providedIn = meta.providedIn
        }
    }
    return next(ctx, context)
};

// const runnableDecors: Record<string, boolean> = { '@Autorun': true, '@IocExt': true };
export const decorRunnable = (ctx: DecorContext, next: HandlerFn, context: Context) => {
    if (ctx.define.actionType && ctx.define.actionType & ActionType.runnable) {
        const metadata = ctx.define.metadata as RunnableMetadata;
        (metadata as any).decorType = ctx.define.decorType;
        if (!metadata.propertyKey) metadata.propertyKey = ctx.define.propertyKey;
        metadata.order = ctx.define.decorType === Decors.CLASS ? 0 : metadata.order;
        ctx.classRef.runnables.push(ctx.define.metadata);
        ctx.classRef.runnables.sort((au1, au2) => au1.order! - au2.order!)
    }
    return next(ctx, context)
}

// const declarations: Record<string, boolean> = {};
export const declarationFactory = (ctx: DecorContext, next: HandlerFn, context: Context) => {
    if (ctx.define.actionType && ctx.define.actionType & ActionType.declaration) {
        const factory = (ctx.classRef.type as AnnotationType)[typeFac] ?? ctx.options.factory;
        if (factory) {
            ctx.classRef.setInvocationFactory(factory);
        }
    }
    return next(ctx, context)
}

// const typeProvidersDecors: Record<string, boolean> = { '@Injectable': true, '@Providers': true };
export const decorProviders = (ctx: DecorContext, next: HandlerFn, context: Context) => {
    if (ctx.define.actionType && ctx.define.actionType & ActionType.providers) {
        if ((ctx.define.metadata as ProvidersMetadata).providers?.length) {
            ctx.classRef.providers.push((ctx.define.metadata as ProvidersMetadata).providers!)
        }
    }
    return next(ctx, context);
}

export const decorMethodDesignParams = (ctx: DecorContext, next: HandlerFn, context: Context) => {
    const reflective = ctx.classRef;
    const propertyKey = ctx.define.propertyKey;
    if (!reflective.hasOwnParameters(propertyKey)) {
        const names = reflective.getParamNames(propertyKey);
        Reflect.defineMetadata(MetadataKeys.METHOD_PARAMS,
            (Reflect.getMetadata('design:paramtypes', ctx.target, propertyKey) as AbstractType[])?.map((type, idx) => ({ type, name: names[idx] })),
            reflective.type,
            propertyKey
        )
    }
    const meta = ctx.define.metadata as MethodMetadata;
    if (!meta.type) {
        meta.type = Reflect.getMetadata('design:returntype', ctx.target, propertyKey);
    }
    if (meta.type && !Reflect.hasMetadata(MetadataKeys.METHOD_RETURNS, ctx.classRef.type, propertyKey)) {
        Reflect.defineMetadata(MetadataKeys.METHOD_RETURNS, meta.type, ctx.classRef.type, propertyKey);
    }
    return next(ctx, context)
}

// const methodProvidersDecors: Record<string, boolean> = { '@Providers': true, '@Autowired': true };
export const decorMethodProviders = (ctx: DecorContext, next: HandlerFn, context: Context) => {
    if (ctx.define.actionType && ctx.define.actionType & ActionType.providers) {
        const mpdrs = (ctx.define.metadata as MethodMetadata) as InvokeOptions;
        if (mpdrs) {
            ctx.classRef.setMethodOptions(ctx.define.propertyKey, mpdrs)
        }
    }
    return next(ctx, context)
}

export const decorExtendHandler = (ctx: DecorContext, context: Context | undefined) => {
    if (ctx.define.decor.getHandler) {
        ctx.define.decor.getHandler(ctx.define.decorType)?.(ctx, context);
    }
}

export const typeDecorLifeScope: HandlerScope<DecorContext, Context> = new HandlerScope(null, decorExtendHandler, [
    decorCtorDesignParams,
    decorAnnoAction,
    decorProviders,
    declarationFactory,
    decorRunnable
]);
export const methodDecorLifeScope: HandlerScope<DecorContext, Context> = new HandlerScope(null, decorExtendHandler, [
    decorMethodDesignParams,
    decorMethodProviders,
    decorRunnable
]);
export const propDecorLifeScope: HandlerScope<DecorContext, Context> = new HandlerScope(null, decorExtendHandler, [
    decorInitProp,
    decorPropInject
]);
export const paramDecorLifeScope: HandlerScope<DecorContext, Context> = new HandlerScope(null, decorExtendHandler, [
    decorParamInject
]);

function storageDefine(define: DecorDefine, classRef: ClassRef) {
    switch (define.decorType) {
        case 'class':
            if (!classRef.classDecors.includes(define.decor)) {
                classRef.classDecors.push(define.decor);
            }
            saveMetadata(MetadataKeys.CLASS_METADATA, classRef.type, define, true);
            saveMetadata(define.decor, classRef.type, define, true);
            break;

        case 'property':
            if (!classRef.propDecors.includes(define.decor)) {
                classRef.propDecors.push(define.decor);
            }
            saveMetadata(MetadataKeys.PROPERTY_METADATA, classRef.type, define);
            saveMetadata(define.decor, classRef.type, define);
            break;

        case 'method':
            if (!classRef.methodDecors.includes(define.decor)) {
                classRef.methodDecors.push(define.decor);
            }
            saveMetadata(MetadataKeys.METHOD_METADATA, classRef.type, define);
            saveMetadata(define.decor, classRef.type, define);
            break;

        case 'parameter':
            if (!classRef.paramDecors.includes(define.decor)) {
                classRef.paramDecors.push(define.decor);
            }
            saveMetadata(MetadataKeys.METHOD_PARAMS_METADATA, classRef.type, define, true, define.propertyKey);
            saveMetadata(define.decor, classRef.type, define, true);
            break;
    }

}

function saveMetadata(metaKey: any, type: AbstractType, define: DecorDefine, unshift?: boolean, propertyKey?: string | symbol) {
    const defines = propertyKey ? Reflect.getMetadata(metaKey, type, propertyKey) : Reflect.getMetadata(metaKey, type);
    if (defines) {
        unshift ? defines.unshift(define) : defines.push(define);
    } else {
        propertyKey ? Reflect.defineMetadata(metaKey, [define], type, propertyKey) : Reflect.defineMetadata(metaKey, [define], type);
    }
}

function dispatch(lifescope: HandlerScope<DecorContext>, target: any, type: AbstractType, define: DecorDefine, options: DecoratorOption<any>) {

    const classRef = getClassRef(type);
    // classRef.storage(define);
    storageDefine(define, classRef);

    const ctx = {
        define,
        target,
        options,
        classRef
    } as DecorContext;
    options.init && options.init(ctx);

    lifescope.handle(ctx, null, () => {
        options.afterInit && options.afterInit(ctx);
        cleanObj(ctx)
    });
}

export function dispatchTypeDecor(type: AbstractType, define: DecorDefine, options: DecoratorOption<any>) {
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
export function getDef<T extends TypeDef>(type: AbstractType): T {
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

const CLASS = Symbol('Class');
interface ClassType<T> extends AbstractType<T> {
    [CLASS]?: ClassRef<T>;
}
/**
 * get type class reflective {@link ClassRef}.
 * @param type type.
 */
export function getClassRef<T = any>(type: AbstractType<T>): ClassRef<T> {
    if (!type || isPrimitive(type)) return null!;
    let tyRef = (type as ClassType<T>)[CLASS];
    if (tyRef?.type !== type) {
        let prRef = tyRef as ClassRef;
        if (!prRef) {
            const parentType = getParentType(type);
            if (parentType) {
                prRef = getClassRef(parentType)
            }
        }
        tyRef = new ClassRef(type, getDef(type), prRef);
        (type as ClassType<T>)[CLASS] = tyRef;

    }
    return tyRef;
}

export function getClassify<T>(type: AbstractType<T> | ClassRef<T> | T): ClassRef<T> {
    return type instanceof ClassRef ? type : getClassRef(isFunction(type) ? type : getType(type))
}