"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractModelArgumentResolver = exports.MSG = void 0;
exports.createModelResolver = createModelResolver;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const field_resolver_1 = require("./field.resolver");
exports.MSG = new ioc_1.ContextToken(() => null);
/**
 * abstract model argument resolver. base implements {@link ModelArgumentResolver}.
 */
let AbstractModelArgumentResolver = class AbstractModelArgumentResolver {
    canResolve(parameter, ctx) {
        return this.hasModel((0, ioc_1.isFunction)(parameter.provider) ? parameter.provider ?? parameter.type : parameter.type) && this.hasFields(parameter, ctx);
    }
    intercept(parameter, next, ctx) {
        if (!this.canResolve(parameter, ctx))
            return next.handle(parameter, ctx);
        const classType = (parameter.provider ?? parameter.type);
        const fields = this.getFields(parameter, ctx);
        if (!fields) {
            throw (0, field_resolver_1.missingPropException)(classType);
        }
        if (parameter.multi && (0, ioc_1.isArray)(fields)) {
            return fields.map(arg => this.resolveModel(classType, ctx, arg));
        }
        return this.resolveModel(classType, ctx, fields);
    }
    resolveModel(modelType, ctx, fields, nullable) {
        if (nullable && (!fields || Object.keys(fields).length < 1)) {
            return null;
        }
        if (!fields) {
            throw (0, field_resolver_1.missingPropException)(modelType);
        }
        const props = this.getPropertyMeta(modelType);
        const missings = [];
        const model = this.createInstance(modelType);
        props.forEach(prop => {
            let val;
            if (this.hasModel(prop.provider ?? prop.type)) {
                val = this.resolveModel(prop.provider ?? prop.type, ctx, fields[prop.propertyKey], prop.nullable);
            }
            else {
                val = this.fieldResolver.handle([prop, fields, modelType], ctx, {
                    next: (res) => {
                        if ((0, ioc_1.isResolved)(res)) {
                            return res;
                        }
                        else {
                            missings.push(prop);
                        }
                    },
                    error: (err) => {
                        throw err;
                    }
                });
            }
            if ((0, ioc_1.isDefined)(val)) {
                model[prop.propertyKey] = val;
            }
        });
        if (missings.length) {
            throw new field_resolver_1.MissingModelFieldException(missings, modelType);
        }
        return model;
    }
    createInstance(model) {
        return new model();
    }
    get fieldResolver() {
        if (!this._resolver) {
            this._resolver = (0, ioc_1.createResolveHandler)([
                (input, next, context) => {
                    const [prop, fields, target] = input;
                    if (prop.nullable === true
                        || (fields && (0, ioc_1.isDefined)(fields[prop.propertyKey] ?? prop.default))
                        || context.get(exports.MSG)?.method?.toUpperCase() !== 'PUT' && prop.primary === true) {
                        return next(input, context);
                    }
                },
                ...this.fieldResolves ?? [],
            ], (0, field_resolver_1.getModelFieldResolver)(this.runtime));
        }
        return this._resolver;
    }
};
exports.AbstractModelArgumentResolver = AbstractModelArgumentResolver;
exports.AbstractModelArgumentResolver = AbstractModelArgumentResolver = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], AbstractModelArgumentResolver);
/**
 * model resolver.
 */
class ModelResolver extends AbstractModelArgumentResolver {
    constructor(runtime, option) {
        super();
        this.runtime = runtime;
        this.option = option;
    }
    createInstance(model) {
        return this.option.createInstance ? this.option.createInstance(model) : super.createInstance(model);
    }
    get fieldResolves() {
        return this.option.fieldResolvers ?? null;
    }
    hasModel(type) {
        return this.option.isModel(type);
    }
    getPropertyMeta(type) {
        return this.option.getPropertyMeta(type);
    }
    hasFields(parameter, ctx) {
        return this.option.hasField ? this.option.hasField(parameter, ctx) : !!this.getFields(parameter, ctx);
    }
    getFields(parameter, ctx) {
        return this.option.getFields(parameter, ctx);
    }
}
/**
 * model resolver factory. create resolver for {@link Invocation}.
 * @param runtime runtime.
 * @returns model resolver instance of {@link ModelArgumentResolver}.
 */
function createModelResolver(runtime, option) {
    return new ModelResolver(runtime, option);
}
//# sourceMappingURL=model.resolver.js.map