import { AnnotationType, AbstractType, typeFac } from '../types';
import { cleanObj } from '../utils/lang';
import { isBoolean } from '../utils/chk';
import {
    ParameterMetadata, PropertyMetadata, ProvidersMetadata, AnnotationMetadata,
    RunnableMetadata, MethodMetadata
} from './meta';
import {  ctorName, DecorDefine, Decors,  ActionType,  DecorContext, DecoratorOption } from './define';
import { InvokeOptions } from '../context';
import { HandleResult } from '../handlers/handler';
import { RuntimeHandler } from '../lifescope/handler';
import { TypeDef } from './type.def';
import { getClassRef } from './class';

export type DecorHandlerFn = (input: DecorContext, context?: any) => HandleResult<any>;

const decorParamInject = (ctx: DecorContext, next: DecorHandlerFn) => {
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
                params = paramTypes.map((type, index) => ({ type, name: names[index], propertyKey, target: typeRef.type }));
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
    return next(ctx)
}


const decorInitProp = (ctx: DecorContext, next: DecorHandlerFn) => {
    if (!(ctx.define.metadata as PropertyMetadata).type) {
        let type = Reflect.getOwnMetadata('design:type', ctx.target, ctx.define.propertyKey);
        if (!type) {
            // Needed to support react native inheritance
            type = Reflect.getOwnMetadata('design:type', ctx.target.constructor, ctx.define.propertyKey);
        }
        (ctx.define.metadata as PropertyMetadata).type = type;
    }
    return next(ctx)
}



const decorPropInject = (ctx: DecorContext, next: DecorHandlerFn) => {
    const define = ctx.define as DecorDefine<PropertyMetadata>;
    if (define.actionType && define.actionType & ActionType.inject) {
        const ann = ctx.classRef.getAnnotation();
        let metas = ann.propMetadatas.get(define.propertyKey);
        if (!metas) {
            metas = [define.metadata];
            ann.propMetadatas.set(define.propertyKey, metas);
        } else {
            metas.unshift(define.metadata);
        }
    }
    return next(ctx)
}


const decorCtorDesignParams = (ctx: DecorContext, next: DecorHandlerFn) => {
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
    return next(ctx)
}


const decorAnnoAction = (ctx: DecorContext, next: DecorHandlerFn) => {
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
    return next(ctx)
};


const decorRunnable = (ctx: DecorContext, next: DecorHandlerFn) => {
    if (ctx.define.actionType && ctx.define.actionType & ActionType.runnable) {
        const metadata = ctx.define.metadata as RunnableMetadata;
        (metadata as any).decorType = ctx.define.decorType;
        if (!metadata.propertyKey) metadata.propertyKey = ctx.define.propertyKey;
        metadata.order = ctx.define.decorType === Decors.CLASS ? 0 : metadata.order;
        ctx.classRef.runnables.push(ctx.define.metadata);
        ctx.classRef.runnables.sort((au1, au2) => au1.order! - au2.order!)
    }
    return next(ctx)
}


const declarationFactory = (ctx: DecorContext, next: DecorHandlerFn) => {
    if (ctx.define.actionType && ctx.define.actionType & ActionType.declaration) {
        const factory = (ctx.classRef.type as AnnotationType)[typeFac] ?? ctx.options.factory;
        if (factory) {
            ctx.classRef.setInvocationFactory(factory);
        }
    }
    return next(ctx)
}


const decorProviders = (ctx: DecorContext, next: DecorHandlerFn) => {
    if (ctx.define.actionType && ctx.define.actionType & ActionType.providers) {
        if ((ctx.define.metadata as ProvidersMetadata).providers?.length) {
            ctx.classRef.providers.push((ctx.define.metadata as ProvidersMetadata).providers!)
        }
    }
    return next(ctx);
}

const decorMethodDesignParams = (ctx: DecorContext, next: DecorHandlerFn) => {
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

    return next(ctx)
}


const decorMethodProviders = (ctx: DecorContext, next: DecorHandlerFn) => {
    if (ctx.define.actionType && ctx.define.actionType & ActionType.providers) {
        const mpdrs = (ctx.define.metadata as MethodMetadata) as InvokeOptions;
        if (mpdrs) {
            ctx.classRef.setMethodOptions(ctx.define.propertyKey, mpdrs)
        }
    }
    return next(ctx)
}

const decorExtendHandler = (ctx: DecorContext) => {
    if (ctx.define.decor.getHandler) {
        ctx.define.decor.getHandler(ctx.define.decorType)?.(ctx, null);
    }
}

export const typeDecorLifeScope: RuntimeHandler<DecorContext> = new RuntimeHandler(decorExtendHandler, [
    decorCtorDesignParams,
    decorAnnoAction,
    decorProviders,
    declarationFactory,
    decorRunnable
]);
export const methodDecorLifeScope: RuntimeHandler<DecorContext> = new RuntimeHandler(decorExtendHandler, [
    decorMethodDesignParams,
    decorMethodProviders,
    decorRunnable
]);
export const propDecorLifeScope: RuntimeHandler<DecorContext> = new RuntimeHandler(decorExtendHandler, [
    decorInitProp,
    decorPropInject
]);
export const paramDecorLifeScope: RuntimeHandler<DecorContext> = new RuntimeHandler(decorExtendHandler, [
    decorParamInject
]);


function dispatch(lifescope: RuntimeHandler<DecorContext>, target: any, type: AbstractType, define: DecorDefine, options: DecoratorOption<any>) {

    const classRef = getClassRef(type);
    classRef.storage(define);

    const input = {
        define,
        target,
        options,
        classRef
    } as DecorContext;
    options.init && options.init(input);
    lifescope.handle(input, null, () => {
        options.afterInit && options.afterInit(input);
        cleanObj(input)
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


