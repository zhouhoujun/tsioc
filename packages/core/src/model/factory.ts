import { EMPTY, InvocationContext, isArray, isDefined, Type } from '@tsdi/ioc';
import { TrasportParameter } from '../middlewares/resolver';
import {
    DBPropertyMetadata, MissingModelFieldError, ModelArgumentResolver, ModelFieldResolver,
    composeFieldResolver, missingPropError, MODEL_FIELD_RESOLVERS
} from './resolver';
import { Context } from '../middlewares/context';


export function createModelResolver<C extends Context = Context>(option: {
    isModel(type: Type): boolean;
    createInstance?<T>(model: Type<T>): T;
    getPropertyMeta(type: Type): DBPropertyMetadata[];
    fieldResolvers?: ModelFieldResolver[];
}): ModelArgumentResolver {

    const fieldResolver = composeFieldResolver(
        (p, ctx, fields) => p.nullable || (fields && isDefined(fields[p.propertyKey])),
        ...option.fieldResolvers ?? EMPTY,
        ...MODEL_FIELD_RESOLVERS);

    const canResolve = (parameter: TrasportParameter, ctx: InvocationContext<C>): boolean => {
        return option.isModel((parameter.provider ?? parameter.type) as Type);
    };

    const canResolveModel = (model: Type, ctx: InvocationContext<C>, fields: Record<string, any>): boolean => {
        return !option.getPropertyMeta(model).some(p => {
            if (option.isModel(p.provider ?? p.type)) {
                return !canResolveModel(p.provider ?? p.type, ctx, fields[p.propertyKey]);
            }
            return !fieldResolver.canResolve(p, ctx, fields, model);
        })
    }

    const resolveModel = (modelType: Type, ctx: InvocationContext<C>, fields: Record<string, any>) => {
        const model = option.createInstance ? option.createInstance(modelType) : new modelType();
        const props = option.getPropertyMeta(modelType);
        // props.forEach(p => console.log('isModel:', p.provider ?? p.type, option.isModel(p.provider ?? p.type)? 'model' : p.nullable || (fields && isDefined(fields[p.propertyKey]))));
        const missings = props.filter(p => !(option.isModel(p.provider ?? p.type) ?
            canResolveModel(p.provider ?? p.type, ctx, fields[p.propertyKey]) : fieldResolver.canResolve(p, ctx, fields, modelType)));
        if (missings.length) {
            throw new MissingModelFieldError(missings, modelType);
        }

        props.forEach(prop => {
            if (option.isModel(prop.provider ?? prop.type)) {
                model[prop.propertyKey] = resolveModel(prop.provider ?? prop.type, ctx, fields[prop.propertyKey]);
            }
            model[prop.propertyKey!] = fieldResolver.resolve(prop, ctx, fields, modelType);
        });
    }

    const resolve = (parameter: TrasportParameter, ctx: InvocationContext<C>): any => {
        const classType = (parameter.provider ?? parameter.type) as Type;
        const fields = parameter.field ? ctx.arguments.request.body[parameter.field] : ctx.arguments.request.body;
        if (!fields) {
            throw missingPropError(classType);
        }
        if (parameter.mutil && isArray(fields)) {
            return fields.map(arg => resolveModel(classType, ctx, arg));
        }
        return resolveModel(classType, ctx, fields);
    };

    return {
        canResolve,
        resolve
    }
}