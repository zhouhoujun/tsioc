import { AnnotationType, AbstractType, typeFac, Annotation } from '../types';
import { cleanObj, getParentType } from '../utils/lang';
import { getType, isBoolean, isFunction, isPrimitive } from '../utils/chk';
import {
    ParameterMetadata, PropertyMetadata, ProvidersMetadata, AnnotationMetadata,
    RunnableMetadata, MethodMetadata
} from './meta';
import {
    ctorName, DecorDefine, Decors,
    ClassRef, TypeDef, ActionType,
    DecorContext, DecoratorOption
} from './class';
import { InvokeOptions } from '../context';
import { Context, HandlerFn } from '../handler';
import { HandlerScope } from '../lifescope/lifescope';



const decorParamInject = (ctx: DecorContext, next: HandlerFn, context: Context) => {
    if (ctx.define.actionType && ctx.define.actionType & ActionType.inject) {
        const typeRef = ctx.classRef;
        const propertyKey = ctx.define.propertyKey;
        let meta = typeRef.getAnnotation().methodMetadatas.get(propertyKey);
        if (!meta) {
            meta = {};
            typeRef.getAnnotation().methodMetadatas.set(propertyKey, meta);
        }
        const dmeta = ctx.define.metadata as ParameterMetadata;
        let params = meta.params;
        if (!params) {
            const names = typeRef.getParamNames(propertyKey);
            let paramTypes: any[];
            if (propertyKey === ctorName) {
                paramTypes = Reflect.getMetadata('design:paramtypes', typeRef.type)
            } else {
                paramTypes = Reflect.getMetadata('design:paramtypes', ctx.target, propertyKey)
            }
            if (paramTypes) {
                params = paramTypes.map((type, index) => ({ type, name: names[index], propertyKey }));
                meta.params = params;
            }
        }
        if (params) {
            const idx = ctx.define.parameterIndex || 0;
            const desgmeta = params[idx] || {};
            Object.assign(dmeta, desgmeta);
            params.splice(idx, 1, dmeta)
        }
    }
    return next(ctx, context)
}


const decorInitProp = (ctx: DecorContext, next: HandlerFn, context: Context) => {
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



const decorPropInject = (ctx: DecorContext, next: HandlerFn, context: Context) => {
    const define = ctx.define as DecorDefine<PropertyMetadata>;
    if (define.actionType && define.actionType & ActionType.inject) {
        const ann = ctx.classRef.getAnnotation();
        let metas = ann.propMetadatas.get(define.propertyKey);
        if(!metas) {
            metas = [define.metadata];
            ann.propMetadatas.set(define.propertyKey, metas);
        } else {
            metas.unshift(define.metadata);
        }
    }
    return next(ctx, context)
}


const decorCtorDesignParams = (ctx: DecorContext, next: HandlerFn, context: Context) => {
    if (!ctx.classRef.hasOwnParameters(ctorName)) {
        const paramTypes: any[] = Reflect.getMetadata('design:paramtypes', ctx.classRef.type);
        if (paramTypes) {
            const names = ctx.classRef.getParamNames(ctorName);

            const params = paramTypes.map((type, index) => {
                return { type, name: names[index] }
            }) as ParameterMetadata[];
            let meta = ctx.classRef.getAnnotation().methodMetadatas.get(ctorName);
            if (!meta) {
                meta = {};
                ctx.classRef.getAnnotation().methodMetadatas.set(ctorName, meta);
            }
            meta.params = params;
        }
    }
    return next(ctx, context)
}


const decorAnnoAction = (ctx: DecorContext, next: HandlerFn, context: Context) => {
    if (ctx.define.actionType && ctx.define.actionType & ActionType.annoation) {
        const def = ctx.classRef;
        const meta = ctx.define.metadata as AnnotationMetadata;
        const ann = def.getAnnotation() as TypeDef;
        if (isBoolean(meta.abstract)) {
            ann.abstract = meta.abstract
        }

        if (isBoolean(meta.singleton)) {
            ann.singleton = meta.singleton
        }
        if (isBoolean(meta.static)) {
            ann.static = meta.static
        }
        if (meta.provide && def.provides.indexOf(meta.provide) < 0) {
            def.provides.push(meta.provide)
        }
        if (meta.expires) {
            ann.expires = meta.expires
        }

        if (meta.providedIn) {
            ann.providedIn = meta.providedIn
        }
    }
    return next(ctx, context)
};


const decorRunnable = (ctx: DecorContext, next: HandlerFn, context: Context) => {
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


const declarationFactory = (ctx: DecorContext, next: HandlerFn, context: Context) => {
    if (ctx.define.actionType && ctx.define.actionType & ActionType.declaration) {
        const factory = (ctx.classRef.type as AnnotationType)[typeFac] ?? ctx.options.factory;
        if (factory) {
            ctx.classRef.setInvocationFactory(factory);
        }
    }
    return next(ctx, context)
}


const decorProviders = (ctx: DecorContext, next: HandlerFn, context: Context) => {
    if (ctx.define.actionType && ctx.define.actionType & ActionType.providers) {
        if ((ctx.define.metadata as ProvidersMetadata).providers?.length) {
            ctx.classRef.providers.push((ctx.define.metadata as ProvidersMetadata).providers!)
        }
    }
    return next(ctx, context);
}

const decorMethodDesignParams = (ctx: DecorContext, next: HandlerFn, context: Context) => {
    const typeRef = ctx.classRef;
    const propertyKey = ctx.define.propertyKey;
    let meta = typeRef.getAnnotation().methodMetadatas.get(propertyKey);
    if (!meta) {
        meta = {};
        typeRef.getAnnotation().methodMetadatas.set(propertyKey, meta);
    }
    if (!meta.params) {
        const names = typeRef.getParamNames(propertyKey);
        const params = (Reflect.getMetadata('design:paramtypes', ctx.target, propertyKey) as AbstractType[])?.map((type, idx) => ({ type, name: names[idx] })) as ParameterMetadata[];
        meta.params = params;

    }
    if (meta.returnType !== undefined) {
        meta.returnType = Reflect.getMetadata('design:returntype', ctx.target, propertyKey) ?? null;
    }
    if (!ctx.define.metadata.type) {
        ctx.define.metadata.type = meta.returnType;
    }

    return next(ctx, context)
}


const decorMethodProviders = (ctx: DecorContext, next: HandlerFn, context: Context) => {
    if (ctx.define.actionType && ctx.define.actionType & ActionType.providers) {
        const mpdrs = (ctx.define.metadata as MethodMetadata) as InvokeOptions;
        if (mpdrs) {
            ctx.classRef.setMethodOptions(ctx.define.propertyKey, mpdrs)
        }
    }
    return next(ctx, context)
}

const decorExtendHandler = (ctx: DecorContext, context: Context) => {
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


function dispatch(lifescope: HandlerScope<DecorContext>, target: any, type: AbstractType, define: DecorDefine, options: DecoratorOption<any>) {

    const classRef = getClassRef(type);
    classRef.storage(define);

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

const TYEP_DEF = Symbol('TYEP_DEF');
/**
 * get type def.
 * @param type class type.
 */
export function getDef<T extends TypeDef>(type: AbstractType): Partial<T> {
    let tagAnn = Reflect.getMetadata(TYEP_DEF, type) as Partial<T>;
    if (tagAnn?.type !== type) {
        tagAnn = (type as AnnotationType).ƿAnn?.() as Partial<T>;
        if (tagAnn?.type !== type) {
            tagAnn = {
                name: type.name,
                type
            } as Partial<T>;
            Reflect.defineMetadata(TYEP_DEF, tagAnn, type);
        }
    }
    return tagAnn as T
}


const CLASS_REF = Symbol('CLASS_REF');
/**
 * get type class reflective {@link ClassRef}.
 * @param type type.
 */
export function getClassRef<T = any>(type: AbstractType<T>): ClassRef<T> {
    if (!type || isPrimitive(type)) return null!;
    let tyRef = Reflect.getMetadata(CLASS_REF, type) as ClassRef;
  
    if (tyRef?.type !== type) {
        let prRef = tyRef as ClassRef;
        if (!prRef) {
            const parentType = getParentType(type);
            if (parentType) {
                prRef = getClassRef(parentType)
            }
        }
        tyRef = new ClassRef(type, getDef(type), prRef);
        Reflect.defineMetadata(CLASS_REF, tyRef, type);

    }
    return tyRef;
}

export function getClassify<T>(type: AbstractType<T> | ClassRef<T> | T): ClassRef<T> {
    return type instanceof ClassRef ? type : getClassRef(isFunction(type) ? type : getType(type))
}
