import { Injector, isArray, isDefined, isFunction, Type } from '@tsdi/ioc';
import { composeFieldResolver } from './resolver';
import { TrasportParameter } from '../middlewares/resolver';
import { DBPropertyMetadata, MissingModelFieldError, ModelArgumentResolver, ModelFieldResolver } from './resolver';


export function createModelResolver(injector: Injector, option: {
    isModel(type: Type): boolean;
    createInstance?<T>(model: Type<T>): T;
    getPropertyMeta(type: Type): DBPropertyMetadata[];
    fieldResolvers: ModelFieldResolver[] | ((injector: Injector) => ModelFieldResolver[]);
}): ModelArgumentResolver {

    const fieldResolver = composeFieldResolver((p, args) => p.nullable || isDefined(args[p.propertyKey]), ...isFunction(option.fieldResolvers) ? option.fieldResolvers(injector) : option.fieldResolvers);

    const canResolve = (parameter: TrasportParameter, args: Record<string, any>): boolean => {
        const modelType = (parameter.provider ?? parameter.type) as Type;
        return option.isModel(modelType) && !option.getPropertyMeta(modelType).some(p => {
            if (option.isModel(p.provider ?? p.type)) {
                return !canResolve({ type: p.type, provider: p.provider, mutil: p.mutil, paramName: p.propertyKey }, args[p.propertyKey]);
            }
            return !fieldResolver.canResolve(p, args, modelType);
        });
    };
    const resolve = (parameter: TrasportParameter, args: Record<string, any>): any => {
        const classType = (parameter.provider ?? parameter.type) as Type;
        if (parameter.mutil && isArray(args)) {
            return args.map(arg => resolve({ provider: classType, type: classType, paramName: parameter.paramName }, arg));
        }
        const model = option.createInstance ? option.createInstance(classType) : new classType();
        const fields = option.getPropertyMeta(classType);
        const missings = fields.filter(p => !fieldResolver.canResolve(p, args, classType));
        if (missings.length) {
            throw new MissingModelFieldError(missings, classType);
        }
        fields.forEach(prop => {
            if (option.isModel(prop.provider ?? prop.type)) {
                model[prop.propertyKey] = resolve({ type: prop.type, provider: prop.provider, mutil: prop.mutil, paramName: prop.propertyKey }, args[prop.propertyKey]);
            }
            model[prop.propertyKey!] = fieldResolver.resolve(prop, args, classType);
        });
        return model;
    };

    return {
        canResolve,
        resolve
    }
}