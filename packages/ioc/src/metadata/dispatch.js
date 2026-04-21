"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paramDecorLifeScope = exports.propDecorLifeScope = exports.methodDecorLifeScope = exports.typeDecorLifeScope = void 0;
exports.dispatchTypeDecor = dispatchTypeDecor;
exports.dispatchPropertyDecor = dispatchPropertyDecor;
exports.dispatchMethodDecor = dispatchMethodDecor;
exports.dispatchParamDecor = dispatchParamDecor;
const types_1 = require("../types");
const lang_1 = require("../utils/lang");
const chk_1 = require("../utils/chk");
const define_1 = require("./define");
const handler_1 = require("../lifescope/handler");
const class_1 = require("./class");
const decorParamInject = (ctx, next) => {
    if (ctx.define.actionType && ctx.define.actionType & define_1.ActionType.inject) {
        const typeRef = ctx.classRef;
        const propertyKey = ctx.define.propertyKey;
        let meta = typeRef.getAnnotation().methodMetadatas.get(propertyKey);
        if (!meta) {
            meta = {};
            typeRef.getAnnotation().methodMetadatas.set(propertyKey, meta);
        }
        const dmeta = ctx.define.metadata;
        let params = meta.params;
        if (!params) {
            const names = typeRef.getParamNames(propertyKey);
            let paramTypes;
            if (propertyKey === define_1.ctorName) {
                paramTypes = Reflect.getMetadata('design:paramtypes', typeRef.type);
            }
            else {
                paramTypes = Reflect.getMetadata('design:paramtypes', ctx.target, propertyKey);
            }
            if (paramTypes) {
                params = paramTypes.map((type, index) => ({ type, name: names[index], propertyKey, target: typeRef.type }));
                meta.params = params;
            }
        }
        if (params) {
            const idx = ctx.define.parameterIndex || 0;
            const desgmeta = params[idx] || {};
            const savedFlags = dmeta.flags;
            Object.assign(dmeta, desgmeta);
            if (savedFlags !== undefined) {
                if (dmeta.flags !== undefined) {
                    dmeta.flags = savedFlags | dmeta.flags;
                }
                else {
                    dmeta.flags = savedFlags;
                }
            }
            params.splice(idx, 1, dmeta);
        }
    }
    return next(ctx);
};
const decorInitProp = (ctx, next) => {
    if (!ctx.define.metadata.type) {
        let type = Reflect.getOwnMetadata('design:type', ctx.target, ctx.define.propertyKey);
        if (!type) {
            // Needed to support react native inheritance
            type = Reflect.getOwnMetadata('design:type', ctx.target.constructor, ctx.define.propertyKey);
        }
        ctx.define.metadata.type = type;
    }
    return next(ctx);
};
const decorPropInject = (ctx, next) => {
    const define = ctx.define;
    if (define.actionType && define.actionType & define_1.ActionType.inject) {
        const ann = ctx.classRef.getAnnotation();
        let metas = ann.propMetadatas.get(define.propertyKey);
        if (!metas) {
            metas = [define.metadata];
            ann.propMetadatas.set(define.propertyKey, metas);
        }
        else {
            metas.unshift(define.metadata);
        }
    }
    return next(ctx);
};
const decorCtorDesignParams = (ctx, next) => {
    if (!ctx.classRef.hasOwnParameters(define_1.ctorName)) {
        const paramTypes = Reflect.getMetadata('design:paramtypes', ctx.classRef.type);
        if (paramTypes) {
            const names = ctx.classRef.getParamNames(define_1.ctorName);
            const params = paramTypes.map((type, index) => {
                return { type, name: names[index], target: ctx.classRef.type, propertyKey: define_1.ctorName };
            });
            let meta = ctx.classRef.getAnnotation().methodMetadatas.get(define_1.ctorName);
            if (!meta) {
                meta = {};
                ctx.classRef.getAnnotation().methodMetadatas.set(define_1.ctorName, meta);
            }
            meta.params = params;
        }
    }
    return next(ctx);
};
const decorAnnoAction = (ctx, next) => {
    if (ctx.define.actionType && ctx.define.actionType & define_1.ActionType.annoation) {
        const def = ctx.classRef;
        const meta = ctx.define.metadata;
        const ann = def.getAnnotation();
        if ((0, chk_1.isBoolean)(meta.abstract)) {
            ann.abstract = meta.abstract;
        }
        if ((0, chk_1.isBoolean)(meta.singleton)) {
            ann.singleton = meta.singleton;
        }
        if ((0, chk_1.isBoolean)(meta.static)) {
            ann.static = meta.static;
        }
        if (meta.provide && def.provides.indexOf(meta.provide) < 0) {
            def.provides.push(meta.provide);
        }
        if (meta.expires) {
            ann.expires = meta.expires;
        }
        if (meta.providedIn) {
            ann.providedIn = meta.providedIn;
        }
    }
    return next(ctx);
};
const decorRunnable = (ctx, next) => {
    if (ctx.define.actionType && ctx.define.actionType & define_1.ActionType.runnable) {
        const metadata = ctx.define.metadata;
        metadata.decorType = ctx.define.decorType;
        if (!metadata.propertyKey)
            metadata.propertyKey = ctx.define.propertyKey;
        metadata.order = ctx.define.decorType === define_1.Decors.CLASS ? 0 : metadata.order;
        ctx.classRef.runnables.push(ctx.define.metadata);
        ctx.classRef.runnables.sort((au1, au2) => au1.order - au2.order);
    }
    return next(ctx);
};
const declarationFactory = (ctx, next) => {
    if (ctx.define.actionType && ctx.define.actionType & define_1.ActionType.declaration) {
        const factory = ctx.classRef.type[types_1.typeFac] ?? ctx.options.factory;
        if (factory) {
            ctx.classRef.setInvocationFactory(factory);
        }
    }
    return next(ctx);
};
const decorProviders = (ctx, next) => {
    if (ctx.define.actionType && ctx.define.actionType & define_1.ActionType.providers) {
        if (ctx.define.metadata.providers?.length) {
            ctx.classRef.providers.push(ctx.define.metadata.providers);
        }
    }
    return next(ctx);
};
const decorMethodDesignParams = (ctx, next) => {
    const typeRef = ctx.classRef;
    const propertyKey = ctx.define.propertyKey;
    let meta = typeRef.getAnnotation().methodMetadatas.get(propertyKey);
    if (!meta) {
        meta = {};
        typeRef.getAnnotation().methodMetadatas.set(propertyKey, meta);
    }
    if (!meta.params) {
        const names = typeRef.getParamNames(propertyKey);
        const params = Reflect.getMetadata('design:paramtypes', ctx.target, propertyKey)?.map((type, idx) => ({ type, name: names[idx] }));
        meta.params = params;
    }
    if (meta.returnType !== undefined) {
        meta.returnType = Reflect.getMetadata('design:returntype', ctx.target, propertyKey) ?? null;
    }
    if (!ctx.define.metadata.type) {
        ctx.define.metadata.type = meta.returnType;
    }
    return next(ctx);
};
const decorMethodProviders = (ctx, next) => {
    if (ctx.define.actionType && ctx.define.actionType & define_1.ActionType.providers) {
        const mpdrs = ctx.define.metadata;
        if (mpdrs) {
            ctx.classRef.setMethodOptions(ctx.define.propertyKey, mpdrs);
        }
    }
    return next(ctx);
};
const decorExtendHandler = (ctx) => {
    if (ctx.define.decor.getHandler) {
        ctx.define.decor.getHandler(ctx.define.decorType)?.(ctx, null);
    }
};
exports.typeDecorLifeScope = new handler_1.RuntimeHandler(decorExtendHandler, [
    decorCtorDesignParams,
    decorAnnoAction,
    decorProviders,
    declarationFactory,
    decorRunnable
]);
exports.methodDecorLifeScope = new handler_1.RuntimeHandler(decorExtendHandler, [
    decorMethodDesignParams,
    decorMethodProviders,
    decorRunnable
]);
exports.propDecorLifeScope = new handler_1.RuntimeHandler(decorExtendHandler, [
    decorInitProp,
    decorPropInject
]);
exports.paramDecorLifeScope = new handler_1.RuntimeHandler(decorExtendHandler, [
    decorParamInject
]);
function dispatch(lifescope, target, type, define, options) {
    const classRef = (0, class_1.getClassRef)(type);
    classRef.storage(define);
    const input = {
        define,
        target,
        options,
        classRef
    };
    options.init && options.init(input);
    lifescope.handle(input, null, () => {
        options.afterInit && options.afterInit(input);
        (0, lang_1.cleanObj)(input);
    });
}
function dispatchTypeDecor(type, define, options) {
    dispatch(exports.typeDecorLifeScope, type, type, define, options);
}
function dispatchPropertyDecor(type, define, options) {
    if (!define.metadata.propertyKey)
        define.metadata.propertyKey = define.propertyKey;
    dispatch(exports.propDecorLifeScope, type, type.constructor, define, options);
}
function dispatchMethodDecor(type, define, options) {
    if (!define.metadata.propertyKey)
        define.metadata.propertyKey = define.propertyKey;
    dispatch(exports.methodDecorLifeScope, type, type.constructor, define, options);
}
function dispatchParamDecor(type, define, options) {
    const target = type;
    if (!define.propertyKey) {
        define.propertyKey = define_1.ctorName;
    }
    else {
        type = type.constructor;
    }
    if (!define.metadata.propertyKey)
        define.metadata.propertyKey = define.propertyKey;
    dispatch(exports.paramDecorLifeScope, target, type, define, options);
}
//# sourceMappingURL=dispatch.js.map