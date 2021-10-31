import { EMPTY, Type, OperationInvoker } from '@tsdi/ioc';
import { DBPropertyMetadata, ModelArgumentResolver, ModelFieldResolver, AbstractModelArgumentResolver } from './resolver';
import { Context } from '../middlewares/context';

class ModelResolver<C extends Context = Context> extends AbstractModelArgumentResolver<C> {
    constructor(private option: {
        isModel(type: Type): boolean;
        createInstance?<T>(model: Type<T>): T;
        getPropertyMeta: (type: Type) => DBPropertyMetadata[];
        fieldResolvers?: ModelFieldResolver[];
    }) {
        super();
    }

    protected override createInstance(model: Type) {
        return this.option.createInstance ? this.option.createInstance(model) : super.createInstance(model);
    }

    get resolvers(): ModelFieldResolver<Context>[] {
        return this.option.fieldResolvers ?? EMPTY;
    }
    protected isModel(type: Type<any>): boolean {
        return this.option.isModel(type);
    }
    protected getPropertyMeta(type: Type<any>): DBPropertyMetadata<any>[] {
        return this.option.getPropertyMeta(type);
    }
}

/**
 * model resolver factory. create resolver for {@link OperationInvoker}
 * @param option 
 * @returns model reolver {@link ModelArgumentResolver}.
 */
export function createModelResolver<C extends Context = Context>(option: {
    isModel(type: Type): boolean;
    createInstance?<T>(model: Type<T>): T;
    getPropertyMeta: (type: Type) => DBPropertyMetadata[];
    fieldResolvers?: ModelFieldResolver<C>[];
}): ModelArgumentResolver<C> {
    return new ModelResolver<C>(option);
}